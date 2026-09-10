import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useDashboardData } from '../hooks/useDashboard'
import { supabase } from '../lib/supabase'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  FunnelChart, Funnel, LabelList, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const CHART_COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#10b981']

function StatCard({ icon, label, value, sub, color = '#2563eb', highlight = false }) {
  return (
    <div className="stat-card" style={highlight ? { border: '2px solid #ef4444', background: '#fef2f2' } : {}}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
        {sub && <span style={{ fontSize: '12px', color: '#94a3b8' }}>{sub}</span>}
      </div>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

export default function DashboardPage() {
  const { isHelicopter, branchId } = useAuth()
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
      <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>📊</div>
        <p style={{ fontSize: '16px' }}>جاري تحميل البيانات...</p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">
          {isHelicopter ? '🚁 لوحة التحكم الرئيسية' : '📊 لوحة الفرع'}
        </h1>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {isHelicopter && (
            <select
              value={filters.branchId}
              onChange={e => setFilters(f => ({ ...f, branchId: e.target.value }))}
              style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '7px 12px', fontFamily: 'inherit', fontSize: '13px', direction: 'rtl' }}
            >
              <option value="">كل الفروع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <input
            type="date"
            value={filters.dateFrom}
            onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '7px 12px', fontFamily: 'inherit', fontSize: '13px' }}
            dir="ltr"
            title="من تاريخ"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '7px 12px', fontFamily: 'inherit', fontSize: '13px' }}
            dir="ltr"
            title="إلى تاريخ"
          />
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <StatCard icon="👥" label="إجمالي العملاء" value={data.totalLeads} />
        <StatCard icon="✅" label="تم البيع" value={data.closedWon} color="#22c55e" />
        <StatCard icon="❌" label="فقد" value={data.closedLost} color="#ef4444" />
        <StatCard icon="📈" label="معدل التحويل" value={`${data.cvr}%`} color="#2563eb" />
        <StatCard
          icon="⚠️"
          label="متأخرة المتابعة"
          value={data.overdue}
          color="#ef4444"
          highlight={data.overdue > 0}
        />
      </div>

      {/* Overdue leads alert */}
      {data.overdueLeads.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
          <div style={{ fontWeight: '700', color: '#dc2626', marginBottom: '10px' }}>
            ⚠️ عملاء تجاوزوا 3 أيام بدون متابعة
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {data.overdueLeads.map(l => (
              <span key={l.id} style={{ background: 'white', border: '1px solid #fecaca', borderRadius: '8px', padding: '4px 10px', fontSize: '13px', color: '#dc2626' }}>
                {l.customer_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div style={{ display: 'grid', gap: '20px' }}>

        {/* Row 1: Trend + Funnel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Weekly Trend */}
          <div className="card">
            <h3 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '15px' }}>📈 الاتجاه الأسبوعي</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" name="إجمالي" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="won" name="تم البيع" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Funnel */}
          <div className="card">
            <h3 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '15px' }}>🏆 مسار المبيعات</h3>
            <div style={{ direction: 'ltr' }}>
              {data.funnelData.filter(f => f.count > 0).map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', minWidth: '80px', textAlign: 'right', direction: 'rtl' }}>
                    {f.stage}
                  </div>
                  <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '4px', height: '22px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      background: f.color,
                      width: `${data.funnelData[0]?.count ? (f.count / data.funnelData[0].count) * 100 : 0}%`,
                      borderRadius: '4px',
                      transition: 'width 0.5s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: '6px',
                    }}>
                      <span style={{ color: 'white', fontSize: '11px', fontWeight: '700' }}>{f.count}</span>
                    </div>
                  </div>
                </div>
              ))}
              {data.funnelData.filter(f => f.count > 0).length === 0 && (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px', direction: 'rtl' }}>لا توجد بيانات</p>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Branch Performance + Rep Leaderboard */}
        {isHelicopter && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Branch performance */}
            <div className="card">
              <h3 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '15px' }}>🏢 أداء الفروع</h3>
              {data.branchPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.branchPerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip />
                    <Bar dataKey="won" name="تم البيع" fill="#22c55e" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="total" name="إجمالي" fill="#2563eb22" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: '30px' }}>لا توجد بيانات</p>
              )}
            </div>

            {/* Rep leaderboard */}
            <div className="card">
              <h3 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '15px' }}>🏅 المندوبين</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'right', padding: '8px', fontSize: '12px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>المندوب</th>
                      <th style={{ textAlign: 'center', padding: '8px', fontSize: '12px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>إجمالي</th>
                      <th style={{ textAlign: 'center', padding: '8px', fontSize: '12px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>بيع</th>
                      <th style={{ textAlign: 'center', padding: '8px', fontSize: '12px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>CVR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.repLeaderboard.slice(0, 8).map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: '8px', fontSize: '13px', borderBottom: '1px solid #f8fafc' }}>
                          <span style={{ marginLeft: '6px' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                          {r.name}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', fontSize: '13px', borderBottom: '1px solid #f8fafc' }}>{r.total}</td>
                        <td style={{ padding: '8px', textAlign: 'center', fontSize: '13px', color: '#22c55e', fontWeight: '700', borderBottom: '1px solid #f8fafc' }}>{r.won}</td>
                        <td style={{ padding: '8px', textAlign: 'center', fontSize: '13px', borderBottom: '1px solid #f8fafc' }}>
                          <span style={{ background: '#f0fdf4', color: '#166534', borderRadius: '12px', padding: '2px 8px' }}>{r.cvr}%</span>
                        </td>
                      </tr>
                    ))}
                    {data.repLeaderboard.length === 0 && (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>لا توجد بيانات</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Row 3: Car Models + Payment + Source */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
          {/* Car model distribution */}
          <div className="card">
            <h3 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '15px' }}>🚗 الموديلات</h3>
            {data.carModelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.carModelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" name="عملاء" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>لا توجد بيانات</p>
            )}
          </div>

          {/* Payment distribution */}
          <div className="card">
            <h3 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '15px' }}>💳 نوع الدفع</h3>
            {data.paymentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {data.paymentData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>لا توجد بيانات</p>
            )}
          </div>

          {/* Source breakdown */}
          <div className="card">
            <h3 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '15px' }}>📱 المصدر</h3>
            {data.sourceData.map((s, i) => (
              <div key={i} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600' }}>{s.name}</span>
                  <span>{s.total} عميل — CVR: {s.cvr}%</span>
                </div>
                <div style={{ background: '#f1f5f9', borderRadius: '4px', height: '10px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${s.total > 0 ? (s.won / s.total) * 100 : 0}%`,
                    background: CHART_COLORS[i],
                    borderRadius: '4px',
                  }} />
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{s.won} تم البيع</div>
              </div>
            ))}
            {data.sourceData.length === 0 && (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '30px' }}>لا توجد بيانات</p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
