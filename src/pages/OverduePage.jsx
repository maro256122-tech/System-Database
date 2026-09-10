import { useState } from 'react'
import { useLeads } from '../hooks/useLeads'
import { useAuth } from '../context/AuthContext'
import LeadDetailModal from '../components/LeadDetailModal'
import { STAGE_MAP } from '../lib/constants'
import { differenceInDays } from 'date-fns'

export default function OverduePage() {
  const { branchId } = useAuth()
  const { leads, loading, refetch } = useLeads({ branchId })
  const [selectedLeadId, setSelectedLeadId] = useState(null)

  const overdueLeads = leads.filter(l => l.isOverdue)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">⚠️ متأخرة المتابعة</h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
            العملاء الذين لم تتم متابعتهم منذ أكثر من 3 أيام
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>⏳ جاري التحميل...</div>
      ) : overdueLeads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
          <div style={{ fontSize: '16px', color: '#22c55e', fontWeight: '700' }}>ممتاز! لا توجد متابعات متأخرة</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {overdueLeads.map(lead => {
            const days = differenceInDays(new Date(), new Date(lead.updated_at))
            const stage = STAGE_MAP[lead.stage]
            return (
              <div
                key={lead.id}
                onClick={() => setSelectedLeadId(lead.id)}
                style={{
                  background: 'white',
                  border: '2px solid #fecaca',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#ef4444'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#fecaca'}
              >
                <div>
                  <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>{lead.customer_name}</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {lead.customer_phone && (
                      <span style={{ fontSize: '13px', color: '#64748b' }}>📱 {lead.customer_phone}</span>
                    )}
                    {lead.car_models?.name && (
                      <span style={{ fontSize: '13px', color: '#64748b' }}>🚗 {lead.car_models.name}</span>
                    )}
                    <span style={{ fontSize: '13px', color: stage?.color, background: stage?.color + '20', borderRadius: '12px', padding: '1px 8px' }}>
                      {stage?.label}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'center', background: '#fef2f2', borderRadius: '10px', padding: '10px 16px', minWidth: '80px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#dc2626' }}>{days}</div>
                  <div style={{ fontSize: '11px', color: '#dc2626' }}>يوم</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedLeadId && (
        <LeadDetailModal
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onUpdate={refetch}
        />
      )}
    </div>
  )
}
