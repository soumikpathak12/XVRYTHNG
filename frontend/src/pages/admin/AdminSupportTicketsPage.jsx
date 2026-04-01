/**
 * Admin support tickets – list and detail (thread-style) with reply and status update.
 * Brand theme: #1A7B7B, #4DB8A8, #1A1A2E, #555555.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  listAdminSupportTickets,
  getAdminSupportTicket,
  addAdminSupportTicketReply,
  updateAdminSupportTicketStatus,
  markAdminSupportCompanyCompensationPaid,
  escalateAdminSupportCompensation,
  getToken,
} from '../../services/api.js';
import { MessageCircle, ArrowLeft, Send, Loader2, AlertCircle, User, Headphones } from 'lucide-react';
import '../../styles/AdminSupportTicketsPage.css';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  withdrawn: 'Withdrawn',
};

const CATEGORY_LABELS = {
  installation: 'Installation',
  referral: 'Referral',
  others: 'Others',
};

const COMPENSATION_LABELS = {
  none: 'Not triggered',
  company_due: 'Company owes customer',
  company_paid: 'Company paid',
  xvrything_paid: 'XVRYTHING paid',
  company_removed: 'Company suspended',
};

function capitalizeFirst(s) {
  return s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '';
}

function formatDate(d) {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '$0';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 }).format(n);
}

/** Ticket list view */
function TicketList({
  tickets,
  loading,
  statusFilter,
  onStatusFilterChange,
  onSelectTicket,
  newTicketCount,
  onClearNewTicketNotice,
}) {
  return (
    <div className="admin-support-list">
      <div className="admin-support-header">
        <h1 className="admin-support-title">Support tickets</h1>
        <div className="admin-support-filters">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="admin-support-filter-select"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {newTicketCount > 0 && (
        <div className="admin-support-live-alert" role="status" aria-live="polite">
          <span>
            {newTicketCount === 1
              ? 'A new support ticket has arrived.'
              : `${newTicketCount} new support tickets have arrived.`}
          </span>
          <button type="button" onClick={onClearNewTicketNotice} className="admin-support-live-alert-btn">
            Dismiss
          </button>
        </div>
      )}
      {loading ? (
        <div className="admin-support-loading">
          <Loader2 size={32} className="spin" />
          <span>Loading tickets...</span>
        </div>
      ) : tickets.length === 0 ? (
        <div className="admin-support-empty">
          <MessageCircle size={48} className="admin-support-empty-icon" />
          <h3>No support tickets</h3>
          <p>Customer-submitted tickets will appear here.</p>
        </div>
      ) : (
        <div className="admin-support-table">
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Customer</th>
                <th>Category</th>
                <th>Status</th>
                <th>SLA</th>
                <th>Priority</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} onClick={() => onSelectTicket(t.id)} className="admin-support-row">
                  <td className="admin-support-subject">{t.subject}</td>
                  <td>
                    <span className="admin-support-customer">{t.customer_name || t.email || '—'}</span>
                  </td>
                  <td>
                    <span className="admin-support-category">
                      {CATEGORY_LABELS[t.category] || t.category}
                      {t.category === 'others' && t.category_other ? `: ${t.category_other}` : ''}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-support-status admin-support-status-${t.status}`}>
                      {STATUS_LABELS[t.status] || t.status}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-support-sla ${t.is_sla_breached ? 'breached' : 'ok'}`}>
                      {t.is_sla_breached ? 'Breached' : 'On time'}
                    </span>
                  </td>
                  <td className="admin-support-priority">{capitalizeFirst(t.priority)}</td>
                  <td className="admin-support-date">{formatDate(t.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Ticket detail view */
function TicketDetail({ ticketId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingCompensation, setUpdatingCompensation] = useState(false);

  const loadTicket = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminSupportTicket(ticketId);
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setSending(true);
    setError('');
    try {
      await addAdminSupportTicketReply(ticketId, { body: replyBody.trim() });
      setReplyBody('');
      await loadTicket();
    } catch (err) {
      setError(err.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    setError('');
    try {
      await updateAdminSupportTicketStatus(ticketId, newStatus);
      await loadTicket();
    } catch (err) {
      setError(err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleMarkCompanyPaid = async () => {
    setUpdatingCompensation(true);
    setError('');
    try {
      await markAdminSupportCompanyCompensationPaid(ticketId);
      await loadTicket();
    } catch (err) {
      setError(err.message || 'Failed to mark company compensation');
    } finally {
      setUpdatingCompensation(false);
    }
  };

  const handleEscalate = async () => {
    const ok = confirm('Escalate this case to XVRYTHING compensation and suspend the company?');
    if (!ok) return;
    setUpdatingCompensation(true);
    setError('');
    try {
      await escalateAdminSupportCompensation(ticketId);
      await loadTicket();
    } catch (err) {
      setError(err.message || 'Failed to escalate compensation');
    } finally {
      setUpdatingCompensation(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-support-loading">
        <Loader2 size={32} className="spin" />
        <span>Loading ticket...</span>
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="admin-support-detail-error">
        <AlertCircle size={24} />
        <p>{error}</p>
        <button type="button" onClick={onBack} className="admin-support-btn-primary">
          <ArrowLeft size={18} />
          Back to tickets
        </button>
      </div>
    );
  }

  const { ticket, replies } = data || {};
  const canReply = ticket && ['open', 'in_progress'].includes(ticket.status);

  return (
    <div className="admin-support-detail">
      <button type="button" onClick={onBack} className="admin-support-back">
        <ArrowLeft size={18} />
        Back to tickets
      </button>
      <div className="admin-support-detail-header">
        <div className="admin-support-detail-title-row">
          <h1 className="admin-support-detail-subject">{ticket?.subject}</h1>
          <div className="admin-support-detail-actions">
            <select
              value={ticket?.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updatingStatus}
              className="admin-support-status-select"
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="admin-support-detail-meta">
          <span><strong>Customer:</strong> {ticket?.customer_name || ticket?.email || '—'}</span>
          <span><strong>Category:</strong> {CATEGORY_LABELS[ticket?.category] || ticket?.category}</span>
          {ticket?.category === 'others' && ticket?.category_other && (
            <span><strong>Other:</strong> {ticket.category_other}</span>
          )}
          <span><strong>Priority:</strong> {capitalizeFirst(ticket?.priority)}</span>
          <span><strong>Created:</strong> {formatDate(ticket?.created_at)}</span>
          <span><strong>Response Due:</strong> {formatDate(ticket?.response_due_at)}</span>
          <span><strong>SLA Status:</strong> {ticket?.is_sla_breached ? 'Breached' : 'On time'}</span>
          <span><strong>Compensation:</strong> {COMPENSATION_LABELS[ticket?.effective_compensation_status || ticket?.compensation_status] || 'Not triggered'}</span>
        </div>
      </div>

      <div className="admin-support-policy-panel">
        <h3>Customer Protection Policy</h3>
        <p>
          If no staff response is sent within 90 minutes, company owes customer {formatCurrency(ticket?.company_compensation_amount || 50)}.
          If the company fails to compensate, escalate to XVRYTHING {formatCurrency(ticket?.xvrything_compensation_amount || 250)} and suspend the company.
        </p>
        <div className="admin-support-policy-actions">
          <button
            type="button"
            className="admin-support-btn-secondary"
            onClick={handleMarkCompanyPaid}
            disabled={updatingCompensation || !['company_due', 'company_paid'].includes(ticket?.effective_compensation_status || ticket?.compensation_status)}
          >
            Mark Company Compensation Paid
          </button>
          <button
            type="button"
            className="admin-support-btn-danger"
            onClick={handleEscalate}
            disabled={updatingCompensation || !['company_due', 'company_paid'].includes(ticket?.effective_compensation_status || ticket?.compensation_status)}
          >
            Escalate + Suspend Company
          </button>
        </div>
      </div>

      <div className="admin-support-thread admin-support-chat">
        <h3 className="admin-support-thread-title">Conversation</h3>
        <div className="admin-support-chat-messages">
          {replies?.map((r) => {
            const isCustomer = r.author_type === 'customer';
            const authorName = isCustomer ? (ticket?.customer_name || 'Customer') : (r.author_user_name || 'Support');
            return (
              <div
                key={r.id}
                className={`admin-support-chat-bubble admin-support-chat-bubble-${r.author_type}`}
              >
                <div className="admin-support-chat-avatar">
                  {isCustomer ? <User size={20} /> : <Headphones size={20} />}
                </div>
                <div className="admin-support-chat-content">
                  <div className="admin-support-chat-header">
                    <span className="admin-support-chat-author">{authorName}</span>
                    <span className="admin-support-chat-date">{formatDate(r.created_at)}</span>
                  </div>
                  <div className="admin-support-chat-body">{r.body}</div>
                </div>
              </div>
            );
          })}
        </div>

        {canReply && (
          <form onSubmit={handleSendReply} className="admin-support-reply-form">
            {error && (
              <div className="admin-support-error">
                <AlertCircle size={18} />
                {error}
              </div>
            )}
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Type your reply..."
              rows={3}
              className="admin-support-textarea"
            />
            <button
              type="submit"
              disabled={sending || !replyBody.trim()}
              className="admin-support-btn-primary"
            >
              {sending ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
              {sending ? 'Sending...' : 'Send reply'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AdminSupportTicketsPage() {
  const navigate = useNavigate();
  const { ticketId } = useParams();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [newTicketCount, setNewTicketCount] = useState(0);
  const knownTicketIdsRef = useRef(new Set());
  const initializedRef = useRef(false);

  const loadTickets = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await listAdminSupportTickets({
        status: statusFilter || undefined,
      });
      const nextTickets = res.data || [];
      setTickets(nextTickets);

      const nextIds = new Set(nextTickets.map((t) => Number(t.id)).filter(Number.isFinite));

      if (!initializedRef.current) {
        knownTicketIdsRef.current = nextIds;
        initializedRef.current = true;
        setNewTicketCount(0);
      } else {
        let freshCount = 0;
        for (const id of nextIds) {
          if (!knownTicketIdsRef.current.has(id)) freshCount += 1;
        }
        if (freshCount > 0) {
          setNewTicketCount((prev) => prev + freshCount);
        }
        knownTicketIdsRef.current = nextIds;
      }
    } catch {
      setTickets([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    initializedRef.current = false;
    knownTicketIdsRef.current = new Set();
    setNewTicketCount(0);
    loadTickets();
  }, [statusFilter, loadTickets]);

  useEffect(() => {
    if (ticketId) return undefined;

    const token = getToken();
    if (!token) return undefined;

    const env = import.meta.env?.VITE_WS_URL;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const defaultWsUrl = `${protocol}//${window.location.host}/ws`;
    const wsUrl = `${(env ? env.replace(/^http/, 'ws') : defaultWsUrl)}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type !== 'support_ticket_created') return;

        const incomingStatus = String(data?.ticket?.status || 'open');
        const matchesCurrentFilter = !statusFilter || statusFilter === incomingStatus;

        setNewTicketCount((prev) => prev + 1);
        if (matchesCurrentFilter) {
          loadTickets({ silent: true });
        }
      } catch {
        // Ignore invalid websocket payloads.
      }
    };

    return () => {
      try {
        ws.close();
      } catch {
        // ignore close error
      }
    };
  }, [ticketId, statusFilter, loadTickets]);

  useEffect(() => {
    if (ticketId) return undefined;
    const interval = setInterval(() => {
      loadTickets({ silent: true });
    }, 60000);
    return () => clearInterval(interval);
  }, [ticketId, loadTickets]);

  const handleSelectTicket = (id) => {
    const base = window.location.pathname.startsWith('/dashboard') ? '/dashboard' : window.location.pathname.startsWith('/employee') ? '/employee' : '/admin';
    navigate(`${base}/support-tickets/${id}`);
  };

  const handleBack = () => {
    const base = window.location.pathname.startsWith('/dashboard') ? '/dashboard' : window.location.pathname.startsWith('/employee') ? '/employee' : '/admin';
    navigate(`${base}/support-tickets`);
  };

  if (ticketId) {
    return (
      <div className="admin-support-page">
        <TicketDetail ticketId={ticketId} onBack={handleBack} />
      </div>
    );
  }

  return (
    <div className="admin-support-page">
      <TicketList
        tickets={tickets}
        loading={loading}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onSelectTicket={handleSelectTicket}
        newTicketCount={newTicketCount}
        onClearNewTicketNotice={() => setNewTicketCount(0)}
      />
    </div>
  );
}
