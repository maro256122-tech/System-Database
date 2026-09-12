import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useDashboardData } from '../hooks/useDashboard'
import { useLeads } from '../hooks/useLeads'
import { supabase } from '../lib/supabase'
import { useEffect } from 'react'
import { STAGES } from '../lib/constants'
import AddLeadModal from '../components/AddLeadModal'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

// ── Palette ──────────────────────────────────────────────────────
const PALETTE = {
  blue:   '#2563eb',
  green:  '#16a34a',
  red:    '#dc2626',
  amber:  '#d97706',
  purple: '#7c3aed',
  cyan:   '#0284c7',
  pink:   '#db2777',
  teal:   '#0d9488',
}
const PIE_COLORS = Object.values(PALETTE)

// ── Shared sub-components ────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px',
      padding: '10px 14px', fontSize: '12px', direction: 'rtl',
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    }}>
      {label && <div style={{ fontWeight: '700', marginBottom: '6px', color: '#0f172a' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color }} />
          <span style={{ color: '#64748b' }}>{p.name}:</span>
          <span style={{ fontWeight: '700', color: '#0f172a' }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

function KpiCard({ icon, label, value, color, bg, sub }) {
  return (
    <div className="stat-card" style={{ '--kpi-color': color, '--kpi-bg': bg }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div className="stat-icon-box" style={{ background: bg }}>
          <span style={{ fontSize: '20px' }}>{icon}</span>
        </div>
      </div>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>{sub}</div>}
    </div>
  )
}

function SectionTitle({ icon, title, accent = '#eff6ff' }) {
  return (
    <div className="card-header">
      <div className="card-title">
        <div className="card-title-icon" style={{ background: accent }}>{icon}</div>
        {title}
      </div>
    </div>
  )
}

function EmptyState({ icon = '📭', text = 'لا توجد بيانات' }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-text">{text}</div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// REP DASHBOARD — Personal workspace with prominent add-lead CTA
// ══════════════════════════════════════════════════════════════════
function RepDashboard() {
  const { profile } = useAuth()
  const { leads, loading, refetch } = useLeads({})
  const [showAddModal, setShowAddModal] = useState(false)

  const myTotal  = leads.length
  const myWon    = leads.filter(l => l.stage === 'closed_won').length
  const myLost   = leads.filter(l => l.stage === 'closed_lost').length
  const myActive = leads.filter(l => !['closed_won', 'closed_lost'].includes(l.stage)).length
  const myOverdue= leads.filter(l => l.isOverdue)
  const myCvr    = myTotal > 0 ? ((myWon / myTotal) * 100).toFixed(1) : 0

  const activeStageCounts = STAGES.slice(0, 6).map(s => ({
    label: s.label, icon: s.icon, color: s.color,
    count: leads.filter(l => l.stage === s.key).length,
  }))
  const maxStageCount = Math.max(...activeStageCounts.map(s => s.count), 1)

  const firstName = profile?.name?.split(' ')[0] || 'المندوب'

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
        <div className="spinner" />
        <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>جاري التحميل...</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Hero Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 60%, #3b82f6 100%)',
        borderRadius: '18px',
        padding: '28px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 8px 32px rgba(37,99,235,0.25)',
      }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '6px', letterSpacing: '0.05em' }}>
            🎯 لوحة المندوب
          </div>
          <div style={{ color: 'white', fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>
            أهلاً {firstName}! 👋
          </div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px' }}>
            لديك {myActive} عميل نشط · {myOverdue.length > 0 ? `⚠️ ${myOverdue.length} متأخرة` : '✅ لا متأخرات'}
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: 'white',
            color: '#2563eb',
            border: 'none',
            borderRadius: '14px',
            padding: '14px 28px',
            fontSize: '15px',
            fontWeight: '800',
            cursor: 'pointer',
            fontFamily: 'Cairo, sans-serif',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          ➕ إضافة عميل جديد
        </button>
      </div>

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
        <KpiCard icon="👥" label="إجمالي عملائي" value={myTotal} color="#2563eb" bg="#eff6ff" />
        <KpiCard icon="✅" label="صفقات أغلقتها" value={myWon} color="#16a34a" bg="#f0fdf4" />
        <KpiCard icon="🔄" label="قيد المتابعة" value={myActive} color="#0284c7" bg="#f0f9ff" />
        <KpiCard icon="📈" label="معدل تحويلي" value={`${myCvr}%`} color="#7c3aed" bg="#f5f3ff" />
        <KpiCard
          icon="⚠️" label="متأخرة المتابعة" value={myOverdue.length}
          color="#d97706" bg="#fffbeb"
          sub={myOverdue.length > 0 ? 'تحتاج اتصالاً فورياً' : 'ممتاز! لا متأخرات'}
        />
      </div>

      {/* ── Pipeline + Overdue ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* My Pipeline Funnel */}
        <div className="card">
          <SectionTitle icon="🔻" title="مساري — عملاء نشطون بالمرحلة" accent="#eff6ff" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
            {activeStageCounts.map((s, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                    {s.icon} {s.label}
                  </span>
                  <span style={{
                    fontSize: '12px', fontWeight: '800', color: s.color,
                    background: s.color + '15', borderRadius: '20px', padding: '1px 10px',
                  }}>{s.count}</span>
                </div>
                <div style={{ background: '#f1f5f9', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', background: s.color,
                    width: `${Math.round((s.count / maxStageCount) * 100)}%`,
                    borderRadius: '6px', transition: 'width 0.6s ease',
                    minWidth: s.count > 0 ? '6px' : '0',
                  }} />
                </div>
              </div>
            ))}
            {myTotal === 0 && <EmptyState icon="🚀" text="لا عملاء بعد — أضف أول عميل!" />}
          </div>
        </div>

        {/* My Overdue */}
        <div className="card">
          <SectionTitle icon="🚨" title="عملاء يحتاجون متابعة فورية" accent="#fef2f2" />
          {myOverdue.length === 0 ? (
            <EmptyState icon="✅" text="ممتاز! كل عملائك في الوقت المحدد" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {myOverdue.slice(0, 8).map(l => {
                const days = Math.floor((Date.now() - new Date(l.updated_at)) / 86400000)
                const stage = STAGES.find(s => s.key === l.stage)
                return (
                  <div key={l.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: '#fef2f2', borderRadius: '10px',
                    border: '1px solid #fecaca',
                  }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>{l.customer_name}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        {stage?.icon} {stage?.label || l.stage}
                      </div>
                    </div>
                    <div style={{
                      background: '#dc2626', color: 'white',
                      borderRadius: '20px', padding: '3px 12px',
                      fontSize: '12px', fontWeight: '800', flexShrink: 0,
                    }}>
                      {days} يوم
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Win/Loss Summary ── */}
      {(myWon + myLost) > 0 && (
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ fontWeight: '800', fontSize: '13px', color: '#334155' }}>📊 ملخص نتائجي</div>
            <div style={{ display: 'flex', gap: '20px', flex: 1, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: PALETTE.green }} />
                <span style={{ fontSize: '13px', color: '#64748b' }}>تم البيع:</span>
                <span style={{ fontWeight: '800', color: PALETTE.green }}>{myWon}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: PALETTE.red }} />
                <span style={{ fontSize: '13px', color: '#64748b' }}>خسرنا:</span>
                <span style={{ fontWeight: '800', color: PALETTE.red }}>{myLost}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: PALETTE.purple }} />
                <span style={{ fontSize: '13px', color: '#64748b' }}>معدل التحويل:</span>
                <span style={{ fontWeight: '800', color: PALETTE.purple }}>{myCvr}%</span>
              </div>
              {/* Progress bar */}
              <div style={{ flex: 1, minWidth: '120px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, background: '#fee2e2', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                  <div style={{ width: `${(myWon / (myWon + myLost)) * 100}%`, background: PALETTE.green, height: '100%', borderRadius: '4px' }} />
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0 }}>
                  {((myWon / (myWon + myLost)) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { refetch(); setShowAddModal(false) }}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// ANALYTICS DASHBOARD — Helicopter (executive) & Branch Owner
// ══════════════════════════════════════════════════════════════════
function AnalyticsDashboard() {
  const { isHelicopter, isBranchOwner, branchId, profile } = useAuth()
  const [branches, setBranches] = useState([])
  const [filters, setFilters] = useState({
    branchId: isHelicopter ? '' : branchId,
    dateFrom: '',
    dateTo: '',
  })
  const { data, loading } = useDashboardData(filters)

  useEffect(() => {
    if (isHelicopter) {
      supabase.from('branches').select('id, name').order('name')
        .then(r => setBranches(r.data || []))
    }
  }, [isHelicopter])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
        <div className="spinner" />
        <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>جاري تحميل البيانات...</p>
      </div>
    )
  }
  if (!data) return null

  // Visual identity per role
  const theme = isHelicopter
    ? {
        bannerGrad: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1d4ed8 100%)',
        badge: '🏛️ الإدارة العليا',
        title: 'لوحة التحكم الرئيسية',
        sub: `إجمالي ${data.totalLeads} عميل عبر ${branches.length || '11'} فرع`,
        accent: '#eff6ff',
      }
    : {
        bannerGrad: 'linear-gradient(135deg, #064e3b 0%, #065f46 60%, #059669 100%)',
        badge: '🏢 مدير الفرع',
        title: `لوحة فرع ${profile?.branches?.name || ''}`,
        sub: `إجمالي ${data.totalLeads} عميل في فرعك`,
        accent: '#f0fdf4',
      }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Header Banner ── */}
      <div style={{
        background: theme.bannerGrad,
        borderRadius: '18px',
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: isHelicopter
          ? '0 8px 32px rgba(15,23,42,0.3)'
          : '0 8px 32px rgba(5,150,105,0.25)',
      }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '12px', marginBottom: '6px', letterSpacing: '0.08em' }}>
            {theme.badge}
          </div>
          <div style={{ color: 'white', fontSize: '20px', fontWeight: '800' }}>{theme.title}</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginTop: '3px' }}>{theme.sub}</div>
        </div>

        {/* Date filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {isHelicopter && (
            <select
              value={filters.branchId}
              onChange={e => setFilters(f => ({ ...f, branchId: e.target.value }))}
              style={{
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '7px 12px',
                fontFamily: 'Cairo,sans-serif', fontSize: '13px', direction: 'rtl',
                background: 'rgba(255,255,255,0.1)', color: 'white',
              }}
            >
              <option value="" style={{ background: '#1e3a5f' }}>كل الفروع</option>
              {branches.map(b => <option key={b.id} value={b.id} style={{ background: '#1e3a5f' }}>{b.name}</option>)}
            </select>
          )}
          <input type="date" value={filters.dateFrom} dir="ltr" title="من تاريخ"
            onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            style={{ border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '7px 12px', fontFamily: 'Cairo,sans-serif', fontSize: '13px', background: 'rgba(255,255,255,0.1)', color: 'white' }}
          />
          <input type="date" value={filters.dateTo} dir="ltr" title="إلى تاريخ"
            onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            style={{ border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '7px 12px', fontFamily: 'Cairo,sans-serif', fontSize: '13px', background: 'rgba(255,255,255,0.1)', color: 'white' }}
          />
          {(filters.dateFrom || filters.dateTo || (isHelicopter && filters.branchId)) && (
            <button
              onClick={() => setFilters({ branchId: isHelicopter ? '' : branchId, dateFrom: '', dateTo: '' })}
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontFamily: 'Cairo,sans-serif', fontSize: '12px' }}
            >
              × إعادة
            </button>
          )}
        </div>
      </div>

      {/* ── Overdue Alert ── */}
      {data.overdueLeads.length > 0 && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRight: '4px solid #dc2626',
          borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: '12px',
        }}>
          <span style={{ fontSize: '20px', flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: '800', color: '#dc2626', fontSize: '13px', marginBottom: '8px' }}>
              {data.overdueLeads.length} عميل تجاوزوا 3 أيام بدون متابعة
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {data.overdueLeads.map(l => (
                <span key={l.id} style={{
                  background: 'white', border: '1px solid #fecaca',
                  borderRadius: '20px', padding: '3px 12px', fontSize: '12px',
                  color: '#dc2626', fontWeight: '600',
                }}>
                  {l.customer_name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── KPI Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: '14px' }}>
        <KpiCard icon="👥" label="إجمالي العملاء" value={data.totalLeads} color="#2563eb" bg="#eff6ff" />
        <KpiCard icon="✅" label="صفقات ناجحة" value={data.closedWon} color="#16a34a" bg="#f0fdf4" />
        <KpiCard icon="❌" label="صفقات خسرناها" value={data.closedLost} color="#dc2626" bg="#fef2f2" />
        <KpiCard icon="🔄" label="عملاء نشطون" value={data.activeLeads} color="#0284c7" bg="#f0f9ff" />
        <KpiCard icon="📈" label="معدل التحويل" value={`${data.cvr}%`} color="#7c3aed" bg="#f5f3ff" />
        <KpiCard
          icon="⏱️" label="متوسط أيام الإغلاق"
          value={data.avgDaysToClose > 0 ? `${data.avgDaysToClose} يوم` : '—'}
          color="#0d9488" bg="#f0fdfa"
        />
        <KpiCard
          icon="⚠️" label="متأخرة المتابعة" value={data.overdue}
          color="#d97706" bg="#fffbeb"
          sub={data.overdue > 0 ? 'تتطلب اتصالاً فورياً' : 'لا متأخرات'}
        />
      </div>

      {/* ── Charts ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Row 1: Monthly Trend + Funnel */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '20px' }}>
          <div className="card">
            <SectionTitle icon="📈" title="الاتجاه الشهري — آخر 6 أشهر" accent={theme.accent} />
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.monthlyData} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PALETTE.blue} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={PALETTE.blue} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gWon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PALETTE.green} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={PALETTE.green} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'Cairo', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontFamily: 'Cairo', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', fontFamily: 'Cairo' }} />
                <Area type="monotone" dataKey="total" name="إجمالي العملاء" stroke={PALETTE.blue} strokeWidth={2.5} fill="url(#gTotal)" dot={{ r: 3, fill: PALETTE.blue }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="won" name="تم البيع" stroke={PALETTE.green} strokeWidth={2.5} fill="url(#gWon)" dot={{ r: 3, fill: PALETTE.green }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="lost" name="خسرنا" stroke={PALETTE.red} strokeWidth={1.5} fill="none" strokeDasharray="4 3" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <SectionTitle icon="🔻" title="مسار البيع" accent={theme.accent} />
            <div>
              {data.funnelData.filter(f => f.count > 0).length === 0
                ? <EmptyState />
                : data.funnelData.filter(f => f.count > 0).map((f, i) => {
                    const pct = data.funnelData[0]?.count ? Math.round((f.count / data.funnelData[0].count) * 100) : 0
                    return (
                      <div key={i} style={{ marginBottom: '9px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>{f.stage}</span>
                          <span style={{ fontSize: '11px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>{f.count} · {pct}%</span>
                        </div>
                        <div style={{ background: '#f1f5f9', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: f.color || PALETTE.blue, width: `${pct}%`, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    )
                  })
              }
            </div>
          </div>
        </div>

        {/* Row 2: Branch chart + Rep leaderboard (helicopter = all, branch_owner = their branch reps) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {isHelicopter && (
            <div className="card">
              <SectionTitle icon="🏢" title="أداء الفروع" accent={theme.accent} />
              {data.branchPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.branchPerformance} layout="vertical" margin={{ top: 0, right: 24, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fontFamily: 'Cairo', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontFamily: 'Cairo', fill: '#334155' }} width={90} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', fontFamily: 'Cairo' }} />
                    <Bar dataKey="total" name="إجمالي" fill="#bfdbfe" radius={[0, 4, 4, 0]} barSize={12} />
                    <Bar dataKey="won" name="تم البيع" fill={PALETTE.green} radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState />}
            </div>
          )}

          <div className="card" style={{ gridColumn: isHelicopter ? 'auto' : '1 / -1' }}>
            <SectionTitle icon="🏅" title="أداء المندوبين" accent={theme.accent} />
            <div className="table-container" style={{ boxShadow: 'none', border: '1px solid #f1f5f9' }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>المندوب</th>
                    <th style={{ textAlign: 'center' }}>إجمالي</th>
                    <th style={{ textAlign: 'center' }}>بيع</th>
                    <th style={{ textAlign: 'center' }}>CVR</th>
                  </tr>
                </thead>
                <tbody>
                  {data.repLeaderboard.length === 0
                    ? <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>لا توجد بيانات</td></tr>
                    : data.repLeaderboard.slice(0, 7).map((r, i) => (
                        <tr key={i}>
                          <td style={{ width: '36px', textAlign: 'center' }}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700' }}>{i + 1}</span>}
                          </td>
                          <td style={{ fontWeight: '600' }}>{r.name}</td>
                          <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{r.total}</td>
                          <td style={{ textAlign: 'center', color: PALETTE.green, fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>{r.won}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              background: r.cvr >= 30 ? '#f0fdf4' : r.cvr >= 15 ? '#fffbeb' : '#fef2f2',
                              color: r.cvr >= 30 ? PALETTE.green : r.cvr >= 15 ? PALETTE.amber : PALETTE.red,
                              borderRadius: '20px', padding: '2px 10px', fontSize: '12px', fontWeight: '700',
                            }}>{r.cvr}%</span>
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Row 3: Car Models + Payment + Source */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px' }}>
          <div className="card">
            <SectionTitle icon="🚗" title="توزيع الموديلات" accent={theme.accent} />
            {data.carModelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.carModelData.slice(0, 8)} margin={{ top: 0, right: 8, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'Cairo', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fontFamily: 'Cairo', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="total" name="عملاء" fill={isHelicopter ? PALETTE.blue : PALETTE.teal} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </div>

          <div className="card">
            <SectionTitle icon="💳" title="نوع التمويل" accent={theme.accent} />
            {data.paymentData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={data.paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={32} outerRadius={55} paddingAngle={3}>
                      {data.paymentData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '6px' }}>
                  {data.paymentData.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ color: '#334155', fontWeight: '600' }}>{d.name}</span>
                      </div>
                      <span style={{ fontWeight: '700', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <EmptyState />}
          </div>

          <div className="card">
            <SectionTitle icon="📡" title="مصدر العملاء" accent={theme.accent} />
            {data.sourceData.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '4px' }}>
                {data.sourceData.map((s, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>{s.name}</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>{s.total}</span>
                    </div>
                    <div style={{ background: '#f1f5f9', borderRadius: '4px', height: '8px', overflow: 'hidden', marginBottom: '5px' }}>
                      <div style={{ height: '100%', background: PIE_COLORS[i], width: `${s.total > 0 ? (s.won / s.total) * 100 : 0}%`, borderRadius: '4px', transition: 'width 0.6s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                      <span>{s.won} تم البيع</span>
                      <span style={{ fontWeight: '700', color: PIE_COLORS[i] }}>CVR {s.cvr}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyState />}
          </div>
        </div>

        {/* Row 4: Win/Loss Donut + Overdue Table */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
          <div className="card">
            <SectionTitle icon="🏆" title="نتائج الصفقات" accent={theme.accent} />
            {(data.closedWon + data.closedLost) > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={[{ name: 'تم البيع', value: data.closedWon }, { name: 'خسرنا', value: data.closedLost }]}
                      dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={4}
                    >
                      <Cell fill={PALETTE.green} />
                      <Cell fill={PALETTE.red} />
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '8px' }}>
                  {[{ label: 'بيع', value: data.closedWon, color: PALETTE.green }, { label: 'خسارة', value: data.closedLost, color: PALETTE.red }].map((d, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: d.color }}>{d.value}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{d.label}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : <EmptyState icon="📭" text="لا توجد صفقات مكتملة" />}
          </div>

          <div className="card">
            <SectionTitle icon="🚨" title="العملاء المتأخرة متابعتهم" accent="#fef2f2" />
            {data.overdueLeads.length === 0 ? (
              <EmptyState icon="✅" text="ممتاز! لا يوجد عملاء متأخرة" />
            ) : (
              <div className="table-container" style={{ boxShadow: 'none', border: '1px solid #fecaca' }}>
                <table>
                  <thead><tr style={{ background: '#fef2f2' }}>
                    <th>العميل</th><th>المرحلة</th>
                    <th style={{ textAlign: 'center' }}>أيام بدون متابعة</th>
                    <th>الفرع</th>
                  </tr></thead>
                  <tbody>
                    {data.overdueLeads.map(l => {
                      const days = Math.floor((Date.now() - new Date(l.updated_at)) / 86400000)
                      const stage = STAGES.find(s => s.key === l.stage)
                      return (
                        <tr key={l.id}>
                          <td style={{ fontWeight: '700' }}>{l.customer_name}</td>
                          <td>
                            <span style={{ fontSize: '11px', background: '#fef2f2', color: '#dc2626', borderRadius: '20px', padding: '2px 10px', fontWeight: '700' }}>
                              {stage?.icon} {stage?.label || l.stage}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: '800' }}>{days}</td>
                          <td style={{ fontSize: '12px', color: '#64748b' }}>{l.branches?.name || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// Main entry — dispatches by role
// ══════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { isRep } = useAuth()
  return isRep ? <RepDashboard /> : <AnalyticsDashboard />
}
