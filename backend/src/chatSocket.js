/**
 * WebSocket server for instant chat. Attach to HTTP server; authenticate by JWT; broadcast new messages to conversation participants.
 */
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import db from './config/db.js';

const JWT_SECRET = process.env.JWT_SECRET;

/** userId -> Set of WebSocket */
const socketsByUser = new Map();

function getSocketsForUser(userId) {
  return socketsByUser.get(userId) || new Set();
}

function registerSocket(socket, userId) {
  if (!socketsByUser.has(userId)) socketsByUser.set(userId, new Set());
  socketsByUser.get(userId).add(socket);
}

function unregisterSocket(socket, userId) {
  const set = socketsByUser.get(userId);
  if (set) {
    set.delete(socket);
    if (set.size === 0) socketsByUser.delete(userId);
  }
}

function sendJsonToUserIds(userIds, payloadObj) {
  const payload = JSON.stringify(payloadObj);
  for (const userId of userIds) {
    const sockets = getSocketsForUser(userId);
    for (const ws of sockets) {
      if (ws.readyState === 1) {
        try {
          ws.send(payload);
        } catch (err) {
          console.error('chatSocket send error', err);
        }
      }
    }
  }
}

/**
 * Broadcast a new message to all participants of a conversation (except optionally the sender, who already has it).
 * Payload: { type: 'new_message', conversationId, message: { id, senderId, senderName, body, createdAt } }
 */
export async function broadcastNewMessage(conversationId, messagePayload) {
  const [rows] = await db.execute(
    `SELECT user_id FROM conversation_participants WHERE conversation_id = ?`,
    [conversationId],
  );
  const userIds = new Set(rows.map((r) => r.user_id));
  sendJsonToUserIds(userIds, {
    type: 'new_message',
    conversationId,
    message: messagePayload,
  });
}

/**
 * Broadcast a support ticket creation event to super admins and company admins/managers.
 */
export async function broadcastSupportTicketCreated(ticket) {
  if (!ticket?.id) return;
  const companyId = Number(ticket.company_id);

  const params = ['super_admin'];
  const companyClause = Number.isFinite(companyId)
    ? " OR (u.company_id = ? AND LOWER(r.name) IN ('admin', 'company_admin', 'manager'))"
    : '';
  if (Number.isFinite(companyId)) params.push(companyId);

  const [rows] = await db.execute(
    `SELECT DISTINCT u.id
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.status = 'active'
       AND (LOWER(r.name) = ?${companyClause})`,
    params,
  );

  const userIds = new Set(rows.map((r) => Number(r.id)).filter(Number.isFinite));
  if (userIds.size === 0) return;

  sendJsonToUserIds(userIds, {
    type: 'support_ticket_created',
    ticket: {
      id: Number(ticket.id),
      company_id: Number.isFinite(companyId) ? companyId : null,
      status: ticket.status || 'open',
      created_at: ticket.created_at || new Date().toISOString(),
    },
  });
}

/**
 * Attach WebSocket server to the given wss (path /ws on same HTTP server).
 */
export function attach(wss) {
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    let userId = null;

    try {
      if (!token) {
        ws.close(4401, 'Missing token');
        return;
      }
      const payload = jwt.verify(token, JWT_SECRET);
      userId = payload.userId;
      if (!userId) {
        ws.close(4401, 'Invalid token');
        return;
      }
    } catch (err) {
      ws.close(4401, err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token');
      return;
    }

    registerSocket(ws, userId);

    ws.on('close', () => {
      unregisterSocket(ws, userId);
    });

    ws.on('error', () => {
      unregisterSocket(ws, userId);
    });
  });
}
