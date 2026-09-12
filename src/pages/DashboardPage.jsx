import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useDashboardData } from '../hooks/useDashboard'
import { supabase } from '../lib/supabase'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
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

// ── Custom Tooltip ────────────────────────────────────────────────
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

// ── KPI Card ──────────────────────────────────────────────────────
function KpiCard({ icon, label, value, color, bg, trend, trendLabel, trendUp }) {
  return (
    <div className="stat-card" style={{ '--kpi-color': color, '--kpi-bg': bg }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div className="stat-icon-box" style={{ background: bg }}>
          <span style={{ fontSize: '22px' }}>{icon}</span>
        </div>
        {trend !== undefined && (
          <span style={{
            fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px',
            background: trendUp ? '#f0fdf4' : '#fef2f2',
            color: trendUp ? '#16a34a' : '#dc2626',
          }}>
            {trendUp ? '↑' : '↓'} {trend}%
          </span>
        )}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {trendLabel && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{trendLabel}</div>}
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────
function SectionTitle({ icon, title, action }) {
  return (
    <div className="card-header">
      <div className="card-title">
        <div className="card-title-icon" style={{ background: '#eff6ff' }}>{icon}</div>
        {title}
      </div>
      {action}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { isHelicopter, branchId, profile } = useAuth()
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

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isHelicopter ? 'لوحة التحكم الرئيسية' : 'لوحة الفرع'}
          </h1>
          <div className="page-subtitle">
            {isHelicopter
              ? `إجمالي ${data.totalLeads} عميل عبر ${branches.length || '11'} فرع`
              : `إجمالي ${data.totalLeads} عميل في فرعك`
            }
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {isHelicopter && (
            <select
              value={filters.branchId}
              onChange={e => setFilters(f => ({ ...f, branchId: e.target.value }))}
              style={{ border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', fontFamily: 'Cairo,sans-serif', fontSize: '13px', direction: 'rtl', background: 'white', color: '#334155' }}
            >
              <option value="">كل الفروع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <input type="date" value={filters.dateFrom} dir="ltr" title="من تاريخ"
            onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            style={{ border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', fontFamily: 'Cairo,sans-serif', fontSize: '13px', color: '#334155', background: 'white' }}
          />
          <input type="date" value={filters.dateTo} dir="ltr" title="إلى تاريخ"
            onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            style={{ border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', fontFamily: 'Cairo,sans-serif', fontSize: '13px', color: '#334155', background: 'white' }}
          />
          {(filters.dateFrom || filters.dateTo || (isHelicopter && filters.branchId)) && (
            <button className="btn-ghost"
              onClick={() => setFilters({ branchId: isHelicopter ? '' : branchId, dateFrom: '', dateTo: '' })}>
              × إعادة تعيين
            </button>
          )}
        </div>
      </div>

      {/* ── Overdue Alert ── */}
      {data.overdueLeads.length > 0 && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRight: '4px solid #dc2626',
          borderRadius: '12px', padding: '14px 18px', marginBottom: '24px',
          display: 'flex', alignItems: 'flex-start', gap: '12px',
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <KpiCard
          icon="👥" label="إجمالي العملاء" value={data.totalLeads}
          color="#2563eb" bg="#eff6ff"
        />
        <KpiCard
          icon="✅" label="صفقات ناجحة" value={data.closedWon}
          color="#16a34a" bg="#f0fdf4"
        />
        <KpiCard
          icon="❌" label="صفقات خسرناها" value={data.closedLost}
          color="#dc2626" bg="#fef2f2"
        />
        <KpiCard
          icon="🔄" label="عملاء نشطون" value={data.activeLeads}
          color="#0284c7" bg="#f0f9ff"
        />
        <KpiCard
          icon="📈" label="معدل التحويل" value={`${data.cvr}%`}
          color="#7c3aed" bg="#f5f3ff"
        />
        <KpiCard
          icon="⏱️" label="متوسط أيام الإغلاق" value={data.avgDaysToClose > 0 ? `${data.avgDaysToClose} يوم` : '—'}
          color="#0d9488" bg="#f0fdfa"
          trendLabel="من تسجيل العميل حتى البيع"
        />
        <KpiCard
          icon="⚠️" label="متأخرة المتابعة" value={data.overdue}
          color="#d97706" bg="#fffbeb"
          trendLabel={data.overdue > 0 ? 'تتطلب اتصالاً فورياً' : 'لا متأخرات'}
        />
      </div>

      {/* ── Charts ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Row 1: Monthly Trend + Funnel */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '20px' }}>

          {/* Monthly Trend */}
          <div className="card">
            <SectionTitle icon="📈" title="الاتجاه الشهري — آخر 6 أشهر" />
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={data.monthlyData} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PALETTE.blue} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={PALETTE.blue} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradWon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PALETTE.green} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={PALETTE.green} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'Cairo', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontFamily: 'Cairo', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', fontFamily: 'Cairo' }} />
                <Area type="monotone" dataKey="total" name="إجمالي العملاء" stroke={PALETTE.blue}
                  strokeWidth={2.5} fill="url(#gradTotal)" dot={{ r: 3, fill: PALETTE.blue }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="won" name="تم البيع" stroke={PALETTE.green}
                  strokeWidth={2.5} fill="url(#gradWon)" dot={{ r: 3, fill: PALETTE.green }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="lost" name="تم الخسارة" stroke={PALETTE.red}
                  strokeWidth={2} fill="none" strokeDasharray="4 3" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Funnel */}
          <div className="card">
            <SectionTitle icon="🔻" title="مسار البيع" />
            <div style={{ direction: 'ltr' }}>
              {data.funnelData.filter(f => f.count > 0).length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📭</div>
                  <div className="empty-state-text">لا توجد بيانات</div>
                </div>
              ) : (
                data.funnelData.filter(f => f.count > 0).map((f, i) => {
                  const pct = data.funnelData[0]?.count
                    ? Math.round((f.count / data.funnelData[0].count) * 100) : 0
                  return (
                    <div key={i} style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', direction: 'rtl' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>{f.stage}</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                          {f.count} · {pct}%
                        </span>
                      </div>
                      <div style={{ background: '#f1f5f9', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', background: f.color || PALETTE.blue,
                          width: `${pct}%`, borderRadius: '4px',
                          transition: 'width 0.6s ease',
                        }} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Branch Performance + Rep Leaderboard (helicopter only) */}
        {isHelicopter && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Branch chart */}
            <div className="card">
              <SectionTitle icon="🏢" title="أداء الفروع" />
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
              ) : (
                <div className="empty-state"><div className="empty-state-icon">📭</div><div className="empty-state-text">لا توجد بيانات</div></div>
              )}
            </div>

            {/* Rep Leaderboard */}
            <div className="card">
              <SectionTitle icon="🏅" title="أداء المندوبين" />
              <div className="table-container" style={{ boxShadow: 'none', border: '1px solid #f1f5f9' }}>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>المندوب</th>
                      <th style={{ textAlign: 'center' }}>إجمالي</th>
                      <th style={{ textAlign: 'center' }}>بيع</th>
                      <th style={{ textAlign: 'center' }}>CVR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.repLeaderboard.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>لا توجد بيانات</td></tr>
                    ) : (
                      data.repLeaderboard.slice(0, 7).map((r, i) => (
                        <tr key={i}>
                          <td style={{ width: '36px', textAlign: 'center' }}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (
                              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700' }}>{i + 1}</span>
                            )}
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
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Row 3: Car Models + Payment + Source */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px' }}>

          {/* Car Models Bar */}
          <div className="card">
            <SectionTitle icon="🚗" title="توزيع الموديلات" />
            {data.carModelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={data.carModelData.slice(0, 8)} margin={{ top: 0, right: 8, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'Cairo', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fontFamily: 'Cairo', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="total" name="عملاء" fill={PALETTE.blue} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><div className="empty-state-icon">📭</div><div className="empty-state-text">لا توجد بيانات</div></div>
            )}
          </div>

          {/* Payment Pie */}
          <div className="card">
            <SectionTitle icon="💳" title="نوع الدفع" />
            {data.paymentData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={data.paymentData} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" innerRadius={35} outerRadius={60}
                      paddingAngle={3}>
                      {data.paymentData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
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
            ) : (
              <div className="empty-state"><div className="empty-state-icon">📭</div><div className="empty-state-text">لا توجد بيانات</div></div>
            )}
          </div>

          {/* Source Breakdown */}
          <div className="card">
            <SectionTitle icon="📡" title="مصدر العملاء" />
            {data.sourceData.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '4px' }}>
                {data.sourceData.map((s, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>{s.name}</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>{s.total} عميل</span>
                    </div>
                    <div style={{ background: '#f1f5f9', borderRadius: '4px', height: '8px', overflow: 'hidden', marginBottom: '5px' }}>
                      <div style={{
                        height: '100%', background: PIE_COLORS[i],
                        width: `${s.total > 0 ? (s.won / s.total) * 100 : 0}%`,
                        borderRadius: '4px', transition: 'width 0.6s',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                      <span>{s.won} تم البيع</span>
                      <span style={{ fontWeight: '700', color: PIE_COLORS[i] }}>CVR {s.cvr}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state"><div className="empty-state-icon">📭</div><div className="empty-state-text">لا توجد بيانات</div></div>
            )}
          </div>
        </div>

        {/* Row 4: Win/Loss Rate + Weekly Sparkline + Overdue Table */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>

          {/* Win / Loss Donut */}
          <div className="card">
            <SectionTitle icon="🏆" title="نتائج الصفقات" />
            {(data.closedWon + data.closedLost) > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'تم البيع', value: data.closedWon },
                        { name: 'تم الخسارة', value: data.closedLost },
                      ]}
                      dataKey="value" nameKey="name"
                      cx="50%" cy="50%" innerRadius={40} outerRadius={60}
                      paddingAngle={4}
                    >
                      <Cell fill={PALETTE.green} />
                      <Cell fill={PALETTE.red} />
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '8px' }}>
                  {[
                    { label: 'تم البيع', value: data.closedWon, color: PALETTE.green },
                    { label: 'خسرناها', value: data.closedLost, color: PALETTE.red },
                  ].map((d, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: d.color }}>{d.value}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{d.label}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state"><div className="empty-state-icon">📭</div><div className="empty-state-text">لا توجد صفقات مكتملة</div></div>
            )}
          </div>

          {/* Overdue Leads Table */}
          <div className="card">
            <SectionTitle icon="🚨" title="العملاء المتأخرة متابعتهم" />
            {data.overdueLeads.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <div className="empty-state-text">ممتاز! لا يوجد عملاء متأخرة</div>
              </div>
            ) : (
              <div className="table-container" style={{ boxShadow: 'none', border: '1px solid #fecaca' }}>
                <table>
                  <thead>
                    <tr style={{ background: '#fef2f2' }}>
                      <th>العميل</th>
                      <th>المرحلة</th>
                      <th style={{ textAlign: 'center' }}>آخر نشاط</th>
                      <th>الفرع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.overdueLeads.map((l, i) => {
                      const days = Math.floor((Date.now() - new Date(l.updated_at)) / 86400000)
                      return (
                        <tr key={l.id}>
                          <td style={{ fontWeight: '700' }}>{l.customer_name}</td>
                          <td>
                            <span style={{ fontSize: '11px', background: '#fef2f2', color: '#dc2626', borderRadius: '20px', padding: '2px 10px', fontWeight: '700' }}>
                              {l.stage}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: '700' }}>{days} يوم</td>
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
