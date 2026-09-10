import { useAuth } from '../context/AuthContext'
import { ROLE_LABELS } from '../lib/constants'
import toast from 'react-hot-toast'

const NAV_ITEMS = {
  helicopter: [
    { icon: '📊', label: 'لوحة التحكم', page: 'dashboard' },
    { icon: '🏢', label: 'جميع الفروع', page: 'branches' },
    { icon: '📋', label: 'جميع العملاء', page: 'leads' },
    { icon: '📈', label: 'التقارير', page: 'reports' },
    { icon: '⚙️', label: 'الإعدادات', page: 'settings' },
  ],
  branch_owner: [
    { icon: '📊', label: 'لوحة الفرع', page: 'dashboard' },
    { icon: '📋', label: 'عملاء الفرع', page: 'leads' },
    { icon: '📈', label: 'التقارير', page: 'reports' },
  ],
  rep: [
    { icon: '📋', label: 'عملائي', page: 'leads' },
    { icon: '⚠️', label: 'المتأخرة', page: 'overdue' },
    { icon: '📊', label: 'إحصائياتي', page: 'stats' },
  ],
}

export default function Sidebar({ activePage, onNavigate }) {
  const { profile, signOut, isHelicopter, isBranchOwner, isRep, branchName } = useAuth()
  const role = profile?.role
  const navItems = NAV_ITEMS[role] || []

  async function handleSignOut() {
    try {
      await signOut()
      toast.success('تم تسجيل الخروج')
    } catch {
      toast.error('حدث خطأ')
    }
  }

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '26px' }}>🚗</span>
          <div>
            <div style={{ fontWeight: '800', fontSize: '16px' }}>سكاي كلر</div>
            <div style={{ fontSize: '11px', opacity: 0.65 }}>نظام CRM</div>
          </div>
        </div>
      </div>

      {/* User info */}
      <div style={{ padding: '12px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '8px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>{profile?.name}</div>
        <div style={{ fontSize: '11px', opacity: 0.65, marginTop: '2px' }}>
          {ROLE_LABELS[role]}
          {branchName && <span> — {branchName}</span>}
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1 }}>
        {navItems.map(item => (
          <button
            key={item.page}
            className={`sidebar-nav-item ${activePage === item.page ? 'active' : ''}`}
            onClick={() => onNavigate(item.page)}
          >
            <span style={{ fontSize: '16px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Sign out */}
      <div style={{ padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button
          className="sidebar-nav-item"
          onClick={handleSignOut}
          style={{ color: 'rgba(255,100,100,0.85)' }}
        >
          <span>🚪</span>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  )
}
