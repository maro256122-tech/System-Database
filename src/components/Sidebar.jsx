import { useAuth } from '../context/AuthContext'
import { ROLE_LABELS } from '../lib/constants'
import toast from 'react-hot-toast'

const NAV_ITEMS = {
  helicopter: [
    { icon: '◼', label: 'لوحة التحكم', page: 'dashboard', emoji: '📊' },
    { icon: '◼', label: 'جميع الفروع', page: 'branches', emoji: '🏢' },
    { icon: '◼', label: 'جميع العملاء', page: 'leads', emoji: '📋' },
    { icon: '◼', label: 'الحسابات', page: 'financial', emoji: '💰' },
    { icon: '◼', label: 'التقارير', page: 'reports', emoji: '📈' },
    { icon: '◼', label: 'الإعدادات', page: 'settings', emoji: '⚙️' },
  ],
  branch_owner: [
    { icon: '◼', label: 'لوحة الفرع', page: 'dashboard', emoji: '📊' },
    { icon: '◼', label: 'عملاء الفرع', page: 'leads', emoji: '📋' },
    { icon: '◼', label: 'الحسابات', page: 'financial', emoji: '💰' },
    { icon: '◼', label: 'التقارير', page: 'reports', emoji: '📈' },
  ],
  rep: [
    { icon: '◼', label: 'عملائي', page: 'leads', emoji: '📋' },
    { icon: '◼', label: 'المتأخرة', page: 'overdue', emoji: '⚠️' },
    { icon: '◼', label: 'إحصائياتي', page: 'stats', emoji: '📊' },
  ],
}

const ROLE_BADGE = {
  helicopter: { label: 'إدارة عليا', color: '#f59e0b' },
  branch_owner: { label: 'مدير فرع', color: '#22c55e' },
  rep: { label: 'مندوب مبيعات', color: '#60a5fa' },
}

export default function Sidebar({ activePage, onNavigate }) {
  const { profile, signOut, branchName } = useAuth()
  const role = profile?.role
  const navItems = NAV_ITEMS[role] || []
  const roleMeta = ROLE_BADGE[role] || {}

  async function handleSignOut() {
    try {
      await signOut()
      toast.success('تم تسجيل الخروج')
    } catch {
      toast.error('حدث خطأ')
    }
  }

  const initials = profile?.name
    ? profile.name.split(' ').slice(0, 2).map(w => w[0]).join('')
    : '?'

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', flexShrink: 0,
            boxShadow: '0 4px 12px rgba(37,99,235,0.4)',
          }}>🚗</div>
          <div>
            <div className="sidebar-logo-title">Warcha Pro</div>
            <div className="sidebar-logo-sub">نظام إدارة العملاء</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, paddingTop: '4px' }}>
        <div className="sidebar-section-label">القائمة الرئيسية</div>
        {navItems.map(item => (
          <button
            key={item.page}
            className={`sidebar-nav-item${activePage === item.page ? ' active' : ''}`}
            onClick={() => onNavigate(item.page)}
          >
            <span className="nav-icon">{item.emoji}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User + logout */}
      <div className="sidebar-footer">
        <div className="sidebar-user" style={{ marginBottom: '12px' }}>
          <div className="sidebar-avatar">{initials}</div>
          <div style={{ overflow: 'hidden' }}>
            <div className="sidebar-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.name || '—'}
            </div>
            <div className="sidebar-user-role">
              <span style={{
                display: 'inline-block',
                width: '6px', height: '6px', borderRadius: '50%',
                background: roleMeta.color || '#94a3b8',
                marginLeft: '4px', verticalAlign: 'middle',
              }} />
              {roleMeta.label}
              {branchName && ` · ${branchName}`}
            </div>
          </div>
        </div>

        <button
          className="sidebar-nav-item"
          onClick={handleSignOut}
          style={{ color: 'rgba(248,113,113,0.85)', padding: '9px 12px', borderRadius: '8px' }}
        >
          <span className="nav-icon">🚪</span>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  )
}
