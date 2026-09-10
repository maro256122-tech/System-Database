import { useState } from 'react'
import { useLead } from '../hooks/useLeads'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  STAGES, STAGE_MAP, PAYMENT_TYPES, SOURCE_OPTIONS,
  ACTION_TYPE_OPTIONS, ACTION_TYPE_LABELS
} from '../lib/constants'
import { format, formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'
import toast from 'react-hot-toast'

function StageBadge({ stage }) {
  const s = STAGE_MAP[stage] || { label: stage, color: '#64748b' }
  return (
    <span className="badge" style={{ background: s.color + '20', color: s.color }}>
      {s.icon} {s.label}
    </span>
  )
}

function ActivityLog({ activities }) {
  return (
    <div className="timeline">
      {activities.map(act => (
        <div key={act.id} className="timeline-item">
          <div className="timeline-dot" />
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>
            {formatDistanceToNow(new Date(act.created_at), { locale: ar, addSuffix: true })}
            {' • '}
            {act.user?.name}
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
            {ACTION_TYPE_LABELS[act.action_type] || act.action_type}
            {act.from_stage && act.to_stage && (
              <span style={{ fontWeight: '400', color: '#64748b' }}>
                {': '}
                {STAGE_MAP[act.from_stage]?.label}
                {' ← '}
                {STAGE_MAP[act.to_stage]?.label}
              </span>
            )}
          </div>
          {act.note && (
            <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', borderRight: '3px solid #e2e8f0' }}>
              {act.note}
            </div>
          )}
        </div>
      ))}
      {activities.length === 0 && (
        <p style={{ color: '#94a3b8', fontSize: '13px' }}>لا توجد نشاطات مسجلة بعد</p>
      )}
    </div>
  )
}

export default function LeadDetailModal({ leadId, onClose, onUpdate }) {
  const { user, isRep } = useAuth()
  const { lead, activities, loading, refetch } = useLead(leadId)
  const [activeTab, setActiveTab] = useState('timeline')
  const [saving, setSaving] = useState(false)

  // Stage change
  const [newStage, setNewStage] = useState('')
  const [lostReason, setLostReason] = useState('')

  // Activity add
  const [actForm, setActForm] = useState({ action_type: 'contact_attempt', note: '' })

  async function handleStageChange() {
    if (!newStage || newStage === lead.stage) return
    if (newStage === 'closed_lost' && !lostReason.trim()) {
      return toast.error('يرجى إدخال سبب الإغلاق')
    }
    setSaving(true)
    try {
      const updateData = { stage: newStage }
      if (newStage === 'closed_lost') updateData.lost_reason = lostReason

      await supabase.from('leads').update(updateData).eq('id', leadId)
      await supabase.from('activities').insert({
        lead_id: leadId,
        user_id: user.id,
        action_type: 'stage_changed',
        from_stage: lead.stage,
        to_stage: newStage,
        note: newStage === 'closed_lost' ? `سبب الإغلاق: ${lostReason}` : null,
      })
      toast.success('تم تحديث المرحلة ✅')
      setNewStage('')
      setLostReason('')
      refetch()
      onUpdate?.()
    } catch (err) {
      toast.error('خطأ: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddActivity() {
    if (!actForm.note.trim() && actForm.action_type === 'note_added') {
      return toast.error('يرجى كتابة ملاحظة')
    }
    setSaving(true)
    try {
      await supabase.from('activities').insert({
        lead_id: leadId,
        user_id: user.id,
        action_type: actForm.action_type,
        note: actForm.note.trim() || null,
      })
      // Update lead's updated_at to reset overdue timer
      await supabase.from('leads').update({ updated_at: new Date().toISOString() }).eq('id', leadId)
      toast.success('تم تسجيل النشاط ✅')
      setActForm({ action_type: 'contact_attempt', note: '' })
      refetch()
      onUpdate?.()
    } catch (err) {
      toast.error('خطأ: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <p>جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!lead) return null

  const payment = PAYMENT_TYPES.find(p => p.key === lead.payment_type)
  const source = SOURCE_OPTIONS.find(s => s.key === lead.source)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '680px' }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{lead.customer_name}</h2>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
              <StageBadge stage={lead.stage} />
              {lead.isOverdue && <span className="overdue-badge">⚠️ متأخر</span>}
            </div>
          </div>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '6px 12px' }}>✕</button>
        </div>

        {/* Info row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          background: '#f8fafc',
          borderRadius: '10px',
          padding: '14px',
          marginBottom: '18px',
        }}>
          <InfoCell label="رقم الجوال" value={lead.customer_phone || '—'} />
          <InfoCell label="الموديل" value={lead.car_models?.name || '—'} />
          <InfoCell label="نوع الدفع" value={payment?.label || lead.payment_type} />
          <InfoCell label="المصدر" value={source?.label || lead.source} />
          <InfoCell label="الفرع" value={lead.branches?.name || '—'} />
          <InfoCell label="المندوب" value={lead.rep?.name || '—'} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '2px solid #e2e8f0' }}>
          {[
            { key: 'timeline', label: '📋 السجل' },
            isRep && { key: 'stage', label: '🔄 تغيير المرحلة' },
            isRep && { key: 'activity', label: '➕ تسجيل نشاط' },
          ].filter(Boolean).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                border: 'none',
                background: 'none',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: activeTab === tab.key ? '700' : '500',
                color: activeTab === tab.key ? '#2563eb' : '#64748b',
                borderBottom: `2px solid ${activeTab === tab.key ? '#2563eb' : 'transparent'}`,
                marginBottom: '-2px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'timeline' && <ActivityLog activities={activities} />}

        {activeTab === 'stage' && isRep && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label>المرحلة الجديدة</label>
              <select value={newStage} onChange={e => setNewStage(e.target.value)}>
                <option value="">اختر المرحلة...</option>
                {STAGES.filter(s => s.key !== lead.stage).map(s => (
                  <option key={s.key} value={s.key}>{s.icon} {s.label}</option>
                ))}
              </select>
            </div>
            {newStage === 'closed_lost' && (
              <div className="form-group">
                <label>سبب الإغلاق *</label>
                <textarea
                  value={lostReason}
                  onChange={e => setLostReason(e.target.value)}
                  rows={3}
                  placeholder="السبب..."
                />
              </div>
            )}
            <button
              className="btn-primary"
              onClick={handleStageChange}
              disabled={!newStage || saving}
            >
              {saving ? 'جاري الحفظ...' : '✅ تحديث المرحلة'}
            </button>
          </div>
        )}

        {activeTab === 'activity' && isRep && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label>نوع النشاط</label>
              <select
                value={actForm.action_type}
                onChange={e => setActForm(f => ({ ...f, action_type: e.target.value }))}
              >
                {ACTION_TYPE_OPTIONS.map(a => (
                  <option key={a.key} value={a.key}>{a.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>ملاحظة</label>
              <textarea
                value={actForm.note}
                onChange={e => setActForm(f => ({ ...f, note: e.target.value }))}
                rows={3}
                placeholder="تفاصيل النشاط..."
              />
            </div>
            <button
              className="btn-primary"
              onClick={handleAddActivity}
              disabled={saving}
            >
              {saving ? 'جاري الحفظ...' : '✅ تسجيل النشاط'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoCell({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{value}</div>
    </div>
  )
}
