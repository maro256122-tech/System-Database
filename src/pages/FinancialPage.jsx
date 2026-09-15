import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { PAYMENT_TYPES, STAGES, STAGE_MAP } from '../lib/constants'
import { format } from 'date-fns'

function KpiCard({ icon, label, value, color, bg, sub }) {
  return (
    <div style={{
      background: 'white', borderRadius: '14px', padding: '20px',
      border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px', background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
        }}>{icon}</div>
        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>{label}</div>
      </div>
      <div style={{ fontSize: '26px', fontWeight: '900', color }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

export default function FinancialPage() {
  const { isHelicopter, isBranchOwner, branchId } = useAuth()
  const [records, setRecords] = useState([])
  const [branches, setBranches] = useState([])
  const [userMap, setUserMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    branchId: isHelicopter ? '' : (branchId || ''),
    stage: '',
    dateFrom: '',
    dateTo: '',
  })

  useEffect(() => {
    if (isHelicopter) {
      supabase.from('branches').select('id, name').order('name')
        .then(r => setBranches(r.data || []))
    }
  }, [isHelicopter])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        let q = supabase.from('leads')
          .select('*, branches(id, name), car_models(id, name)')
          .not('deposit_amount', 'is', null)
          .order('deposit_date', { ascending: false, nullsFirst: false })

        if (filters.branchId) q = q.eq('branch_id', filters.branchId)
        else if (!isHelicopter && branchId) q = q.eq('branch_id', branchId)
        if (filters.stage) q = q.eq('stage', filters.stage)
        if (filters.dateFrom) q = q.gte('deposit_date', filters.dateFrom)
        if (filters.dateTo) q = q.lte('deposit_date', filters.dateTo)

        const { data, error } = await q
        if (error) console.error('FinancialPage error:', error)
        const rows = data || []

        // Fetch assigned rep names
        const repIds = [...new Set(rows.map(r => r.assigned_rep_id).filter(Boolean))]
        let um = {}
        if (repIds.length > 0) {
          const { data: profiles } = await supabase
            .from('user_profiles').select('id, name').in('id', repIds)
          profiles?.forEach(p => { um[p.id] = p })
        }
        setUserMap(um)
        setRecords(rows)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [JSON.stringify(filters), isHelicopter, branchId])

  function setFilter(k, v) { setFilters(f => ({ ...f, [k]: v })) }

  const totalDeposits = records.reduce((s, r) => s + (r.deposit_amount || 0), 0)
  const avgDeposit = records.length > 0 ? totalDeposits / records.length : 0
  const wonRecords = records.filter(r => r.stage === 'closed_won')
  const wonAmount = wonRecords.reduce((s, r) => s + (r.deposit_amount || 0), 0)

  const inputStyle = {
    border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '7px 12px',
    fontFamily: 'Cairo, sans-serif', fontSize: '13px', background: 'white',
    color: '#374151', outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
        borderRadius: '18px', padding: '24px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '14px',
        boxShadow: '0 8px 32px rgba(22,163,74,0.25)',
      }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '12px', marginBottom: '6px', letterSpacing: '0.08em' }}>
            💰 الحسابات والمدفوعات
          </div>
          <div style={{ color: 'white', fontSize: '20px', fontWeight: '800' }}>سجل العربونات والتفاصيل المالية</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginTop: '3px' }}>
            {records.length} سجل مالي مسجّل
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
        <KpiCard icon="💰" label="إجمالي العربونات"
          value={totalDeposits.toLocaleString('ar-SA') + ' ر.س'}
          color="#16a34a" bg="#f0fdf4"
          sub={`${records.length} عميل`}
        />
        <KpiCard icon="📊" label="متوسط العربون"
          value={Math.round(avgDeposit).toLocaleString('ar-SA') + ' ر.س'}
          color="#0284c7" bg="#f0f9ff"
        />
        <KpiCard icon="✅" label="صفقات مكتملة"
          value={wonRecords.length}
          color="#7c3aed" bg="#f5f3ff"
          sub={wonAmount.toLocaleString('ar-SA') + ' ر.س'}
        />
        <KpiCard icon="⏳" label="عربونات معلقة"
          value={records.filter(r => r.stage === 'deposit_paid').length}
          color="#d97706" bg="#fffbeb"
          sub="في مرحلة العربون"
        />
      </div>

      {/* Filters */}
      <div style={{
        background: 'white', borderRadius: '14px', padding: '16px 20px',
        border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        <div style={{ fontWeight: '800', fontSize: '13px', color: '#374151', alignSelf: 'center', marginLeft: 'auto' }}>
          🔍 فلاتر
        </div>

        {isHelicopter && (
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>الفرع</div>
            <select style={inputStyle} value={filters.branchId} onChange={e => setFilter('branchId', e.target.value)}>
              <option value="">كل الفروع</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>المرحلة</div>
          <select style={inputStyle} value={filters.stage} onChange={e => setFilter('stage', e.target.value)}>
            <option value="">كل المراحل</option>
            {['deposit_paid', 'closed_won', 'closed_lost'].map(k => {
              const s = STAGE_MAP[k]
              return <option key={k} value={k}>{s?.icon} {s?.label}</option>
            })}
          </select>
        </div>

        <div>
          <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>من تاريخ العربون</div>
          <input type="date" style={{ ...inputStyle, direction: 'ltr' }}
            value={filters.dateFrom} onChange={e => setFilter('dateFrom', e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>إلى تاريخ</div>
          <input type="date" style={{ ...inputStyle, direction: 'ltr' }}
            value={filters.dateTo} onChange={e => setFilter('dateTo', e.target.value)} />
        </div>

        {Object.values(filters).some(v => v !== '') && (
          <button
            onClick={() => setFilters({ branchId: isHelicopter ? '' : (branchId || ''), stage: '', dateFrom: '', dateTo: '' })}
            style={{ ...inputStyle, color: '#dc2626', border: '1.5px solid #fecaca', background: '#fef2f2', cursor: 'pointer', fontWeight: '700' }}
          >
            × إعادة
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: '800', fontSize: '14px', color: '#1e293b' }}>
          📋 سجل العربونات
        </div>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
            <div>جاري التحميل...</div>
          </div>
        ) : records.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>💰</div>
            <div style={{ fontWeight: '700' }}>لا توجد سجلات مالية</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>سيظهر هنا العملاء الذين سُجّل لهم عربون</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Cairo, sans-serif' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['#', 'اسم العميل', 'المندوب', 'مبلغ العربون', 'تاريخ العربون', 'نوع التمويل', 'الفرع', 'المرحلة الحالية'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: '#64748b',
                      textAlign: 'right', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => {
                  const stage = STAGE_MAP[r.stage] || { label: r.stage, color: '#94a3b8' }
                  const pmnt = PAYMENT_TYPES.find(p => p.key === r.payment_type)
                  const rep = userMap[r.assigned_rep_id]
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f8fafc' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#94a3b8', fontWeight: '700' }}>{i + 1}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: '#1e293b' }}>{r.customer_name}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>
                        {rep?.name || <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: '15px', fontWeight: '800', color: '#16a34a',
                          background: '#f0fdf4', borderRadius: '8px', padding: '4px 12px',
                        }}>
                          {r.deposit_amount?.toLocaleString('ar-SA')} ر.س
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151', direction: 'ltr', textAlign: 'right' }}>
                        {r.deposit_date ? format(new Date(r.deposit_date), 'dd/MM/yyyy') : <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>
                        {pmnt?.label || r.payment_type}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b' }}>
                        {r.branches?.name || '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: '12px', fontWeight: '700', borderRadius: '20px',
                          padding: '3px 12px', background: stage.color + '20', color: stage.color,
                        }}>
                          {stage.icon} {stage.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f0fdf4', borderTop: '2px solid #bbf7d0' }}>
                  <td colSpan={3} style={{ padding: '14px 16px', fontWeight: '800', fontSize: '13px', color: '#14532d' }}>
                    الإجمالي ({records.length} سجل)
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '16px', fontWeight: '900', color: '#16a34a' }}>
                    {totalDeposits.toLocaleString('ar-SA')} ر.س
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
