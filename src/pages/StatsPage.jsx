import { useAuth } from '../context/AuthContext'
import { useDashboardData } from '../hooks/useDashboard'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

export default function StatsPage() {
  const { branchId } = useAuth()
  const { data, loading } = useDashboardData({ branchId })

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>⏳ جاري التحميل...</div>
  )

  if (!data) return null

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📊 إحصائياتي</h1>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {[
          { icon: '👥', label: 'إجمالي العملاء', value: data.totalLeads, color: '#2563eb' },
          { icon: '✅', label: 'تم البيع', value: data.closedWon, color: '#22c55e' },
          { icon: '📈', label: 'معدل التحويل', value: `${data.cvr}%`, color: '#2563eb' },
          { icon: '⚠️', label: 'متأخرة', value: data.overdue, color: '#ef4444' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <span style={{ fontSize: '22px' }}>{s.icon}</span>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Weekly trend */}
        <div className="card">
          <h3 style={{ fontWeight: '700', marginBottom: '16px' }}>📈 الأداء الأسبوعي</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="total" name="إجمالي" stroke="#2563eb" strokeWidth={2} dot />
              <Line type="monotone" dataKey="won" name="بيع" stroke="#22c55e" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Funnel */}
        <div className="card">
          <h3 style={{ fontWeight: '700', marginBottom: '16px' }}>🏆 مراحل العملاء</h3>
          {data.funnelData.filter(f => f.count > 0).map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ fontSize: '12px', color: '#64748b', minWidth: '90px', direction: 'rtl' }}>{f.stage}</div>
              <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '4px', height: '20px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: f.color,
                  width: `${data.funnelData[0]?.count ? (f.count / data.funnelData[0].count) * 100 : 0}%`,
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  paddingRight: '6px',
                }}>
                  <span style={{ color: 'white', fontSize: '11px', fontWeight: '700' }}>{f.count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
