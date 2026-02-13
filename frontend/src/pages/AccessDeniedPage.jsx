import { Link } from 'react-router-dom';

export default function AccessDeniedPage() {
  return (
    <div style={{ padding: 48, textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ color: '#1A7B7B', marginBottom: 12 }}>Access Denied</h1>
      <p style={{ color: '#555', marginBottom: 24 }}>
        You don&apos;t have permission to view this page.
      </p>
      <Link
        to="/"
        style={{
          display: 'inline-block',
          padding: '12px 24px',
          background: '#1A7B7B',
          color: '#fff',
          borderRadius: 10,
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        Go to dashboard
      </Link>
    </div>
  );
}
