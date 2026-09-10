import { useState } from 'react'
import { STAGE_MAP, SOURCE_OPTIONS, PAYMENT_TYPES } from '../lib/constants'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'
import LeadDetailModal from './LeadDetailModal'

function StageBadge({ stage }) {
  const s = STAGE_MAP[stage] || { label: stage, color: '#64748b' }
  return (
    <span className="badge" style={{ background: s.color + '20', color: s.color, fontSize: '11px' }}>
      {s.label}
    </span>
  )
}

export default function LeadsTable({ leads, onUpdate }) {
  const [selectedLeadId, setSelectedLeadId] = useState(null)

  return (
    <>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>العميل</th>
              <th>الموديل</th>
              <th>المرحلة</th>
              <th>المصدر</th>
              <th>الدفع</th>
              <th>الفرع</th>
              <th>المندوب</th>
              <th>آخر تحديث</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>
                  لا توجد عملاء لعرضها
                </td>
              </tr>
            )}
            {leads.map(lead => {
              const source = SOURCE_OPTIONS.find(s => s.key === lead.source)
              const payment = PAYMENT_TYPES.find(p => p.key === lead.payment_type)
              return (
                <tr key={lead.id} style={{ cursor: 'pointer' }}>
                  <td onClick={() => setSelectedLeadId(lead.id)}>
                    <div style={{ fontWeight: '600' }}>{lead.customer_name}</div>
                    {lead.customer_phone && <div style={{ fontSize: '12px', color: '#94a3b8' }}>{lead.customer_phone}</div>}
                    {lead.isOverdue && <span className="overdue-badge" style={{ fontSize: '11px' }}>⚠️ متأخر</span>}
                  </td>
                  <td onClick={() => setSelectedLeadId(lead.id)}>{lead.car_models?.name || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                  <td onClick={() => setSelectedLeadId(lead.id)}><StageBadge stage={lead.stage} /></td>
                  <td onClick={() => setSelectedLeadId(lead.id)}>{source?.label || lead.source}</td>
                  <td onClick={() => setSelectedLeadId(lead.id)}>{payment?.label || lead.payment_type}</td>
                  <td onClick={() => setSelectedLeadId(lead.id)}>{lead.branches?.name || '—'}</td>
                  <td onClick={() => setSelectedLeadId(lead.id)}>{lead.rep?.name || '—'}</td>
                  <td onClick={() => setSelectedLeadId(lead.id)} style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {formatDistanceToNow(new Date(lead.updated_at), { locale: ar, addSuffix: true })}
                  </td>
                  <td>
                    <button
                      className="btn-secondary"
                      onClick={() => setSelectedLeadId(lead.id)}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      عرض
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selectedLeadId && (
        <LeadDetailModal
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onUpdate={() => {
            onUpdate?.()
          }}
        />
      )}
    </>
  )
}
