/**
 * Internal employee messaging: chat list + conversation view.
 * Matches design: search chats, list with avatars/last message/unread, conversation with bubbles.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

/** Searchable employee dropdown for "Start a chat" */
function SearchableEmployeeSelect({ employees, placeholder, onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const normalized = (s) => (s ?? '').toLowerCase().trim();
  const filtered = !query.trim()
    ? employees
    : employees.filter((u) => {
        const q = normalized(query);
        return (
          normalized(u.name).includes(q) ||
          normalized(u.email).includes(q) ||
          normalized(u.role).includes(q) ||
          normalized(u.companyName).includes(q)
        );
      });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleChoose = (u) => {
    onSelect(u.id);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="messages-employee-select" ref={containerRef}>
      <div
        className="messages-employee-select-trigger"
        onClick={() => setOpen((o) => !o)}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="messages-employee-select-input"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls="messages-employee-listbox"
        />
        <span className="messages-employee-select-chevron" aria-hidden>▼</span>
      </div>
      {open && (
        <ul
          id="messages-employee-listbox"
          className="messages-employee-select-list"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <li className="messages-employee-select-empty">No matches</li>
          ) : (
            filtered.map((u) => (
              <li
                key={u.id}
                role="option"
                className="messages-employee-select-option"
                onClick={() => handleChoose(u)}
              >
                <span className="messages-employee-select-option-name">{u.name}</span>
                <span className="messages-employee-select-option-meta">
                  {u.role?.replace('_', ' ') ?? ''}
                  {u.companyName ? ` · ${u.companyName}` : ''}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
import {
  getChatCompanyUsers,
  getChatPlatformUsers,
  getChatConversations,
  createChatConversation,
  getChatMessages,
  sendChatMessage,
  markChatRead,
  listCompanies,
  getToken,
} from '../services/api.js';
import { useChatSocket } from '../hooks/useChatSocket.js';
import CreateGroupModal from '../components/messages/CreateGroupModal.jsx';
import GroupInfoPanel from '../components/messages/GroupInfoPanel.jsx';
import '../styles/MessagesPage.css';

const AVATAR_COLORS = ['#1A7B7B', '#4DB8A8', '#146b6b', '#0d9488', '#2dd4bf'];

function getInitials(name) {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function avatarColor(key) {
  let n = 0;
  if (typeof key === 'number') n = key;
  else if (typeof key === 'string') for (let i = 0; i < key.length; i++) n += key.charCodeAt(i);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60 * 1000) return 'Just now';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 86400000)}d`;
  return d.toLocaleDateString();
}

function formatMessageTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessagesPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role?.toLowerCase() === 'super_admin';
  const [chatScope, setChatScope] = useState('company');
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [input, setInput] = useState('');
  const [searchChats, setSearchChats] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const groupInfoAnchorRef = useRef(null);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const loadConversationsRef = useRef(null);

  const handleIncomingMessage = useCallback((conversationId, message) => {
    if (conversationId !== selectedIdRef.current) return;
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, { ...message, isOwn: message.senderId === user?.id }];
    });
    loadConversationsRef.current?.();
  }, [user?.id]);

  const { connected: wsConnected } = useChatSocket(getToken, handleIncomingMessage);

  const effectiveCompanyId = isSuperAdmin
    ? (chatScope === 'all' ? null : selectedCompanyId)
    : undefined;
  const usePlatformDm = isSuperAdmin && chatScope === 'all';

  const loadCompanies = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await listCompanies();
      setCompanies(res?.data ?? []);
    } catch (e) {
      setError(e?.message ?? 'Failed to load companies');
    }
  }, [isSuperAdmin]);

  const loadCompanyUsers = useCallback(async () => {
    if (usePlatformDm) {
      try {
        const list = await getChatPlatformUsers();
        setCompanyUsers(list);
      } catch (e) {
        setError(e?.message ?? 'Failed to load employees');
      }
      return;
    }
    if (isSuperAdmin && effectiveCompanyId == null) return;
    try {
      const list = await getChatCompanyUsers(effectiveCompanyId);
      setCompanyUsers(list);
    } catch (e) {
      if (e?.status === 400) setError('Company context required. Select a company if you are Super Admin.');
      else setError(e?.message ?? 'Failed to load team');
    }
  }, [isSuperAdmin, effectiveCompanyId, usePlatformDm]);

  const loadConversations = useCallback(async () => {
    if (isSuperAdmin && !usePlatformDm && effectiveCompanyId == null) return;
    try {
      setError(null);
      const list = await getChatConversations(effectiveCompanyId);
      setConversations(list);
    } catch (e) {
      if (e?.status === 400) setError('Company context required.');
      else setError(e?.message ?? 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, effectiveCompanyId, usePlatformDm]);
  loadConversationsRef.current = loadConversations;

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    if (isSuperAdmin && !usePlatformDm && effectiveCompanyId == null) {
      setLoading(false);
      setCompanyUsers([]);
      setConversations([]);
      return;
    }
    loadCompanyUsers();
    loadConversations();
  }, [loadCompanyUsers, loadConversations, isSuperAdmin, effectiveCompanyId, usePlatformDm]);

  const loadMessages = useCallback(async (convId, before) => {
    if (!convId) return;
    try {
      const { messages: next, hasMore } = await getChatMessages(convId, {
        before: before || undefined,
        limit: 50,
      }, effectiveCompanyId);
      if (before) {
        setMessages((prev) => [...next, ...prev]);
      } else {
        setMessages(next);
      }
      setHasMoreMessages(hasMore);
    } catch (e) {
      setError(e?.message ?? 'Failed to load messages');
    }
  }, [effectiveCompanyId]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setHasMoreMessages(false);
      return;
    }
    setMessages([]);
    loadMessages(selectedId);
    markChatRead(selectedId, effectiveCompanyId).catch(() => {});
    if (wsConnected) return;
    const fallbackInterval = setInterval(() => loadMessages(selectedId), 30000);
    return () => clearInterval(fallbackInterval);
  }, [selectedId, loadMessages, effectiveCompanyId, wsConnected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!groupInfoOpen) return;
    const handleClickOutside = (e) => {
      if (groupInfoAnchorRef.current && !groupInfoAnchorRef.current.contains(e.target)) {
        setGroupInfoOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [groupInfoOpen]);

  const handleStartChat = async (otherUserId) => {
    try {
      const { id } = await createChatConversation(
        { type: 'dm', otherUserId: Number(otherUserId) },
        effectiveCompanyId,
        usePlatformDm ? { platform: true } : {},
      );
      await loadConversations();
      setSelectedId(id);
    } catch (e) {
      setError(e?.message ?? 'Failed to start chat');
    }
  };

  const handleCreateGroup = async ({ name, userIds }) => {
    setCreatingGroup(true);
    try {
      const { id } = await createChatConversation(
        { type: 'group', name, userIds },
        effectiveCompanyId,
      );
      await loadConversations();
      setSelectedId(id);
      setCreateGroupOpen(false);
    } catch (e) {
      setError(e?.message ?? 'Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleSend = async () => {
    const body = input.trim();
    if (!body || !selectedId || sending) return;
    setSending(true);
    try {
      const msg = await sendChatMessage(selectedId, body, effectiveCompanyId);
      setMessages((prev) => [...prev, { ...msg, isOwn: true }]);
      setInput('');
      await loadConversations();
    } catch (e) {
      setError(e?.message ?? 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const selectedConv = conversations.find((c) => c.id === selectedId);
  const filteredConversations = searchChats.trim()
    ? conversations.filter(
        (c) =>
          c.name?.toLowerCase().includes(searchChats.toLowerCase()) ||
          c.participants?.some((p) => p.name?.toLowerCase().includes(searchChats.toLowerCase())),
      )
    : conversations;

  return (
    <div className="messages-page">
      <div className="messages-chat-list">
        {isSuperAdmin && (
          <div className="messages-company-picker">
            <label className="messages-company-picker-label">Chat with</label>
            <div className="messages-scope-row">
              <select
                value={chatScope}
                onChange={(e) => {
                  setChatScope(e.target.value);
                  setSelectedId(null);
                  setError(null);
                }}
                className="messages-scope-select"
              >
                <option value="company">Company employees</option>
                <option value="all">All employees (any company)</option>
              </select>
              {chatScope === 'company' && (
                <select
                  id="messages-company-select"
                  value={selectedCompanyId ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedCompanyId(v ? Number(v) : null);
                    setSelectedId(null);
                  }}
                  className="messages-company-select"
                >
                  <option value="">Select company...</option>
                  {(companies || []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name ?? `Company ${c.id}`}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}
        <div className="messages-chat-list-header">
          <input
            type="search"
            placeholder="Search chats..."
            value={searchChats}
            onChange={(e) => setSearchChats(e.target.value)}
            className="messages-search-input"
          />
        </div>
        {companyUsers.length > 0 && (
          <div className="messages-start-chat">
            <span className="messages-start-chat-label">Start a chat</span>
            <SearchableEmployeeSelect
              employees={companyUsers}
              placeholder={usePlatformDm ? 'Search any employee...' : 'Search teammate...'}
              onSelect={(userId) => handleStartChat(userId)}
            />
            {!usePlatformDm && (
              <button
                type="button"
                className="messages-new-group-btn"
                onClick={() => setCreateGroupOpen(true)}
              >
                New group
              </button>
            )}
          </div>
        )}
        <CreateGroupModal
          open={createGroupOpen}
          onClose={() => setCreateGroupOpen(false)}
          employees={companyUsers}
          onCreate={handleCreateGroup}
          creating={creatingGroup}
        />
        <div className="messages-conversation-list">
          {loading ? (
            <div className="messages-loading">Loading...</div>
          ) : isSuperAdmin && chatScope === 'company' && effectiveCompanyId == null ? (
            <div className="messages-error">Select a company above to view and send messages.</div>
          ) : error && !conversations.length ? (
            <div className="messages-error">{error}</div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                type="button"
                className={`messages-conv-item ${selectedId === conv.id ? 'messages-conv-item-active' : ''}`}
                onClick={() => setSelectedId(conv.id)}
              >
                <div
                  className="messages-conv-avatar"
                  style={{ backgroundColor: avatarColor(conv.id) }}
                >
                  {getInitials(conv.name)}
                </div>
                <div className="messages-conv-body">
                  <div className="messages-conv-name">{conv.name}</div>
                  {conv.lastMessage && (
                    <div className="messages-conv-preview">
                      {conv.lastMessage.senderName}: {conv.lastMessage.body?.slice(0, 40)}
                      {conv.lastMessage.body?.length > 40 ? '…' : ''}
                    </div>
                  )}
                  <div className="messages-conv-meta">
                    <span className="messages-conv-time">{formatTime(conv.lastMessage?.createdAt || conv.updatedAt)}</span>
                    {conv.unreadCount > 0 && (
                      <span className="messages-unread-badge">{conv.unreadCount}</span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="messages-conversation">
        {!selectedId ? (
          <div className="messages-empty-state">
            <p>Select a conversation or start a new chat with a teammate.</p>
          </div>
        ) : (
          <>
            <header className="messages-conv-header">
              <div
                className="messages-conv-header-avatar"
                style={{ backgroundColor: avatarColor(selectedConv?.id ?? 0) }}
              >
                {getInitials(selectedConv?.name)}
              </div>
              <div className="messages-conv-header-info">
                <span className="messages-conv-header-name">{selectedConv?.name ?? 'Chat'}</span>
                <span className="messages-conv-header-role">
                  {selectedConv?.type === 'group'
                    ? `Group · ${(selectedConv?.participants?.length ?? 0) + 1} members`
                    : (selectedConv?.participants?.[0]?.role?.replace('_', ' ') ?? '')}
                </span>
                {selectedConv?.type !== 'group' && <span className="messages-online-badge">ONLINE</span>}
              </div>
              <div className="messages-conv-header-actions-wrap" ref={groupInfoAnchorRef}>
                <button
                  type="button"
                  className="messages-conv-header-actions"
                  onClick={() => selectedConv?.type === 'group' && setGroupInfoOpen((o) => !o)}
                  aria-expanded={groupInfoOpen}
                  aria-haspopup="dialog"
                >
                  ⋯
                </button>
                {selectedConv?.type === 'group' && groupInfoOpen && (
                  <div className="messages-group-info-dropdown">
                    <GroupInfoPanel
                      conversationId={selectedId}
                      companyId={effectiveCompanyId}
                      currentUserId={user?.id}
                      companyUsers={companyUsers}
                      onClose={() => setGroupInfoOpen(false)}
                      onLeave={() => {
                        setGroupInfoOpen(false);
                        setSelectedId(null);
                        loadConversations();
                      }}
                      onParticipantsChange={() => loadConversations()}
                    />
                  </div>
                )}
              </div>
            </header>

            <div className="messages-messages-wrap" ref={messagesContainerRef}>
              {hasMoreMessages && (
                <button
                  type="button"
                  className="messages-load-more"
                  onClick={() => {
                    const first = messages[0];
                    if (first) loadMessages(selectedId, first.id);
                  }}
                >
                  Load older messages
                </button>
              )}
              <div className="messages-messages">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`messages-message-row ${msg.isOwn ? 'messages-message-own' : ''}`}
                  >
                    <div className="messages-message-bubble">
                      {!msg.isOwn && <div className="messages-message-sender">{msg.senderName}</div>}
                      <div className="messages-message-body">{msg.body}</div>
                      <div className="messages-message-time">{formatMessageTime(msg.createdAt)}</div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="messages-input-row">
              <button type="button" className="messages-attach-btn" aria-label="Attach">
                +
              </button>
              <input
                type="text"
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                className="messages-message-input"
                disabled={sending}
              />
              <button
                type="button"
                className="messages-send-btn"
                onClick={handleSend}
                disabled={sending || !input.trim()}
                aria-label="Send"
              >
                ⚡
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
