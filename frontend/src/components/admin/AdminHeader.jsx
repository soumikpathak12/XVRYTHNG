import { LogOut, User } from 'lucide-react';

export default function AdminHeader({ user, onLogout }) {
    return (
        <header
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                height: 60,
                background: '#fff',
                borderBottom: '1px solid #E5E7EB',
                padding: '0 24px',
                gap: 16,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: '#E5F3F1',
                        color: '#146b6b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 14,
                    }}
                >
                    {user?.name ? user.name.charAt(0).toUpperCase() : <User size={16} />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1F2937' }}>
                        {user?.name || 'Admin'}
                    </span>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>
                        {user?.role ? user.role.replace('_', ' ') : 'Super Admin'}
                    </span>
                </div>
            </div>

            <div style={{ width: 1, height: 24, background: '#E5E7EB' }} />

            <button
                onClick={onLogout}
                style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#4B5563',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 500,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F3F4F6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                title="Logout"
            >
                <LogOut size={16} />
                <span>Logout</span>
            </button>
        </header>
    );
}
