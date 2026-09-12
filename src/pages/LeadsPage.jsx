import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLeads } from '../hooks/useLeads'
import { supabase } from '../lib/supabase'
import { STAGES, SOURCE_OPTIONS, PAYMENT_TYPES } from '../lib/constants'
import LeadsTable from '../components/LeadsTable'
import AddLeadModal from '../components/AddLeadModal'
import LeadDetailModal from '../components/LeadDetailModal'

export default function LeadsPage() {
  const { isHelicopter, isBranchOwner, isRep, branchId } = useAuth()
  const [showAddModal, setShowAddModal] = useState(false)
  const [carModels, setCarModels] = useState([])
  const [branches, setBranches] = useState([])
  const [viewMode, setViewMode] = useState('table') // 'table' | 'kanban'

  const [filters, setFilters] = useState({
    branchId: isHelicopter ? '' : branchId,
    stage: '',
    source: '',
    carModelId: '',
    dateFrom: '',
    dateTo: '',
  })

  const { leads, loading, refetch } = useLeads(filters)

  useEffect(() => {
    async function fetchMeta() {
      const [modelsRes, branchesRes] = await Promise.all([
        supabase.from('car_models').select('id, name').order('name'),
        isHelicopter ? supabase.from('branches').select('id, name').order('name') : Promise.resolve({ data: [] }),
      ])
      setCarModels(modelsRes.data || [])
      setBranches(branchesRes.data || [])
    }
    fetchMeta()
  }, [isHelicopter])

  function setFilter(k, v) {
    setFilters(f => ({ ...f, [k]: v }))
  }

  // Group leads by stage for kanban
  const kanbanGroups = STAGES.reduce((acc, s) => {
    acc[s.key] = leads.filter(l => l.stage === s.key)
    return acc
  }, {})

  const overduCount = leads.filter(l => l.isOverdue).length

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isHelicopter ? '📋 جميع العملاء' : isBranchOwner ? '📋 عملاء الفرع' : '📋 عملائي'}
          </h1>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
            إجمالي: {leads.length} عميل
            {overduCount > 0 && (
              <span className="overdue-badge" style={{ marginRight: '8px' }}>⚠️ {overduCount} متأخرة</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* View mode toggle */}
          <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '7px 14px',
                border: 'none',
                background: viewMode === 'table' ? '#2563eb' : 'white',
                color: viewMode === 'table' ? 'white' : '#64748b',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            >
              📋 جدول
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              style={{
                padding: '7px 14px',
                border: 'none',
                borderRight: 'none',
                background: viewMode === 'kanban' ? '#2563eb' : 'white',
                color: viewMode === 'kanban' ? 'white' : '#64748b',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            >
              🗂️ كانبان
            </button>
          </div>

          {(isRep || isBranchOwner) && (
            <button className="btn-primary" onClick={() => setShowAddModal(true)}>
              ➕ عميل جديد
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        {isHelicopter && (
          <select value={filters.branchId} onChange={e => setFilter('branchId', e.target.value)}>
            <option value="">كل الفروع</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}

        <select value={filters.stage} onChange={e => setFilter('stage', e.target.value)}>
          <option value="">كل المراحل</option>
          {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>

        <select value={filters.source} onChange={e => setFilter('source', e.target.value)}>
          <option value="">كل المصادر</option>
          {SOURCE_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>

        <select value={filters.carModelId} onChange={e => setFilter('carModelId', e.target.value)}>
          <option value="">كل الموديلات</option>
          {carModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        <input
          type="date"
          value={filters.dateFrom}
          onChange={e => setFilter('dateFrom', e.target.value)}
          title="من تاريخ"
          dir="ltr"
        />
        <input
          type="date"
          value={filters.dateTo}
          onChange={e => setFilter('dateTo', e.target.value)}
          title="إلى تاريخ"
          dir="ltr"
        />

        <button
          className="btn-secondary"
          onClick={() => setFilters(f => ({ ...f, stage: '', source: '', carModelId: '', dateFrom: '', dateTo: '' }))}
        >
          🔄 إعادة تعيين
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <p>جاري التحميل...</p>
        </div>
      ) : viewMode === 'table' ? (
        <LeadsTable leads={leads} onUpdate={refetch} />
      ) : (
        <KanbanView groups={kanbanGroups} onUpdate={refetch} />
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

function KanbanView({ groups, onUpdate }) {
  const [selectedLeadId, setSelectedLeadId] = useState(null)

  return (
    <>
      <div className="kanban-board" style={{ direction: 'ltr' }}>
        {STAGES.map(stage => {
          const cards = groups[stage.key] || []
          return (
            <div key={stage.key} className="kanban-column">
              <div className="kanban-column-header">
                <span style={{ color: stage.color }}>
                  {stage.icon} {stage.label}
                </span>
                <span style={{ background: stage.color + '20', color: stage.color, borderRadius: '12px', padding: '1px 8px', fontSize: '12px' }}>
                  {cards.length}
                </span>
              </div>
              {cards.map(lead => (
                <div
                  key={lead.id}
                  className={`kanban-card${lead.isOverdue ? ' overdue' : ''}`}
                  onClick={() => setSelectedLeadId(lead.id)}
                  style={{ direction: 'rtl' }}
                >
                  <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}>{lead.customer_name}</div>
                  {lead.car_models?.name && (
                    <div style={{ fontSize: '12px', color: '#64748b' }}>🚗 {lead.car_models.name}</div>
                  )}
                  {lead.isOverdue && <div className="overdue-badge" style={{ marginTop: '6px', fontSize: '11px' }}>⚠️ متأخر</div>}
                </div>
              ))}
              {cards.length === 0 && (
                <div style={{ textAlign: 'center', color: '#cbd5e1', fontSize: '12px', padding: '16px' }}>
                  لا يوجد
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedLeadId && (
        <LeadDetailModal
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onUpdate={onUpdate}
        />
      )}
    </>
  )
}
