/**
 * Internal messaging: list conversations, get/send messages, mark read.
 * All routes are tenant-scoped (company_id). req.tenantId must be set.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/db.js';
import { broadcastNewMessage } from '../chatSocket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.resolve(__dirname, '../uploads/chats');

const MESSAGES_PAGE_SIZE = 50;

/** Effective company for scoping: tenantId (from header/query) or user's company */
function effectiveCompanyId(req) {
  const tid = req.tenantId;
  if (tid != null && !Number.isNaN(Number(tid))) return tid;
  return req.user?.companyId ?? null;
}

/** GET /api/chats/company-users - list users in same company (for starting a chat) */
export async function listCompanyUsers(req, res) {
  try {
    const companyId = effectiveCompanyId(req);
    if (companyId == null) {
      return res.status(400).json({ success: false, message: 'Company context required' });
    }

    const [rows] = await db.execute(
      `SELECT u.id, u.name, u.email, r.name AS role_name
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.company_id = ? AND u.status = 'active' AND u.id != ?
       ORDER BY u.name ASC`,
      [companyId, req.user.id],
    );

    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role_name,
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error('listCompanyUsers', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/** GET /api/chats/platform-users - list all employees (all companies) for cross-company DMs. Super Admin only. */
export async function listPlatformUsers(req, res) {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const [rows] = await db.execute(
      `SELECT u.id, u.name, u.email, r.name AS role_name, c.name AS company_name, u.company_id
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.status = 'active' AND u.id != ?
       ORDER BY c.name ASC, u.name ASC`,
      [req.user.id],
    );

    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role_name,
      companyName: r.company_name || 'Platform',
      companyId: r.company_id,
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error('listPlatformUsers', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/** GET /api/chats - list conversations for current user (company + platform DMs) */
export async function listConversations(req, res) {
  try {
    const companyId = effectiveCompanyId(req);
    const isSuperAdminNoCompany = req.isSuperAdmin && companyId == null;

    const searchQuery = req.query.q ? String(req.query.q).trim() : '';

    let searchSql = '';
    const searchParams = [];
    if (searchQuery) {
      searchSql = `
        AND (
          c.name LIKE ?
          OR EXISTS (
            SELECT 1 FROM conversation_participants search_cp 
            INNER JOIN users search_u ON search_cp.user_id = search_u.id 
            WHERE search_cp.conversation_id = c.id AND search_u.name LIKE ?
          )
          OR EXISTS (
            SELECT 1 FROM messages search_m 
            WHERE search_m.conversation_id = c.id AND search_m.body LIKE ?
          )
        )
      `;
      const likeStr = `%${searchQuery}%`;
      searchParams.push(likeStr, likeStr, likeStr);
    }

    let convs;
    if (isSuperAdminNoCompany) {
      [convs] = await db.execute(
        `SELECT c.id, c.type, c.name AS conversation_name, c.company_id, c.updated_at, cp.last_read_at
         FROM conversations c
         INNER JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = ?
         WHERE c.company_id IS NULL ${searchSql}
         ORDER BY c.updated_at DESC`,
        [req.user.id, ...searchParams],
      );
    } else if (companyId != null) {
      [convs] = await db.execute(
        `SELECT c.id, c.type, c.name AS conversation_name, c.company_id, c.updated_at, cp.last_read_at
         FROM conversations c
         INNER JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = ?
         WHERE (c.company_id = ? OR c.company_id IS NULL) ${searchSql}
         ORDER BY c.updated_at DESC`,
        [req.user.id, companyId, ...searchParams],
      );
    } else {
      return res.status(400).json({ success: false, message: 'Company context required' });
    }

    const conversationIds = convs.map((c) => c.id);
    if (conversationIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const placeholders = conversationIds.map(() => '?').join(',');
    const [lastMessages] = await db.execute(
      `SELECT m.conversation_id, m.id AS message_id, m.sender_id, m.body, m.created_at,
              u.name AS sender_name
       FROM messages m
       INNER JOIN users u ON u.id = m.sender_id
       WHERE m.id IN (
         SELECT MAX(id) FROM messages WHERE conversation_id IN (${placeholders}) GROUP BY conversation_id
       )`,
      conversationIds,
    );

    const [participantsRows] = await db.execute(
      `SELECT cp.conversation_id, cp.user_id, u.name, r.name AS role_name
       FROM conversation_participants cp
       INNER JOIN users u ON u.id = cp.user_id
       INNER JOIN roles r ON r.id = u.role_id
       WHERE cp.conversation_id IN (${placeholders})`,
      conversationIds,
    );

    const unreadParams = [req.user.id, ...conversationIds, req.user.id];
    const [unreadCounts] = await db.execute(
      `SELECT m.conversation_id, COUNT(*) AS unread
       FROM messages m
       INNER JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = ?
       WHERE m.conversation_id IN (${placeholders})
         AND m.sender_id != ?
         AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
       GROUP BY m.conversation_id`,
      unreadParams,
    );

    const lastByConv = {};
    for (const row of lastMessages) {
      lastByConv[row.conversation_id] = {
        id: row.message_id,
        senderId: row.sender_id,
        senderName: row.sender_name,
        body: row.body,
        createdAt: row.created_at,
      };
    }

    if (searchQuery) {
      const [matched] = await db.execute(
        `SELECT m.conversation_id, m.id AS message_id, m.sender_id, m.body, m.created_at,
                u.name AS sender_name
         FROM messages m
         INNER JOIN users u ON u.id = m.sender_id
         WHERE m.id IN (
           SELECT MAX(id) FROM messages WHERE conversation_id IN (${placeholders}) AND body LIKE ? GROUP BY conversation_id
         )`,
        [...conversationIds, `%${searchQuery}%`]
      );
      for (const row of matched) {
        lastByConv[row.conversation_id] = {
          id: row.message_id,
          senderId: row.sender_id,
          senderName: row.sender_name,
          body: row.body,
          createdAt: row.created_at,
          isSearchMatch: true,
        };
      }
    }

    const participantsByConv = {};
    for (const row of participantsRows) {
      if (!participantsByConv[row.conversation_id]) participantsByConv[row.conversation_id] = [];
      participantsByConv[row.conversation_id].push({
        userId: row.user_id,
        name: row.name,
        role: row.role_name,
      });
    }

    const unreadByConv = {};
    for (const row of unreadCounts) {
      unreadByConv[row.conversation_id] = Number(row.unread) || 0;
    }

    const data = convs.map((c) => {
      const participants = participantsByConv[c.id] || [];
      const others = participants.filter((p) => p.userId !== req.user.id);
      const displayName =
        c.type === 'group' && c.conversation_name
          ? c.conversation_name
          : others.map((o) => o.name).join(', ') || 'Chat';
      const lastMessage = lastByConv[c.id];
      return {
        id: c.id,
        type: c.type,
        name: displayName,
        participants: others,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              senderName: lastMessage.senderName,
              body: lastMessage.body,
              createdAt: lastMessage.createdAt,
              isSearchMatch: lastMessage.isSearchMatch
            }
          : null,
        unreadCount: unreadByConv[c.id] || 0,
        updatedAt: c.updated_at,
      };
    });

    return res.json({ success: true, data });
  } catch (err) {
    console.error('listConversations', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/** POST /api/chats - create DM or group conversation */
export async function createConversation(req, res) {
  try {
    const companyId = effectiveCompanyId(req);
    const isSuperAdmin = req.isSuperAdmin === true;
    const { type = 'dm', otherUserId, name, userIds, platform: wantPlatform } = req.body || {};

    if (type === 'dm') {
      const otherId = otherUserId != null ? parseInt(otherUserId, 10) : null;
      if (!otherId) {
        return res.status(422).json({ success: false, message: 'otherUserId required for DM' });
      }

      const usePlatformDm = wantPlatform === true && isSuperAdmin;

      if (usePlatformDm) {
        const [existing] = await db.execute(
          `SELECT c.id FROM conversations c
           INNER JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = ?
           INNER JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = ?
           WHERE c.company_id IS NULL AND c.type = 'dm'`,
          [req.user.id, otherId],
        );
        if (existing.length > 0) {
          return res.json({ success: true, data: { id: existing[0].id, existing: true } });
        }
        const [ins] = await db.execute(
          `INSERT INTO conversations (company_id, type) VALUES (NULL, 'dm')`,
        );
        const convId = ins.insertId;
        await db.execute(
          `INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)`,
          [convId, req.user.id, convId, otherId],
        );
        return res.status(201).json({ success: true, data: { id: convId } });
      }

      if (companyId == null) {
        return res.status(400).json({ success: false, message: 'Company context required for same-company DM' });
      }

      const [existing] = await db.execute(
        `SELECT c.id FROM conversations c
         INNER JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = ?
         INNER JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = ?
         WHERE (c.company_id = ? OR c.company_id IS NULL) AND c.type = 'dm'`,
        [req.user.id, otherId, companyId],
      );
      if (existing.length > 0) {
        return res.json({ success: true, data: { id: existing[0].id, existing: true } });
      }

      const [ins] = await db.execute(
        `INSERT INTO conversations (company_id, type) VALUES (?, 'dm')`,
        [companyId],
      );
      const convId = ins.insertId;
      await db.execute(
        `INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)`,
        [convId, req.user.id, convId, otherId],
      );
      return res.status(201).json({ success: true, data: { id: convId } });
    }

    if (type === 'group') {
      if (companyId == null) {
        return res.status(400).json({ success: false, message: 'Company context required' });
      }
      const ids = Array.isArray(userIds) ? userIds.map((id) => parseInt(id, 10)).filter(Boolean) : [];
      const title = name && String(name).trim() ? String(name).trim().slice(0, 255) : 'Group Chat';
      const allIds = [req.user.id, ...ids];
      const unique = [...new Set(allIds)];

      const [ins] = await db.execute(
        `INSERT INTO conversations (company_id, type, name) VALUES (?, 'group', ?)`,
        [companyId, title],
      );
      const convId = ins.insertId;
      const values = unique.map((uid) => `(${convId}, ${uid})`).join(', ');
      await db.execute(
        `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ${values}`,
      );
      return res.status(201).json({ success: true, data: { id: convId } });
    }

    return res.status(422).json({ success: false, message: 'Invalid type' });
  } catch (err) {
    console.error('createConversation', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/** GET /api/chats/:id - get one conversation with participants (company or platform) */
export async function getConversation(req, res) {
  try {
    const idParam = req.params.id;
    if (idParam === 'platform-users' || idParam === 'company-users') {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    const convId = parseInt(idParam, 10);
    if (!convId || Number.isNaN(convId)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation id' });
    }

    const [[conv]] = await db.execute(
      `SELECT c.id, c.type, c.name, c.company_id FROM conversations c
       INNER JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = ?
       WHERE c.id = ?`,
      [req.user.id, convId],
    );
    if (!conv) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const [participants] = await db.execute(
      `SELECT u.id, u.name, r.name AS role_name
       FROM conversation_participants cp
       INNER JOIN users u ON u.id = cp.user_id
       INNER JOIN roles r ON r.id = u.role_id
       WHERE cp.conversation_id = ?`,
      [convId],
    );

    const data = {
      id: conv.id,
      type: conv.type,
      name: conv.name,
      participants: participants.map((p) => ({ id: p.id, name: p.name, role: p.role_name })),
    };
    return res.json({ success: true, data });
  } catch (err) {
    console.error('getConversation', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/** GET /api/chats/:id/messages - paginated messages */
export async function getMessages(req, res) {
  try {
    const convId = parseInt(req.params.id, 10);
    if (!convId) return res.status(400).json({ success: false, message: 'Invalid conversation id' });

    const [member] = await db.execute(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?`,
      [convId, req.user.id],
    );
    if (member.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const before = req.query.before;
    const jump = req.query.jump ? parseInt(req.query.jump, 10) : null;
    const limit = Math.min(parseInt(req.query.limit, 10) || MESSAGES_PAGE_SIZE, 100);

    let sql = `SELECT m.id, m.sender_id, m.body, m.created_at, u.name AS sender_name
               FROM messages m
               INNER JOIN users u ON u.id = m.sender_id
               WHERE m.conversation_id = ?
               `;
    const params = [convId];

    if (jump) {
      // If jumping to a message, get that message and surrounding newer/older messages we want in view
      // We will just fetch messages where id >= jump - margin and then limit, or simpler:
      // fetch messages where id >= (select id from messages where id <= jump order by id desc limit 20 offset 19)
      // As a simple hack without subqueries, just fetch where id >= jump - 50 and id <= jump + 10.
      // But IDs aren't contiguous. Let's just do: grab 50 messages ending at `jump` + 10 newer ones.
      // This is complex in a single query. So let's fetch:
      // Messages <= jump (limit 40)
      // UNION
      // Messages > jump (limit 10)
      sql = `
        (SELECT m.id, m.sender_id, m.body, m.created_at, u.name AS sender_name
         FROM messages m INNER JOIN users u ON u.id = m.sender_id
         WHERE m.conversation_id = ? AND m.id <= ? ORDER BY m.id DESC LIMIT ?)
        UNION
        (SELECT m.id, m.sender_id, m.body, m.created_at, u.name AS sender_name
         FROM messages m INNER JOIN users u ON u.id = m.sender_id
         WHERE m.conversation_id = ? AND m.id > ? ORDER BY m.id ASC LIMIT 10)
        ORDER BY id DESC
      `;
      params.length = 0;
      params.push(convId, jump, limit + 1, convId, jump);
    } else {
      if (before) {
        sql += ` AND m.id < ?`;
        params.push(before);
      }
      sql += ` ORDER BY m.id DESC LIMIT ?`;
      params.push(limit + 1);
    }

    const [rows] = await db.execute(sql, params);
    const hasMore = rows.length > limit;
    const messages = (hasMore ? rows.slice(0, limit) : rows).reverse();

    // Fetch attachments for these messages
    let messageAttachments = {};
    if (messages.length > 0) {
      const msgIds = messages.map(m => m.id);
      const [attRows] = await db.execute(
        `SELECT id, message_id, filename, mimetype, storage_url FROM message_attachments WHERE message_id IN (${msgIds.map(()=>'?').join(',')})`,
        msgIds
      );
      for (const r of attRows) {
        if (!messageAttachments[r.message_id]) messageAttachments[r.message_id] = [];
        messageAttachments[r.message_id].push({
          id: r.id,
          filename: r.filename,
          mimetype: r.mimetype,
          storageUrl: r.storage_url
        });
      }
    }

    const data = messages.map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      body: m.body,
      createdAt: m.created_at,
      isOwn: m.sender_id === req.user.id,
      attachments: messageAttachments[m.id] || []
    }));

    return res.json({ success: true, data, hasMore });
  } catch (err) {
    console.error('getMessages', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/** POST /api/chats/:id/messages - send message */
export async function sendMessage(req, res) {
  try {
    const convId = parseInt(req.params.id, 10);
    if (!convId) return res.status(400).json({ success: false, message: 'Invalid conversation id' });

    const body = req.body?.body != null ? String(req.body.body).trim() : '';
    const attachments = Array.isArray(req.body?.attachments) ? req.body.attachments : [];

    if (!body && attachments.length === 0) {
      return res.status(422).json({ success: false, message: 'Message body or attachment required' });
    }

    const [member] = await db.execute(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?`,
      [convId, req.user.id],
    );
    if (member.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const [ins] = await db.execute(
      `INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)`,
      [convId, req.user.id, body],
    );
    const newMessageId = ins.insertId;

    // Link attachments to this specific message
    const savedAttachments = [];
    if (attachments.length > 0) {
      for (const att of attachments) {
        if (!att.filename || !att.mimetype || !att.storageUrl) continue;
        const [attIns] = await db.execute(
          `INSERT INTO message_attachments (message_id, conversation_id, filename, mimetype, storage_url) VALUES (?, ?, ?, ?, ?)`,
          [newMessageId, convId, att.filename, att.mimetype, att.storageUrl]
        );
        savedAttachments.push({
          id: attIns.insertId,
          messageId: newMessageId,
          filename: att.filename,
          mimetype: att.mimetype,
          storageUrl: att.storageUrl
        });
      }
    }

    const [rows] = await db.execute(
      `SELECT m.id, m.sender_id, m.body, m.created_at, u.name AS sender_name
       FROM messages m
       INNER JOIN users u ON u.id = m.sender_id
       WHERE m.id = ?`,
      [newMessageId],
    );

    const m = rows[0];
    const data = {
      id: m.id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      body: m.body,
      createdAt: m.created_at,
      isOwn: true,
      attachments: savedAttachments
    };

    broadcastNewMessage(convId, {
      id: m.id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      body: m.body,
      createdAt: m.created_at,
      attachments: savedAttachments
    }).catch((err) => console.error('broadcastNewMessage', err));

    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('sendMessage', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/** PATCH /api/chats/:id/read - mark conversation as read */
export async function markConversationRead(req, res) {
  try {
    const convId = parseInt(req.params.id, 10);
    if (!convId) return res.status(400).json({ success: false, message: 'Invalid conversation id' });

    const [result] = await db.execute(
      `UPDATE conversation_participants SET last_read_at = CURRENT_TIMESTAMP
       WHERE conversation_id = ? AND user_id = ?`,
      [convId, req.user.id],
    );

    return res.json({ success: true, updated: result.affectedRows > 0 });
  } catch (err) {
    console.error('markConversationRead', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/** POST /api/chats/:id/participants - add members to group (group only) */
export async function addGroupParticipants(req, res) {
  try {
    const convId = parseInt(req.params.id, 10);
    if (!convId) return res.status(400).json({ success: false, message: 'Invalid conversation id' });

    const userIds = Array.isArray(req.body?.userIds) ? req.body.userIds.map((id) => parseInt(id, 10)).filter(Boolean) : [];
    if (userIds.length === 0) {
      return res.status(422).json({ success: false, message: 'userIds array required' });
    }

    const [[conv]] = await db.execute(
      `SELECT c.id, c.type, c.company_id FROM conversations c
       INNER JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = ?
       WHERE c.id = ?`,
      [req.user.id, convId],
    );
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
    if (conv.type !== 'group') {
      return res.status(400).json({ success: false, message: 'Only group conversations support adding members' });
    }

    const companyId = conv.company_id;
    const [existing] = await db.execute(
      `SELECT user_id FROM conversation_participants WHERE conversation_id = ?`,
      [convId],
    );
    const existingIds = new Set(existing.map((r) => r.user_id));
    const toAdd = userIds.filter((id) => !existingIds.has(id));
    if (toAdd.length === 0) {
      return res.json({ success: true, data: { added: 0, message: 'All already members' } });
    }

    if (companyId != null) {
      const [usersInCompany] = await db.execute(
        `SELECT id FROM users WHERE company_id = ? AND status = 'active' AND id IN (${toAdd.map(() => '?').join(',')})`,
        [companyId, ...toAdd],
      );
      const allowed = new Set(usersInCompany.map((r) => r.id));
      const invalid = toAdd.filter((id) => !allowed.has(id));
      if (invalid.length > 0) {
        return res.status(403).json({ success: false, message: 'Some users are not in this company' });
      }
    }

    for (const uid of toAdd) {
      await db.execute(
        `INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)`,
        [convId, uid],
      );
    }
    return res.json({ success: true, data: { added: toAdd.length, userIds: toAdd } });
  } catch (err) {
    console.error('addGroupParticipants', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/** DELETE /api/chats/:id/participants/:userId - remove member from group (or leave group) */
export async function removeGroupParticipant(req, res) {
  try {
    const convId = parseInt(req.params.id, 10);
    const targetUserId = parseInt(req.params.userId, 10);
    if (!convId || !targetUserId) {
      return res.status(400).json({ success: false, message: 'Invalid conversation or user id' });
    }

    const [[conv]] = await db.execute(
      `SELECT c.id, c.type FROM conversations c
       INNER JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = ?
       WHERE c.id = ?`,
      [req.user.id, convId],
    );
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
    if (conv.type !== 'group') {
      return res.status(400).json({ success: false, message: 'Only group conversations support removing members' });
    }

    const isSelf = targetUserId === req.user.id;
    if (!isSelf) {
      const [targetMember] = await db.execute(
        `SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?`,
        [convId, targetUserId],
      );
      if (targetMember.length === 0) {
        return res.status(404).json({ success: false, message: 'User is not in this group' });
      }
    }

    await db.execute(
      `DELETE FROM conversation_participants WHERE conversation_id = ? AND user_id = ?`,
      [convId, targetUserId],
    );
    return res.json({ success: true, data: { removed: true } });
  } catch (err) {
    console.error('removeGroupParticipant', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/** POST /api/chats/:id/upload - Handle file upload and return storage URL */
export async function uploadAttachment(req, res) {
  try {
    const convId = parseInt(req.params.id, 10);
    if (!convId) return res.status(400).json({ success: false, message: 'Invalid conversation id' });

    // Verify membership
    const [member] = await db.execute(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?`,
      [convId, req.user.id],
    );
    if (member.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    if (!req.files || !req.files.attachment) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const file = req.files.attachment;
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });

    // Generate unique local filename
    const ext = path.extname(file.name) || '';
    const uniqueFilename = `chat_${convId}_${req.user.id}_${Date.now()}${ext}`;
    const savePath = path.join(UPLOAD_DIR, uniqueFilename);
    
    await file.mv(savePath);
    const storageUrl = `/uploads/chats/${uniqueFilename}`;

    return res.json({ 
      success: true, 
      data: { 
        filename: file.name,
        mimetype: file.mimetype,
        storageUrl 
      } 
    });
  } catch (err) {
    console.error('uploadAttachment error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/** GET /api/chats/:id/attachments - Get all media for a conversation */
export async function getConversationAttachments(req, res) {
  try {
    const convId = parseInt(req.params.id, 10);
    if (!convId) return res.status(400).json({ success: false, message: 'Invalid conversation id' });

    // Verify membership
    const [member] = await db.execute(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ?`,
      [convId, req.user.id],
    );
    if (member.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const [rows] = await db.execute(
      `SELECT ma.id, ma.message_id, ma.filename, ma.mimetype, ma.storage_url, ma.created_at, u.name AS sender_name
       FROM message_attachments ma
       INNER JOIN messages m ON m.id = ma.message_id
       INNER JOIN users u ON u.id = m.sender_id
       WHERE ma.conversation_id = ?
       ORDER BY ma.created_at DESC`,
      [convId],
    );

    const data = rows.map((r) => ({
      id: r.id,
      messageId: r.message_id,
      filename: r.filename,
      mimetype: r.mimetype,
      storageUrl: r.storage_url,
      createdAt: r.created_at,
      senderName: r.sender_name
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error('getConversationAttachments error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
