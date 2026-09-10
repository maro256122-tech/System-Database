import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useDashboardData } from '../hooks/useDashboard'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

const COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function ReportsPage() {
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📈 التقارير التفصيلية</h1>
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
          <input type="date" value={filters.dateFrom}
            onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '7px 12px', fontSize: '13px' }} dir="ltr" />
          <input type="date" value={filters.dateTo}
            onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '7px 12px', fontSize: '13px' }} dir="ltr" />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>⏳ جاري التحميل...</div>
      ) : !data ? null : (
        <div style={{ display: 'grid', gap: '20px' }}>

          {/* Summary row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            {[
              { label: 'إجمالي العملاء', value: data.totalLeads, icon: '👥', color: '#2563eb' },
              { label: 'تم البيع', value: data.closedWon, icon: '✅', color: '#22c55e' },
              { label: 'فقد', value: data.closedLost, icon: '❌', color: '#ef4444' },
              { label: 'معدل التحويل', value: `${data.cvr}%`, icon: '📊', color: '#f59e0b' },
            ].map((s, i) => (
              <div key={i} className="stat-card">
                <span style={{ fontSize: '20px' }}>{s.icon}</span>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Branch performance */}
          {isHelicopter && data.branchPerformance.length > 0 && (
            <div className="card">
              <h3 style={{ fontWeight: '700', marginBottom: '16px' }}>🏢 مقارنة الفروع</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.branchPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" name="إجمالي" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="won" name="تم البيع" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Car model vs payment side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="card">
              <h3 style={{ fontWeight: '700', marginBottom: '16px' }}>🚗 توزيع الموديلات</h3>
              {data.carModelData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.carModelData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip />
                    <Bar dataKey="total" name="إجمالي" fill="#2563eb" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="won" name="بيع" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>لا توجد بيانات</p>}
            </div>

            <div className="card">
              <h3 style={{ fontWeight: '700', marginBottom: '16px' }}>💳 توزيع طرق الدفع</h3>
              {data.paymentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {data.paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>لا توجد بيانات</p>}
            </div>
          </div>

          {/* Source breakdown table */}
          <div className="card">
            <h3 style={{ fontWeight: '700', marginBottom: '16px' }}>📱 تحليل المصادر</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>المصدر</th>
                    <th>إجمالي العملاء</th>
                    <th>تم البيع</th>
                    <th>معدل التحويل</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sourceData.map((s, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: '600' }}>{s.name}</td>
                      <td>{s.total}</td>
                      <td style={{ color: '#22c55e', fontWeight: '700' }}>{s.won}</td>
                      <td>
                        <span style={{ background: '#f0fdf4', color: '#166534', borderRadius: '12px', padding: '2px 10px', fontSize: '13px' }}>
                          {s.cvr}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
