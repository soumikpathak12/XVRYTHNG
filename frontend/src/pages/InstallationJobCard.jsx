/**
 * T-226/227/228/229/230/231/232/233/234/235/237/238/239
 * Installation Day Job Card — mobile-first, complete feature set.
 *
 * Includes:
 *  • Live elapsed-time timer (ticks while in_progress)
 *  • State-machine action buttons (Start / Pause / Resume / End Job)
 *  • T-239: End Job blocked until all required checklist items are checked
 *  • Checklist: grouped sections, expandable per-item notes, save state,
 *               progress bar per section + global, colour-coded completion
 *  • Customer sign-off canvas
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, CalendarDays, Clock, Users,
  CheckCircle2, Circle, ChevronDown, ChevronUp,
  PenLine, Loader2, Play, Pause, SkipForward, StopCircle,
  Timer, AlertTriangle, MessageSquare, X, ChevronRight,
  Camera, Image, Trash2, ZoomIn, MapPin as PinIcon, Plus,
} from 'lucide-react';
import {
  getInstallationJob,
  updateInstallationJobStatus,
  tickInstallationChecklist,
  submitInstallationSignoff,
  uploadInstallationPhoto,
  deleteInstallationPhoto,
  getInstallationPhotoRequirements,
} from '../services/api.js';
import InstallationJobExpensesSection from '../components/installation/InstallationJobExpensesSection.jsx';

// ─── brand tokens ────────────────────────────────────────────────────────────
const BRAND      = '#146b6b';
const BRAND_DARK = '#0f5555';
const BRAND_BG   = '#E6F4F1';

// ─── status config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  scheduled:   { label: 'Scheduled',   bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  in_progress: { label: 'In Progress', bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  paused:      { label: 'Paused',      bg: '#FEF9C3', color: '#92400E', border: '#FDE68A' },
  completed:   { label: 'Completed',   bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
};

const SECTION_LABELS = {
  pre_install:  'Pre-Installation',
  install:      'Installation',
  post_install: 'Post-Installation',
  general:      'General',
};
const SECTION_ORDER = ['pre_install', 'install', 'post_install', 'general'];

// ─────────────────────────────────────────────────────────────────────────────
// Utility – elapsed time
// ─────────────────────────────────────────────────────────────────────────────
function computeElapsedSeconds(records = [], currentStatus) {
  let total  = 0;
  let openAt = null;
  for (const r of records) {
    const ts = new Date(r.recorded_at).getTime();
    if (r.event === 'start' || r.event === 'resume') { openAt = ts; }
    else if (r.event === 'pause' || r.event === 'end') {
      if (openAt !== null) { total += (ts - openAt) / 1000; openAt = null; }
    }
  }
  if (currentStatus === 'in_progress' && openAt !== null) total += (Date.now() - openAt) / 1000;
  return Math.round(total);
}

function formatElapsed(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tiny shared atoms
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.scheduled;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px',
      borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: '0.03em',
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>{cfg.label}</span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #E5E7EB',
      borderRadius: 16, padding: '16px 18px', ...style,
    }}>{children}</div>
  );
}

function FieldLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
      {children}
    </div>
  );
}

function FieldValue({ children, style }) {
  return <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', ...style }}>{children}</div>;
}

function HR() { return <div style={{ height: 1, background: '#F3F4F6', margin: '12px 0' }} />; }

// ─────────────────────────────────────────────────────────────────────────────
// T-229 – Live elapsed timer strip
// ─────────────────────────────────────────────────────────────────────────────
function ElapsedTimer({ job }) {
  const [elapsed, setElapsed] = useState(() =>
    computeElapsedSeconds(job.timeRecords ?? [], job.status)
  );
  const tickRef = useRef(null);

  useEffect(() => {
    clearInterval(tickRef.current);
    if (job.status === 'in_progress') {
      tickRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
    } else {
      setElapsed(computeElapsedSeconds(job.timeRecords ?? [], job.status));
    }
    return () => clearInterval(tickRef.current);
  }, [job.status, job.timeRecords]);

  if (job.status === 'scheduled') return null;

  const isRunning  = job.status === 'in_progress';
  const isComplete = job.status === 'completed';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 18px',
      background: isComplete ? BRAND_BG : isRunning ? '#FFF7ED' : '#FEF9C3',
      border: `1px solid ${isComplete ? '#9FD3C7' : isRunning ? '#FED7AA' : '#FDE68A'}`,
      borderRadius: 14, marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Timer size={18}
          color={isComplete ? BRAND : isRunning ? '#C2410C' : '#92400E'}
          style={isRunning ? { animation: 'pulse 1.4s ease-in-out infinite' } : {}} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {isComplete ? 'Total Time' : isRunning ? 'Time Running' : 'Paused At'}
          </div>
          <div style={{
            fontSize: 22, fontWeight: 900, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em',
            color: isComplete ? BRAND : isRunning ? '#C2410C' : '#92400E',
          }}>{formatElapsed(elapsed)}</div>
        </div>
      </div>
      {isRunning && (
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444', animation: 'blink 1.2s step-start infinite' }} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared bottom-sheet blocker modal
// ─────────────────────────────────────────────────────────────────────────────
function BlockerModal({ title, children, ctaLabel = 'Got it', onClose }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520, margin: '0 auto',
          background: '#fff', borderRadius: '20px 20px 0 0',
          padding: '24px 20px 36px', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={22} color="#EF4444" />
            <span style={{ fontWeight: 900, fontSize: 16, color: '#111827' }}>{title}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="#9CA3AF" />
          </button>
        </div>
        {children}
        <button onClick={onClose} style={{ marginTop: 16, width: '100%', padding: 13, borderRadius: 12, background: BRAND, color: '#fff', border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// T-230/232 – Action buttons
// T-239     – End Job blocked: checklist required items + photos + signature
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_ACTIONS = {
  scheduled:   [{ to: 'in_progress', label: 'Start Job', Icon: Play,        bg: BRAND,     needsEndValidation: false }],
  in_progress: [
    { to: 'paused',    label: 'Pause',   Icon: Pause,       bg: '#D97706', needsEndValidation: false },
    { to: 'completed', label: 'End Job', Icon: StopCircle,  bg: '#DC2626', needsEndValidation: true  },
  ],
  paused:      [
    { to: 'in_progress', label: 'Resume',  Icon: SkipForward, bg: BRAND,     needsEndValidation: false },
    { to: 'completed',   label: 'End Job', Icon: StopCircle,  bg: '#DC2626', needsEndValidation: true  },
  ],
  completed: [],
};

function ActionButtons({ job, checklist, photos, photoRequirements, onAction, busy }) {
  const [blocker, setBlocker] = useState(null); // { type, content }
  const actions = STATUS_ACTIONS[job.status] ?? [];
  if (!actions.length) return null;

  const requiredUnchecked = (checklist ?? []).filter(i => i.is_required && !i.checked);

  const getMissingPhotos = () => {
    const missing = [];
    const reqs = photoRequirements ?? {};
    ['before', 'during', 'after'].forEach(sec => {
      const req = reqs[sec];
      if (!req?.is_required) return;
      const count = (photos ?? []).filter(p => p.section === sec).length;
      if (count < (req.min_count ?? 1)) {
        missing.push({ section: sec, have: count, need: req.min_count ?? 1 });
      }
    });
    return missing;
  };

  const handleClick = (action) => {
    if (!action.needsEndValidation) { onAction(action.to); return; }

    // 1. Checklist
    if (requiredUnchecked.length > 0) {
      setBlocker({
        title: `${requiredUnchecked.length} Checklist Item${requiredUnchecked.length > 1 ? 's' : ''} Incomplete`,
        content: (
          <>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 12 }}>
              All required checklist items must be ticked before ending the job.
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              {requiredUnchecked.map(it => (
                <div key={it.item_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <Circle size={15} color="#EF4444" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{it.label}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{SECTION_LABELS[it.section] ?? it.section}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ),
        cta: 'Complete Checklist',
      });
      return;
    }

    // 2. Photos
    const missingPhotos = getMissingPhotos();
    if (missingPhotos.length > 0) {
      setBlocker({
        title: 'Photos Required',
        content: (
          <>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 12 }}>
              At least one photo is required in each tab before ending the job.
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              {missingPhotos.map(m => (
                <div key={m.section} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                  <Camera size={15} color="#D97706" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', textTransform: 'capitalize' }}>{m.section} photos</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{m.have} of {m.need} required</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ),
        cta: 'Add Photos',
      });
      return;
    }

    // 3. Signature (T-251)
    if (!job.signoff) {
      setBlocker({
        title: 'Customer Signature Required',
        content: (
          <p style={{ fontSize: 14, color: '#6B7280' }}>
            The customer must sign off before you can end the job. Please scroll down to the sign-off section.
          </p>
        ),
        cta: 'Go to Sign-Off',
      });
      return;
    }

    onAction(action.to);
  };

  const blockerCount = requiredUnchecked.length + getMissingPhotos().length + (job.signoff ? 0 : 1);
  const isEndAction = (action) => action.needsEndValidation;

  return (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        {actions.map(action => {
          const { to, label, Icon, bg } = action;
          const showBadge = isEndAction(action) && blockerCount > 0;
          return (
            <button
              key={to}
              disabled={busy}
              onClick={() => handleClick(action)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '13px 8px',
                background: busy ? '#9CA3AF' : bg,
                color: '#fff', border: 'none', borderRadius: 14,
                fontWeight: 800, fontSize: 14,
                cursor: busy ? 'not-allowed' : 'pointer',
                boxShadow: busy ? 'none' : `0 2px 8px ${bg}55`,
                position: 'relative',
              }}
            >
              {busy ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Icon size={16} strokeWidth={2.5} />}
              {label}
              {showBadge && !busy && (
                <span style={{
                  position: 'absolute', top: -6, right: -6,
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#FEF9C3', border: '2px solid #F59E0B',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 900, color: '#92400E',
                }}>{blockerCount}</span>
              )}
            </button>
          );
        })}
      </div>
      {blocker && (
        <BlockerModal title={blocker.title} ctaLabel={blocker.cta} onClose={() => setBlocker(null)}>
          {blocker.content}
        </BlockerModal>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// T-245/246/247/248 – Photo section (tabbed: Before / During / After)
// ─────────────────────────────────────────────────────────────────────────────
const PHOTO_TABS = [
  { key: 'before', label: 'Before',  color: '#1D4ED8' },
  { key: 'during', label: 'During',  color: '#C2410C' },
  { key: 'after',  label: 'After',   color: '#15803D' },
];

function PhotoSection({ jobId, photos: initialPhotos, photoRequirements, disabled, onPhotosChange }) {
  const [activeTab,  setActiveTab]  = useState('before');
  const [photos,     setPhotos]     = useState(initialPhotos ?? []);
  const [uploading,  setUploading]  = useState(false);
  const [lightbox,   setLightbox]   = useState(null); // photo object
  const [gpsStatus,  setGpsStatus]  = useState('idle'); // idle | fetching | ok | denied
  const fileInputRef = useRef(null);

  // Keep in sync when parent reloads job
  useEffect(() => { setPhotos(initialPhotos ?? []); }, [initialPhotos]);
  useEffect(() => { onPhotosChange?.(photos); }, [photos, onPhotosChange]);

  // Make the UX less confusing: auto-focus the first required tab that is still missing photos.
  useEffect(() => {
    if (!photoRequirements) return;
    const pick = ['before', 'during', 'after'].find((k) => {
      const req = photoRequirements?.[k];
      if (!req?.is_required) return false;
      const count = (photos || []).filter((p) => p.section === k).length;
      return count < (req.min_count ?? 1);
    });
    if (pick && pick !== activeTab) setActiveTab(pick);
  }, [photoRequirements, photos]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabPhotos = photos.filter(p => p.section === activeTab);
  const tab       = PHOTO_TABS.find(t => t.key === activeTab);
  const req       = photoRequirements?.[activeTab];
  const meetsReq  = !req?.is_required || tabPhotos.length >= (req?.min_count ?? 1);
  const nextTabKey = (() => {
    const idx = PHOTO_TABS.findIndex((t) => t.key === activeTab);
    if (idx === -1) return null;
    return PHOTO_TABS[idx + 1]?.key ?? null;
  })();
  const nextTab = nextTabKey ? PHOTO_TABS.find((t) => t.key === nextTabKey) : null;

  // T-247 – GPS capture
  const getGps = () => new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return; }
    setGpsStatus('fetching');
    navigator.geolocation.getCurrentPosition(
      pos => { setGpsStatus('ok'); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      ()  => { setGpsStatus('denied'); resolve(null); },
      { timeout: 5000, maximumAge: 60000 }
    );
  });

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);

    // Grab GPS once for the batch
    const gps = await getGps();

    for (const file of files) {
      const fd = new FormData();
      fd.append('section',  activeTab);
      fd.append('photo',    file);
      fd.append('taken_at', new Date().toISOString());
      if (gps) { fd.append('lat', gps.lat); fd.append('lng', gps.lng); }

      try {
        const res = await uploadInstallationPhoto(jobId, fd);
        if (res?.data) {
          setPhotos(prev => [...prev, res.data]);
        }
      } catch (_) { /* individual failure, continue */ }
    }

    setUploading(false);
    e.target.value = '';
  };

  const handleDelete = async (photo) => {
    if (!window.confirm('Delete this photo?')) return;
    try {
      await deleteInstallationPhoto(jobId, photo.id);
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
    } catch (e) { alert(e?.message ?? 'Delete failed'); }
  };

  const withGeneralFallback = (e) => {
    const current = e.currentTarget?.getAttribute('src') ?? '';
    if (!current || e.currentTarget?.dataset?.fallbackTried === '1') return;
    if (!/\/(before|during|after)\//.test(current)) return;
    const fallback = current.replace(/\/(before|during|after)\//, '/general/');
    e.currentTarget.dataset.fallbackTried = '1';
    e.currentTarget.src = fallback;
  };

  return (
    <Card style={{ marginBottom: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontWeight: 900, fontSize: 15, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Camera size={18} color={BRAND} /> Photos
        </div>
        <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>{photos.length} total</div>
      </div>

      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>
        Upload photos into the correct tab (Before / During / After). The “Add Photo” button uploads into the <b>{tab?.label}</b> tab.
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, background: '#F3F4F6', borderRadius: 12, padding: 4 }}>
        {PHOTO_TABS.map(t => {
          const count = photos.filter(p => p.section === t.key).length;
          const req2  = photoRequirements?.[t.key];
          const ok    = !req2?.is_required || count >= (req2?.min_count ?? 1);
          const isActive = activeTab === t.key;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              flex: 1, padding: '8px 4px',
              background: isActive ? '#fff' : 'transparent',
              border: 'none', borderRadius: 9,
              fontWeight: isActive ? 800 : 600,
              fontSize: 13,
              color: isActive ? t.color : '#6B7280',
              cursor: 'pointer',
              boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
              {t.label}
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: ok ? '#16A34A' : req2?.is_required ? '#EF4444' : '#9CA3AF',
              }}>
                {count}{req2?.is_required ? `/${req2.min_count ?? 1}` : ''}
              </span>
            </button>
          );
        })}
      </div>

      {/* Required badge */}
      {req?.is_required && !meetsReq && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', marginBottom: 12 }}>
          <AlertTriangle size={13} color="#EF4444" />
          <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>
            {tabPhotos.length}/{req.min_count} required — add {req.min_count - tabPhotos.length} more
          </span>
        </div>
      )}

      {/* Next hint (only when current required is satisfied) */}
      {req?.is_required && meetsReq && nextTab ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 10,
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 12, color: '#065F46', fontWeight: 700 }}>
            Done with <span style={{ color: tab?.color || BRAND }}>{tab?.label}</span>. Next: <span style={{ color: nextTab.color }}>{nextTab.label}</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab(nextTab.key)}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              background: BRAND,
              color: '#fff',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      ) : null}

      {/* Gallery grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, marginBottom: 12 }}>
        {tabPhotos.map(photo => (
          <div key={photo.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: '#F3F4F6' }}>
            <img
              src={photo.storage_url}
              alt={photo.caption ?? `${activeTab} photo`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'pointer' }}
              onClick={() => setLightbox(photo)}
              onError={withGeneralFallback}
              loading="lazy"
            />
            {/* Timestamp overlay */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '14px 6px 4px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)',
              fontSize: 9, color: 'rgba(255,255,255,0.9)', fontWeight: 600,
            }}>
              {photo.taken_at
                ? new Date(photo.taken_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
                : new Date(photo.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
              }
              {photo.lat && <span> · GPS</span>}
            </div>
            {/* Actions */}
            <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 3 }}>
              <button onClick={() => setLightbox(photo)} style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(0,0,0,0.45)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ZoomIn size={12} color="#fff" />
              </button>
              {!disabled && (
                <button onClick={() => handleDelete(photo)} style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(220,38,38,0.75)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={12} color="#fff" />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Upload tile */}
        {!disabled && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              aspectRatio: '1', borderRadius: 10,
              border: `2px dashed ${uploading ? '#9CA3AF' : BRAND}`,
              background: uploading ? '#F9FAFB' : BRAND_BG,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              cursor: uploading ? 'not-allowed' : 'pointer',
            }}
          >
            {uploading
              ? <Loader2 size={20} color="#9CA3AF" style={{ animation: 'spin 1s linear infinite' }} />
              : <Plus size={20} color={BRAND} strokeWidth={2.5} />
            }
            <span style={{ fontSize: 11, fontWeight: 700, color: uploading ? '#9CA3AF' : BRAND }}>
              {uploading ? 'Uploading…' : 'Add Photo'}
            </span>
            <span style={{ fontSize: 10, fontWeight: 800, color: tab?.color || BRAND, marginTop: 2 }}>
              to {tab?.label}
            </span>
          </button>
        )}
      </div>

      {/* GPS indicator */}
      {gpsStatus === 'fetching' && (
        <div style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Getting GPS location…
        </div>
      )}
      {gpsStatus === 'ok' && (
        <div style={{ fontSize: 12, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 5 }}>
          <PinIcon size={12} /> GPS tagged
        </div>
      )}
      {gpsStatus === 'denied' && (
        <div style={{ fontSize: 12, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 5 }}>
          <PinIcon size={12} /> No GPS (location denied)
        </div>
      )}

      {/* Hidden file input — accept images, capture camera on mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Lightbox */}
      {lightbox && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} color="#fff" />
          </button>
          <img
            src={lightbox.storage_url}
            alt=""
            style={{ maxWidth: '95vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 10 }}
            onClick={e => e.stopPropagation()}
            onError={withGeneralFallback}
          />
          <div style={{ marginTop: 14, textAlign: 'center' }}>
            {lightbox.caption && <div style={{ color: '#fff', fontSize: 14, marginBottom: 6 }}>{lightbox.caption}</div>}
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span>{lightbox.taken_at ? new Date(lightbox.taken_at).toLocaleString('en-AU') : new Date(lightbox.created_at).toLocaleString('en-AU')}</span>
              {lightbox.lat && lightbox.lng && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <PinIcon size={11} /> {Number(lightbox.lat).toFixed(5)}, {Number(lightbox.lng).toFixed(5)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// T-235/237/238 – Checklist item (expandable note editor)
// ─────────────────────────────────────────────────────────────────────────────
function ChecklistItem({ item, onTick, disabled }) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [draftNote, setDraftNote] = useState(item.note ?? '');
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    if (saving || disabled) return;
    setSaving(true);
    try { await onTick(item.item_id, !item.checked, item.checked ? '' : draftNote || null); }
    finally { setSaving(false); }
  };

  const saveNote = async () => {
    setSaving(true);
    try { await onTick(item.item_id, item.checked, draftNote || null); setNoteOpen(false); }
    finally { setSaving(false); }
  };

  const isChecked = !!item.checked;

  return (
    <div style={{ borderBottom: '1px solid #F3F4F6' }}>
      {/* Row */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 0',
        cursor: disabled ? 'default' : 'pointer',
        opacity: saving ? 0.55 : 1, transition: 'opacity 0.12s',
      }}
        onClick={toggle}
      >
        {isChecked
          ? <CheckCircle2 size={22} color={BRAND}   strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 1 }} />
          : <Circle       size={22} color="#D1D5DB" strokeWidth={2}   style={{ flexShrink: 0, marginTop: 1 }} />
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: isChecked ? 500 : 600,
            color: isChecked ? '#9CA3AF' : '#111827',
            textDecoration: isChecked ? 'line-through' : 'none',
            lineHeight: 1.35,
          }}>
            {item.label}
            {item.is_required && !isChecked && (
              <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, color: '#EF4444',
                background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 4, padding: '1px 5px' }}>
                REQ
              </span>
            )}
          </div>
          {/* checked meta */}
          {isChecked && item.checked_at && (
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
              ✓ {new Date(item.checked_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          {/* existing note preview */}
          {item.note && !noteOpen && (
            <div
              style={{
                marginTop: 6,
                padding: '8px 10px',
                borderRadius: 10,
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                fontSize: 12,
                color: '#334155',
                lineHeight: 1.35,
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
              }}
            >
              <span style={{ color: BRAND, fontWeight: 900, marginTop: 1 }}>Note</span>
              <span style={{ whiteSpace: 'pre-wrap' }}>{item.note}</span>
            </div>
          )}
        </div>
        {/* note toggle button */}
        {!disabled && (
          <button
            onClick={e => { e.stopPropagation(); setNoteOpen(v => !v); }}
            title="Add note"
            style={{
              flexShrink: 0,
              width: 30,
              height: 30,
              borderRadius: 10,
              border: '1px solid #E2E8F0',
              background: item.note ? '#ECFDF5' : '#F8FAFC',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: item.note ? BRAND : '#64748B',
            }}
          >
            <MessageSquare size={15} />
          </button>
        )}
      </div>

      {/* Inline note editor */}
      {noteOpen && (
        <div style={{ paddingBottom: 12, paddingLeft: 34 }}
          onClick={e => e.stopPropagation()}
        >
          <textarea
            value={draftNote}
            onChange={e => setDraftNote(e.target.value)}
            placeholder="Add a note for this item…"
            rows={2}
            style={{
              width: '100%', boxSizing: 'border-box',
              border: '1.5px solid #D1D5DB', borderRadius: 10,
              padding: '8px 10px', fontSize: 13, resize: 'vertical',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button
              onClick={saveNote} disabled={saving}
              style={{
                padding: '6px 14px', borderRadius: 8, background: BRAND, color: '#fff',
                border: 'none', fontWeight: 700, fontSize: 12, cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? '…' : 'Save'}
            </button>
            <button
              onClick={() => { setDraftNote(item.note ?? ''); setNoteOpen(false); }}
              style={{ padding: '6px 14px', borderRadius: 8, background: '#F3F4F6', color: '#6B7280', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// T-235 – Checklist section (collapsible, with section progress bar)
// ─────────────────────────────────────────────────────────────────────────────
function ChecklistSection({ section, items, onTick, disabled, initialOpen = true }) {
  const [open, setOpen] = useState(initialOpen);
  const total    = items.length;
  const done     = items.filter(i => i.checked).length;
  const pct      = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone  = done === total;
  const hasReq   = items.some(i => i.is_required && !i.checked);

  return (
    <div style={{
      border: `1px solid ${hasReq ? '#FECACA' : allDone ? '#BBF7D0' : '#E5E7EB'}`,
      borderRadius: 14, overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 8,
          padding: '13px 16px',
          background: open ? BRAND_BG : '#F9FAFB',
          border: 'none', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {allDone
            ? <CheckCircle2 size={18} color="#16A34A" strokeWidth={2.5} />
            : hasReq
            ? <AlertTriangle size={18} color="#EF4444" strokeWidth={2.5} />
            : <ChevronRight size={18} color={BRAND} />
          }
          <span style={{ fontWeight: 800, fontSize: 14, color: allDone ? '#16A34A' : BRAND }}>
            {SECTION_LABELS[section] ?? section}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 12, fontWeight: 700,
            color: allDone ? '#16A34A' : hasReq ? '#EF4444' : BRAND,
          }}>{done}/{total}</span>
          {open ? <ChevronUp size={16} color={BRAND} /> : <ChevronDown size={16} color="#6B7280" />}
        </div>
      </button>

      {/* Section progress bar (always visible) */}
      <div style={{ height: 3, background: '#E5E7EB' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: allDone ? '#16A34A' : hasReq ? '#EF4444' : BRAND,
          transition: 'width 0.35s ease, background 0.3s ease',
        }} />
      </div>

      {/* Items */}
      {open && (
        <div style={{ padding: '4px 16px 4px' }}>
          {items.map(item => (
            <ChecklistItem
              key={item.item_id}
              item={item}
              onTick={onTick}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// T-238 – Global checklist progress header
// ─────────────────────────────────────────────────────────────────────────────
function ChecklistProgress({ checklist }) {
  const total    = checklist.length;
  const done     = checklist.filter(i => i.checked).length;
  const reqLeft  = checklist.filter(i => i.is_required && !i.checked).length;
  const pct      = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone  = done === total;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 15, color: '#111827' }}>Checklist</div>
          {reqLeft > 0 && (
            <div style={{ fontSize: 12, color: '#EF4444', fontWeight: 600, marginTop: 2 }}>
              {reqLeft} required item{reqLeft > 1 ? 's' : ''} remaining
            </div>
          )}
        </div>
        <div style={{
          fontSize: 26, fontWeight: 900, fontVariantNumeric: 'tabular-nums',
          color: allDone ? '#16A34A' : reqLeft > 0 ? '#EF4444' : BRAND,
        }}>
          {pct}%
        </div>
      </div>

      {/* Segmented track */}
      <div style={{ height: 8, background: '#E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: allDone ? '#16A34A' : reqLeft > 0 ? `linear-gradient(90deg, ${BRAND} 0%, #EF4444 100%)` : BRAND,
          borderRadius: 10,
          transition: 'width 0.4s ease, background 0.3s ease',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>
        <span>{done} of {total} completed</span>
        {allDone && <span style={{ color: '#16A34A', fontWeight: 700 }}>✓ All done!</span>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// T-249/250/251 – Customer sign-off panel (with confirmation statement)
// ─────────────────────────────────────────────────────────────────────────────
function SignoffPanel({ job, onSignoff }) {
  const [name, setName]         = useState(job.customer_name ?? '');
  const [notes, setNotes]       = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [done, setDone]         = useState(!!job.signoff);
  const canvasRef = useRef(null);
  const drawing   = useRef(false);
  const dprRef    = useRef(1);

  const ensureCanvasHiDpi = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Draw using CSS pixel coordinates.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2.5;
  }, []);

  useEffect(() => {
    ensureCanvasHiDpi();
    const onResize = () => ensureCanvasHiDpi();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [ensureCanvasHiDpi]);

  const pt = e => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0];
    const t = e.touches?.[0] ?? e.changedTouches?.[0] ?? e;
    if (!t) return [0, 0];
    const r = canvas.getBoundingClientRect();
    return [t.clientX - r.left, t.clientY - r.top]; // CSS px (ctx is scaled to dpr)
  };
  const startDraw = e => {
    drawing.current = true;
    ensureCanvasHiDpi();
    const ctx = canvasRef.current.getContext('2d');
    const [x, y] = pt(e);
    ctx.beginPath(); ctx.moveTo(x, y);
  };
  const draw = e => {
    if (!drawing.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const [x, y] = pt(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const endDraw = () => { drawing.current = false; };
  const clear   = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const r = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);
  };

  const generateSignatureFromName = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ensureCanvasHiDpi();
    const r = canvas.getBoundingClientRect();
    const text = String(name || job.customer_name || '').trim();
    if (!text) return;
    clear();
    ctx.fillStyle = '#111827';
    const baseSize = 44;
    ctx.font = `${baseSize}px "Pacifico", "Segoe Script", "Brush Script MT", "Comic Sans MS", cursive`;
    const padX = 16;
    const maxW = Math.max(10, r.width - padX * 2);
    const m = ctx.measureText(text);
    const scale = m.width > maxW ? maxW / m.width : 1;
    const size = Math.max(18, Math.floor(baseSize * scale));
    ctx.font = `${size}px "Pacifico", "Segoe Script", "Brush Script MT", "Comic Sans MS", cursive`;
    const y = Math.round(r.height / 2 + size / 2.6);
    ctx.fillText(text, padX, y);
  };

  const canSubmit = name.trim() && confirmed && !saving;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const sig = canvasRef.current?.toDataURL('image/png') ?? null;
      await onSignoff({ customer_name: name, signature_url: sig, notes });
      setDone(true);
    } catch (e) { alert(e?.message ?? 'Sign-off failed'); }
    finally { setSaving(false); }
  };

  if (done || job.signoff) {
    return (
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CheckCircle2 size={30} color="#16A34A" strokeWidth={2.5} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#16A34A' }}>Customer Signed Off</div>
            <div style={{ fontSize: 13, color: '#6B7280' }}>
              {job.signoff?.customer_name ?? name}
              {job.signoff?.signed_at ? ` · ${new Date(job.signoff.signed_at).toLocaleDateString('en-AU')}` : ''}
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4, fontStyle: 'italic' }}>
              "I confirm the system has been installed and is in working condition"
            </div>
          </div>
        </div>
        {job.signoff?.signature_url && (
          <div style={{ marginTop: 14, borderTop: '1px solid #F3F4F6', paddingTop: 14 }}>
            <FieldLabel>Signature</FieldLabel>
            <img src={job.signoff.signature_url} alt="Customer signature" style={{ maxWidth: 240, height: 'auto', borderRadius: 8, border: '1px solid #E5E7EB', marginTop: 4 }} />
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ fontWeight: 800, fontSize: 15, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <PenLine size={18} color={BRAND} /> Customer Sign-Off
        {/* T-251 required badge */}
        <span style={{ fontSize: 10, fontWeight: 800, color: '#EF4444', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 4, padding: '2px 6px', marginLeft: 'auto' }}>
          REQUIRED
        </span>
      </div>

      {/* T-249 – Confirmation statement */}
      <div style={{
        padding: '14px 16px', borderRadius: 12,
        background: BRAND_BG, border: `1.5px solid ${BRAND}33`,
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: BRAND_DARK, lineHeight: 1.5, fontStyle: 'italic' }}>
          "I confirm the system has been installed and is in working condition."
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <FieldLabel>Customer name</FieldLabel>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
            style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 10, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
        </div>

        <div>
          <FieldLabel>Signature</FieldLabel>
          <canvas
            ref={canvasRef}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
            style={{
              border: '1.5px dashed #D1D5DB', borderRadius: 10, background: '#FAFAFA',
              display: 'block', width: '100%', height: 140,
              cursor: 'crosshair', touchAction: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
            <button
              onClick={clear}
              type="button"
              style={{
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 700,
                color: '#FAFAFA',
                background: BRAND,
                border: '1px solid #D1D5DB',
                borderRadius: 10,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Clear signature
            </button>
            <button
              onClick={generateSignatureFromName}
              type="button"
              style={{
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 800,
                color: '#0F172A',
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: 10,
                cursor: 'pointer',
              }}
              title="Generate a signature from customer name"
            >
              Generate from name
            </button>
          </div>
        </div>

        {/* Confirmation checkbox */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
            style={{ marginTop: 2, accentColor: BRAND, width: 16, height: 16, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
            Customer confirms the system has been installed and is in working condition
          </span>
        </label>

        <div>
          <FieldLabel>Notes (optional)</FieldLabel>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="Any additional notes from the customer…"
            style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: 10, padding: '9px 12px', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />
        </div>

        <button onClick={submit} disabled={!canSubmit}
          style={{
            padding: 13, background: !canSubmit ? '#9CA3AF' : BRAND,
            color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 14,
            cursor: !canSubmit ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
          {saving ? 'Submitting…' : 'Submit Sign-Off'}
        </button>

        {!confirmed && (
          <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: -4 }}>
            Customer must check the confirmation box above to proceed
          </div>
        )}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────────────────────────────────────
export default function InstallationJobCard() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [job,               setJob]               = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState('');
  const [actionBusy,        setActionBusy]        = useState(false);
  const [photoRequirements, setPhotoRequirements] = useState(null);
  // Local photo list (kept in sync with job.photos but also updated on upload/delete without full reload)
  const [localPhotos,       setLocalPhotos]       = useState([]);
  const syncingRef = useRef(false);

  // Load job + photo requirements in parallel
  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      getInstallationJob(id),
      getInstallationPhotoRequirements(),
    ])
      .then(([jobRes, reqRes]) => {
        if (!alive) return;
        setJob(jobRes.data);
        setLocalPhotos(jobRes.data?.photos ?? []);
        setPhotoRequirements(reqRes?.data ?? null);
      })
      .catch(e  => alive && setError(e?.message ?? 'Failed to load job'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id]);

  // Keep multi-device timer/status in sync without requiring manual refresh.
  useEffect(() => {
    if (!job || !['in_progress', 'paused'].includes(job.status)) return undefined;
    let alive = true;
    const intervalId = setInterval(async () => {
      if (!alive || syncingRef.current) return;
      syncingRef.current = true;
      try {
        const res = await getInstallationJob(id);
        if (!alive || !res?.data) return;
        setJob(res.data);
        setLocalPhotos(res.data?.photos ?? []);
      } catch (_) {
        // Silent background sync; user actions already surface explicit errors.
      } finally {
        syncingRef.current = false;
      }
    }, 2000);
    return () => {
      alive = false;
      clearInterval(intervalId);
    };
  }, [id, job?.status]);

  // Status action → T-230/231
  const handleAction = useCallback(async (toStatus) => {
    setActionBusy(true);
    try {
      const res = await updateInstallationJobStatus(id, toStatus);
      setJob(res.data);
    } catch (e) {
      alert(e?.message ?? 'Failed to update status');
    } finally { setActionBusy(false); }
  }, [id]);

  // Checklist tick → T-237
  const handleTick = useCallback(async (itemId, checked, note) => {
    const res = await tickInstallationChecklist(id, itemId, { checked, note });
    setJob(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        checklist: prev.checklist.map(i =>
          i.item_id === (res.data.item_id ?? Number(itemId))
            ? { ...i, checked: res.data.checked, note: res.data.note, checked_at: res.data.checked_at }
            : i
        ),
      };
    });
  }, [id]);

  // Sign-off
  const handleSignoff = useCallback(async (payload) => {
    const res = await submitInstallationSignoff(id, payload);
    setJob(res.data);
  }, [id]);

  // ── Render states ──────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <Loader2 size={36} color={BRAND} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );
  if (error) return (
    <div style={{ padding: 28, textAlign: 'center', color: '#EF4444', fontWeight: 600, fontSize: 15 }}>{error}</div>
  );
  if (!job) return null;

  // Group checklist by section
  const sections = {};
  const hasBattery = /battery/i.test(String(job.system_type || '')) || !!job.battery_included;
  (job.checklist ?? []).forEach(item => {
    // Hide battery-only checklist items/sections when system has no battery.
    if (!hasBattery) {
      const secKey = String(item.section || '').toLowerCase();
      const label = String(item.label || '').toLowerCase();
      if (secKey.includes('battery') || label.includes('battery')) return;
    }
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  });
  const orderedSections = [
    ...SECTION_ORDER.filter(s => sections[s]),
    ...Object.keys(sections).filter(s => !SECTION_ORDER.includes(s)),
  ];

  const isCompleted = job.status === 'completed';
  const showSignoff = job.status === 'completed' || job.status === 'in_progress';

  return (
    <div style={{
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      margin: 0,
      padding: '12px 16px 64px',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>

      {/* Back */}
      <button onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: BRAND, fontWeight: 700, fontSize: 14, cursor: 'pointer', padding: '8px 0 16px', marginLeft: -4 }}>
        <ArrowLeft size={18} /> Back
      </button>

      {/* Header card */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 21, fontWeight: 900, color: '#111827', lineHeight: 1.2 }}>{job.customer_name}</div>
            {(job.address || job.suburb) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, color: '#6B7280', fontSize: 13 }}>
                <MapPin size={14} color={BRAND} />
                {[job.address, job.suburb].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
          <StatusBadge status={job.status} />
        </div>
        <HR />
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {job.scheduled_date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#374151', fontSize: 13, fontWeight: 600 }}>
              <CalendarDays size={15} color={BRAND} />
              {new Date(job.scheduled_date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          )}
          {job.scheduled_time && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#374151', fontSize: 13, fontWeight: 600 }}>
              <Clock size={15} color={BRAND} />
              {job.scheduled_time}{job.estimated_hours ? ` (est. ${job.estimated_hours}h)` : ''}
            </div>
          )}
        </div>
        {(job.assignees ?? []).length > 0 && (
          <>
            <HR />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Users size={16} color={BRAND} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <FieldLabel>Team</FieldLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {job.assignees.map(a => (
                    <span key={a.id} style={{ padding: '3px 10px', borderRadius: 20, background: BRAND_BG, color: BRAND, fontSize: 13, fontWeight: 600 }}>
                      {a.first_name} {a.last_name}
                      {a.install_role ? ` · ${a.install_role.replace(/_/g, ' ')}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Live Timer */}
      <ElapsedTimer job={job} />

      {/* Action buttons */}
      <ActionButtons
        job={job}
        checklist={job.checklist}
        photos={localPhotos}
        photoRequirements={photoRequirements}
        onAction={handleAction}
        busy={actionBusy}
      />

      {/* System specs */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: '#111827', marginBottom: 10 }}>System Specs</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px 16px' }}>
          {job.system_size_kw && <div><FieldLabel>System size</FieldLabel><FieldValue>{job.system_size_kw} kW</FieldValue></div>}
          {job.system_type    && <div><FieldLabel>Type</FieldLabel><FieldValue>{job.system_type}</FieldValue></div>}
          {job.panel_count    && <div><FieldLabel>Panels</FieldLabel><FieldValue>{job.panel_count}</FieldValue></div>}
          {job.inverter_model && <div><FieldLabel>Inverter</FieldLabel><FieldValue style={{ fontSize: 13 }}>{job.inverter_model}</FieldValue></div>}
          <div>
            <FieldLabel>Battery</FieldLabel>
            <FieldValue style={{ color: job.battery_included ? '#16A34A' : '#6B7280' }}>
              {job.battery_included ? 'Included' : 'No'}
            </FieldValue>
          </div>
        </div>
        {job.notes && (<><HR /><div><FieldLabel>Notes</FieldLabel><div style={{ fontSize: 14, color: '#374151' }}>{job.notes}</div></div></>)}
      </Card>

      {/* Job-linked expenses (same approval flow as HR → Approvals → Expense) */}
      <InstallationJobExpensesSection jobId={Number(id)} />

      {/* Checklist — T-235/237/238 */}
      {(job.checklist ?? []).length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <ChecklistProgress checklist={job.checklist} />
          <div style={{ display: 'grid', gap: 10 }}>
            {orderedSections.map((sec, idx) => (
              <ChecklistSection
                key={sec}
                section={sec}
                items={sections[sec]}
                onTick={handleTick}
                disabled={isCompleted}
                initialOpen={idx === 0}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Photos — T-245/246/247/248 */}
      {job.status !== 'scheduled' && (
        <PhotoSection
          jobId={id}
          photos={localPhotos}
          photoRequirements={photoRequirements}
          disabled={isCompleted}
          onPhotosChange={setLocalPhotos}
        />
      )}

      {/* Customer sign-off — T-249/250/251 */}
      {showSignoff && <SignoffPanel job={job} onSignoff={handleSignoff} />}

      {/* Global keyframes */}
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
