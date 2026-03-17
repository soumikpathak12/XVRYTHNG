/**
 * Customer portal – Support tickets: list view, new ticket form, ticket detail (thread-style).
 * T-336, T-338, T-339. Brand theme: #1A7B7B, #4DB8A8, #1A1A2E, #555555.
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createSupportTicketApi,
  listSupportTicketsApi,
  getSupportTicketApi,
  addSupportTicketReplyApi,
  withdrawSupportTicketApi,
} from '../../services/api.js';
import { MessageCirclePlus, ArrowLeft, Send, Loader2, AlertCircle, XCircle, User, Headphones } from 'lucide-react';
import '../../styles/CustomerPortal.css';
import '../../styles/SupportTicketsPage.css';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const CATEGORY_OPTIONS = [
  { value: 'installation', label: 'Installation' },
  { value: 'referral', label: 'Referral' },
  { value: 'others', label: 'Others' },
];

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  withdrawn: 'Withdrawn',
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

/** New ticket form */
function NewTicketForm({ onSuccess, onCancel }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('installation');
  const [categoryOther, setCategoryOther] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!subject.trim()) {
      setError('Please enter a subject.');
      return;
    }
    if (category === 'others' && !categoryOther.trim()) {
      setError('Please specify the issue category when selecting "Others".');
      return;
    }
    if (!body.trim()) {
      setError('Please describe your issue.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createSupportTicketApi({
        subject: subject.trim(),
        body: body.trim(),
        priority,
        category,
        categoryOther: category === 'others' ? categoryOther.trim() : null,
      });
      onSuccess?.(res.data);
    } catch (err) {
      setError(err.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="support-ticket-form-card customer-portal-card">
      <h2 className="support-ticket-form-title">Submit a support ticket</h2>
      <p className="support-ticket-form-desc">
        Describe your issue and we&apos;ll get back to you as soon as possible.
      </p>
      <form onSubmit={handleSubmit} className="support-ticket-form">
        <div className="support-ticket-form-group">
          <label htmlFor="subject">Subject</label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary of your issue"
            maxLength={255}
            className="support-ticket-input"
          />
        </div>
        <div className="support-ticket-form-group">
          <label htmlFor="category">Issue category</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="support-ticket-select"
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {category === 'others' && (
          <div className="support-ticket-form-group">
            <label htmlFor="categoryOther">Specify category <span className="support-ticket-required">*</span></label>
            <input
              id="categoryOther"
              type="text"
              value={categoryOther}
              onChange={(e) => setCategoryOther(e.target.value)}
              placeholder="Please describe your issue category"
              maxLength={255}
              className="support-ticket-input"
            />
          </div>
        )}
        <div className="support-ticket-form-group">
          <label htmlFor="priority">Priority</label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="support-ticket-select"
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="support-ticket-form-group">
          <label htmlFor="body">Message</label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Describe your issue in detail..."
            rows={5}
            className="support-ticket-textarea"
          />
        </div>
        {error && (
          <div className="support-ticket-error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}
        <div className="support-ticket-form-actions">
          <button type="button" onClick={onCancel} className="support-ticket-btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="customer-portal-btn customer-portal-btn-primary">
            {submitting ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
            {submitting ? 'Submitting...' : 'Submit ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Ticket list view */
function TicketList({ tickets, loading, onNewTicket, onSelectTicket }) {
  if (loading) {
    return (
      <div className="support-tickets-loading">
        <Loader2 size={32} className="spin" />
        <span>Loading tickets...</span>
      </div>
    );
  }

  return (
    <div className="support-tickets-list-view">
      <div className="support-tickets-header">
        <h1 className="support-tickets-title">Support tickets</h1>
        <button onClick={onNewTicket} className="customer-portal-btn customer-portal-btn-primary">
          <MessageCirclePlus size={18} />
          New ticket
        </button>
      </div>
      {tickets.length === 0 ? (
        <div className="support-tickets-empty customer-portal-card">
          <MessageCirclePlus size={48} className="support-tickets-empty-icon" />
          <h3>No support tickets yet</h3>
          <p>Submit a ticket for any issues with your project. Our team will respond shortly.</p>
          <button onClick={onNewTicket} className="customer-portal-btn customer-portal-btn-primary">
            <MessageCirclePlus size={18} />
            Submit your first ticket
          </button>
        </div>
      ) : (
        <div className="support-tickets-table">
          {tickets.map((t) => (
            <button
              key={t.id}
              type="button"
              className="support-ticket-row"
              onClick={() => onSelectTicket(t.id)}
            >
              <div className="support-ticket-row-main">
                <span className="support-ticket-subject">{t.subject}</span>
                <span className={`support-ticket-status support-ticket-status-${t.status}`}>
                  {STATUS_LABELS[t.status] || t.status}
                </span>
              </div>
              <div className="support-ticket-row-meta">
                <span className="support-ticket-date">{formatDate(t.updated_at)}</span>
                <span className="support-ticket-priority">{capitalizeFirst(t.priority)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Ticket detail view (thread-style) */
function TicketDetail({ ticketId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const loadTicket = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getSupportTicketApi(ticketId);
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
      await addSupportTicketReplyApi(ticketId, { body: replyBody.trim() });
      setReplyBody('');
      await loadTicket();
    } catch (err) {
      setError(err.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="support-tickets-loading">
        <Loader2 size={32} className="spin" />
        <span>Loading ticket...</span>
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="support-ticket-detail-error customer-portal-card">
        <AlertCircle size={24} />
        <p>{error}</p>
        <button onClick={onBack} className="customer-portal-btn customer-portal-btn-primary">
          <ArrowLeft size={18} />
          Back to tickets
        </button>
      </div>
    );
  }

  const { ticket, replies } = data || {};
  const canReply = ticket && ['open', 'in_progress'].includes(ticket.status);
  const canWithdraw = ticket && ['open', 'in_progress'].includes(ticket.status);

  const handleWithdraw = async () => {
    if (!confirm('Are you sure you want to withdraw this ticket? The conversation history will be preserved.')) return;
    setWithdrawing(true);
    setError('');
    try {
      await withdrawSupportTicketApi(ticketId);
      await loadTicket();
    } catch (err) {
      setError(err.message || 'Failed to withdraw ticket');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="support-ticket-detail">
      <button type="button" onClick={onBack} className="support-ticket-back">
        <ArrowLeft size={18} />
        Back to tickets
      </button>
      <div className="support-ticket-detail-header customer-portal-card">
        <div className="support-ticket-detail-title-row">
          <h1 className="support-ticket-detail-subject">{ticket?.subject}</h1>
          <div className="support-ticket-detail-header-actions">
            <span className={`support-ticket-status support-ticket-status-${ticket?.status}`}>
              {STATUS_LABELS[ticket?.status] || ticket?.status}
            </span>
            {canWithdraw && (
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="support-ticket-withdraw-btn"
              >
                {withdrawing ? <Loader2 size={16} className="spin" /> : <XCircle size={16} />}
                {withdrawing ? 'Withdrawing...' : 'Withdraw ticket'}
              </button>
            )}
          </div>
        </div>
        <div className="support-ticket-detail-meta">
          <span>Priority: {capitalizeFirst(ticket?.priority)}</span>
          <span>Created: {formatDate(ticket?.created_at)}</span>
        </div>
      </div>

      <div className="support-ticket-thread support-ticket-chat customer-portal-card">
        <h3 className="support-ticket-thread-title">Conversation</h3>
        <div className="support-ticket-chat-messages">
          {replies?.map((r) => {
            const isCustomer = r.author_type === 'customer';
            return (
              <div
                key={r.id}
                className={`support-ticket-chat-bubble support-ticket-chat-bubble-${r.author_type}`}
              >
                <div className="support-ticket-chat-avatar">
                  {isCustomer ? <User size={20} /> : <Headphones size={20} />}
                </div>
                <div className="support-ticket-chat-content">
                  <div className="support-ticket-chat-header">
                    <span className="support-ticket-chat-author">
                      {isCustomer ? 'You' : 'Support team'}
                    </span>
                    <span className="support-ticket-chat-date">{formatDate(r.created_at)}</span>
                  </div>
                  <div className="support-ticket-chat-body">{r.body}</div>
                </div>
              </div>
            );
          })}
        </div>

        {canReply && (
          <form onSubmit={handleSendReply} className="support-ticket-reply-form">
            {error && (
              <div className="support-ticket-error">
                <AlertCircle size={18} />
                {error}
              </div>
            )}
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Type your reply..."
              rows={3}
              className="support-ticket-textarea"
            />
            <button type="submit" disabled={sending || !replyBody.trim()} className="customer-portal-btn customer-portal-btn-primary">
              {sending ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
              {sending ? 'Sending...' : 'Send reply'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function SupportTicketsPage() {
  const navigate = useNavigate();
  const { ticketId } = useParams();
  const [view, setView] = useState(ticketId ? 'detail' : 'list');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (ticketId) {
      setView('detail');
    } else {
      setView('list');
    }
  }, [ticketId]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await listSupportTicketsApi();
      setTickets(res.data || []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'list' && !showForm) {
      loadTickets();
    }
  }, [view, showForm]);

  const handleNewTicketSuccess = () => {
    setShowForm(false);
    loadTickets();
  };

  const handleSelectTicket = (id) => {
    navigate(`/portal/support/${id}`);
  };

  const handleBack = () => {
    navigate('/portal/support');
  };

  if (showForm) {
    return (
      <div className="support-tickets-page">
        <NewTicketForm onSuccess={handleNewTicketSuccess} onCancel={() => setShowForm(false)} />
      </div>
    );
  }

  if (view === 'detail' && ticketId) {
    return (
      <div className="support-tickets-page">
        <TicketDetail ticketId={ticketId} onBack={handleBack} />
      </div>
    );
  }

  return (
    <div className="support-tickets-page">
      <TicketList
        tickets={tickets}
        loading={loading}
        onNewTicket={() => setShowForm(true)}
        onSelectTicket={handleSelectTicket}
      />
    </div>
  );
}
