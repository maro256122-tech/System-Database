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
            {act.user?.name && <span style={{ fontWeight: '700', color: '#374151' }}> · {act.user.name}</span>}
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
            <div style={{
              fontSize: '13px', color: '#475569', marginTop: '4px',
              background: '#f8fafc', padding: '8px 12px', borderRadius: '8px',
              borderRight: '3px solid #e2e8f0',
            }}>
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

// ── Context-aware quick action block ──────────────────────────────
function ContextBlock({ color, children }) {
  return (
    <div style={{
      background: color + '08',
      border: `1.5px solid ${color}30`,
      borderRadius: '12px',
      padding: '16px',
    }}>
      {children}
    </div>
  )
}

const BTN = {
  green:  { background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #bbf7d0' },
  red:    { background: '#fef2f2', color: '#dc2626', border: '1.5px solid #fecaca' },
  amber:  { background: '#fffbeb', color: '#d97706', border: '1.5px solid #fde68a' },
  gray:   { background: '#f8fafc', color: '#64748b', border: '1.5px solid #e2e8f0' },
}
function QuickBtn({ variant = 'gray', onClick, children, disabled }) {
  const s = BTN[variant]
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...s,
        borderRadius: '10px', padding: '10px 16px', fontSize: '13px',
        fontWeight: '700', cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'Cairo, sans-serif', opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  )
}

// ══════════════════════════════════════════════════════════════════
export default function LeadDetailModal({ leadId, onClose, onUpdate }) {
  const { user, isRep, isHelicopter, isBranchOwner } = useAuth()
  const { lead, activities, loading, refetch } = useLead(leadId)
  const [activeTab, setActiveTab] = useState('timeline')
  const [saving, setSaving] = useState(false)

  // General stage change
  const [newStage, setNewStage] = useState('')
  const [lostReason, setLostReason] = useState('')

  // Pipeline flow states
  const [pipelineMode, setPipelineMode] = useState('default')
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpNote, setFollowUpNote] = useState('')
  const [rescheduleDate, setRescheduleDate] = useState('')

  // Deposit / financial
  const [depositAmount, setDepositAmount] = useState('')
  const [depositDate, setDepositDate] = useState('')
  const [editingDeposit, setEditingDeposit] = useState(false)

  // Activity add
  const [actForm, setActForm] = useState({ action_type: 'contact_attempt', note: '' })

  const canEdit = isRep || isHelicopter || isBranchOwner

  // ── Handlers ────────────────────────────────────────────────────

  async function handleStageChange() {
    if (!newStage || newStage === lead.stage) return
    if (newStage === 'closed_lost' && !lostReason.trim()) {
      return toast.error('يرجى إدخال سبب الإغلاق')
    }
    setSaving(true)
    try {
      const updateData = { stage: newStage }
      if (newStage === 'closed_lost') updateData.lost_reason = lostReason
      if (newStage === 'deposit_paid' && depositAmount) {
        updateData.deposit_amount = parseFloat(depositAmount)
        updateData.deposit_date = depositDate || new Date().toISOString().split('T')[0]
      }

      await supabase.from('leads').update(updateData).eq('id', leadId)

      const actNote = newStage === 'closed_lost'
        ? `سبب الإغلاق: ${lostReason}`
        : (newStage === 'deposit_paid' && depositAmount)
          ? `تسجيل عربون: ${parseFloat(depositAmount).toLocaleString('ar-SA')} ر.س`
          : null

      await supabase.from('activities').insert({
        lead_id: leadId,
        user_id: user.id,
        action_type: 'stage_changed',
        from_stage: lead.stage,
        to_stage: newStage,
        note: actNote,
      })

      toast.success('تم تحديث المرحلة ✅')
      setNewStage(''); setLostReason(''); setDepositAmount(''); setDepositDate('')
      refetch(); onUpdate?.()
    } catch (err) {
      toast.error('خطأ: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleContactResponded(responded) {
    setSaving(true)
    try {
      if (responded) {
        const { error: updateErr } = await supabase.from('leads').update({ stage: 'inquiry_replied', contact_responded: true }).eq('id', leadId)
        if (updateErr) throw updateErr
        supabase.from('activities').insert({
          lead_id: leadId, user_id: user.id,
          action_type: 'stage_changed',
          from_stage: 'contacted', to_stage: 'inquiry_replied',
          note: 'العميل رد على التواصل',
        }).then(({ error }) => { if (error) console.warn('Activity log:', error.message) })
        toast.success('تم الانتقال لمرحلة "تم الرد" ✅')
      } else {
        if (!followUpDate) return toast.error('يرجى تحديد موعد المتابعة')
        const { error: updateErr } = await supabase.from('leads').update({ contact_responded: false, follow_up_date: followUpDate }).eq('id', leadId)
        if (updateErr) throw updateErr
        supabase.from('activities').insert({
          lead_id: leadId, user_id: user.id,
          action_type: 'contact_no_response',
          note: `لم يرد العميل. موعد المتابعة: ${followUpDate}${followUpNote ? ' — ' + followUpNote : ''}`,
        }).then(({ error }) => { if (error) console.warn('Activity log:', error.message) })
        toast.success('تم تسجيل المتابعة ✅')
      }
      setPipelineMode('default'); setFollowUpDate(''); setFollowUpNote('')
      refetch(); onUpdate?.()
    } catch (err) {
      toast.error('خطأ: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleVisitResult(attended) {
    setSaving(true)
    try {
      if (attended) {
        const updateData = { stage: 'deposit_paid', visit_attended: true }
        if (depositAmount) {
          updateData.deposit_amount = parseFloat(depositAmount)
          updateData.deposit_date = depositDate || new Date().toISOString().split('T')[0]
        }
        const { error: updateErr } = await supabase.from('leads').update(updateData).eq('id', leadId)
        if (updateErr) throw updateErr
        supabase.from('activities').insert({
          lead_id: leadId, user_id: user.id,
          action_type: 'stage_changed',
          from_stage: 'visit_booked', to_stage: 'deposit_paid',
          note: depositAmount ? `حضر العميل الزيارة. عربون: ${parseFloat(depositAmount).toLocaleString('ar-SA')} ر.س` : 'حضر العميل الزيارة',
        }).then(({ error }) => { if (error) console.warn('Activity log:', error.message) })
        if (depositAmount) {
          supabase.from('activities').insert({
            lead_id: leadId, user_id: user.id,
            action_type: 'deposit_recorded',
            note: `مبلغ العربون: ${parseFloat(depositAmount).toLocaleString('ar-SA')} ر.س — التاريخ: ${depositDate || 'اليوم'}`,
          }).then(({ error }) => { if (error) console.warn('Activity log:', error.message) })
        }
        toast.success('تم تسجيل الزيارة والانتقال لمرحلة العربون ✅')
      } else {
        if (!rescheduleDate) return toast.error('يرجى تحديد تاريخ إعادة الجدولة')
        const { error: updateErr } = await supabase.from('leads').update({ visit_attended: false, reschedule_date: rescheduleDate }).eq('id', leadId)
        if (updateErr) throw updateErr
        supabase.from('activities').insert({
          lead_id: leadId, user_id: user.id,
          action_type: 'visit_no_show',
          note: `العميل لم يحضر الزيارة. إعادة الجدولة: ${rescheduleDate}`,
        }).then(({ error }) => { if (error) console.warn('Activity log:', error.message) })
        toast.success('تم تسجيل إعادة الجدولة ✅')
      }
      setPipelineMode('default'); setRescheduleDate(''); setDepositAmount(''); setDepositDate('')
      refetch(); onUpdate?.()
    } catch (err) {
      toast.error('خطأ: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDepositSave() {
    if (!depositAmount) return toast.error('يرجى إدخال مبلغ العربون')
    setSaving(true)
    try {
      const { error: updateErr } = await supabase.from('leads').update({
        deposit_amount: parseFloat(depositAmount),
        deposit_date: depositDate || new Date().toISOString().split('T')[0],
      }).eq('id', leadId)
      if (updateErr) throw updateErr
      supabase.from('activities').insert({
        lead_id: leadId, user_id: user.id,
        action_type: 'deposit_recorded',
        note: `تسجيل/تحديث العربون: ${parseFloat(depositAmount).toLocaleString('ar-SA')} ر.س — التاريخ: ${depositDate || 'اليوم'}`,
      }).then(({ error }) => { if (error) console.warn('Activity log:', error.message) })
      toast.success('تم حفظ تفاصيل العربون ✅')
      setEditingDeposit(false); refetch(); onUpdate?.()
    } catch (err) {
      toast.error('خطأ في الحفظ: ' + err.message)
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
      await supabase.from('leads').update({ updated_at: new Date().toISOString() }).eq('id', leadId)
      toast.success('تم تسجيل النشاط ✅')
      setActForm({ action_type: 'contact_attempt', note: '' })
      refetch(); onUpdate?.()
    } catch (err) {
      toast.error('خطأ: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Loading / empty states ────────────────────────────────────────

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
  const source  = SOURCE_OPTIONS.find(s => s.key === lead.source)

  const inputStyle = {
    border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px',
    fontFamily: 'Cairo, sans-serif', fontSize: '13px', color: '#1e293b',
    background: '#fafafa', width: '100%', boxSizing: 'border-box', outline: 'none',
  }

  const tabs = [
    { key: 'timeline',  label: '📋 السجل' },
    canEdit && { key: 'stage',     label: '🔄 تغيير المرحلة' },
    canEdit && { key: 'activity',  label: '➕ تسجيل نشاط' },
    { key: 'financial', label: '💰 المالية' },
  ].filter(Boolean)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '700px' }}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{lead.customer_name}</h2>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
              <StageBadge stage={lead.stage} />
              {lead.isOverdue && <span className="overdue-badge">⚠️ متأخر</span>}
              {lead.visit_attended === false && (
                <span className="badge" style={{ background: '#fef3c720', color: '#d97706' }}>📅 لم يحضر</span>
              )}
              {lead.contact_responded === false && (
                <span className="badge" style={{ background: '#fef2f220', color: '#dc2626' }}>📞 لم يرد</span>
              )}
            </div>
          </div>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '6px 12px' }}>✕</button>
        </div>

        {/* Info grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px',
          background: '#f8fafc', borderRadius: '10px', padding: '14px', marginBottom: '18px',
        }}>
          <InfoCell label="رقم الجوال"  value={lead.customer_phone || '—'} />
          <InfoCell label="الموديل"     value={lead.car_models?.name || '—'} />
          <InfoCell label="نوع الدفع"   value={payment?.label || lead.payment_type} />
          <InfoCell label="المصدر"      value={source?.label || lead.source} />
          <InfoCell label="الفرع"       value={lead.branches?.name || '—'} />
          <InfoCell label="المندوب"     value={lead.rep?.name || '—'} />
          {lead.reschedule_date && (
            <InfoCell label="📅 إعادة جدولة" value={lead.reschedule_date} highlight="#fef3c7" />
          )}
          {lead.follow_up_date && (
            <InfoCell label="📞 موعد متابعة" value={lead.follow_up_date} highlight="#eff6ff" />
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '2px solid #e2e8f0' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                border: 'none', background: 'none', padding: '8px 14px', fontSize: '13px',
                fontWeight: activeTab === tab.key ? '700' : '500',
                color: activeTab === tab.key ? '#2563eb' : '#64748b',
                borderBottom: `2px solid ${activeTab === tab.key ? '#2563eb' : 'transparent'}`,
                marginBottom: '-2px', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Timeline ── */}
        {activeTab === 'timeline' && <ActivityLog activities={activities} />}

        {/* ── Tab: Stage Change ── */}
        {activeTab === 'stage' && canEdit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* CONTACTED → did they respond? */}
            {lead.stage === 'contacted' && pipelineMode === 'default' && (
              <ContextBlock color="#3b82f6">
                <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '12px', color: '#1e3a5f' }}>
                  📞 هل رد العميل على التواصل؟
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <QuickBtn variant="green" onClick={() => handleContactResponded(true)} disabled={saving}>
                    ✅ رد — انتقل لمرحلة "تم الرد"
                  </QuickBtn>
                  <QuickBtn variant="red" onClick={() => setPipelineMode('no_response')} disabled={saving}>
                    ❌ لم يرد — جدولة متابعة
                  </QuickBtn>
                </div>
              </ContextBlock>
            )}

            {lead.stage === 'contacted' && pipelineMode === 'no_response' && (
              <ContextBlock color="#dc2626">
                <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '12px', color: '#7f1d1d' }}>
                  📅 تحديد موعد المتابعة
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input type="date" style={inputStyle} value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
                  <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2}
                    placeholder="ملاحظة (اختياري)..."
                    value={followUpNote} onChange={e => setFollowUpNote(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <QuickBtn variant="green" onClick={() => handleContactResponded(false)} disabled={saving}>
                      {saving ? '⏳' : '✅ تسجيل المتابعة'}
                    </QuickBtn>
                    <QuickBtn variant="gray" onClick={() => setPipelineMode('default')}>رجوع</QuickBtn>
                  </div>
                </div>
              </ContextBlock>
            )}

            {/* VISIT_BOOKED → did they show up? */}
            {lead.stage === 'visit_booked' && pipelineMode === 'default' && (
              <ContextBlock color="#14b8a6">
                <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '12px', color: '#134e4a' }}>
                  📅 نتيجة الزيارة
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <QuickBtn variant="green" onClick={() => setPipelineMode('attended')} disabled={saving}>
                    ✅ حضر العميل
                  </QuickBtn>
                  <QuickBtn variant="amber" onClick={() => setPipelineMode('noshow')} disabled={saving}>
                    📅 لم يحضر — إعادة جدولة
                  </QuickBtn>
                  <QuickBtn variant="red" onClick={() => { setNewStage('closed_lost'); setPipelineMode('manual') }} disabled={saving}>
                    ❌ إلغاء وخسارة
                  </QuickBtn>
                </div>
              </ContextBlock>
            )}

            {lead.stage === 'visit_booked' && pipelineMode === 'attended' && (
              <ContextBlock color="#22c55e">
                <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '12px', color: '#14532d' }}>
                  💰 تفاصيل العربون (اختياري)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>مبلغ العربون (ر.س)</div>
                    <input type="number" style={inputStyle} placeholder="مثال: 5000"
                      value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>تاريخ الاستلام</div>
                    <input type="date" style={inputStyle} value={depositDate}
                      onChange={e => setDepositDate(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <QuickBtn variant="green" onClick={() => handleVisitResult(true)} disabled={saving}>
                    {saving ? '⏳' : '✅ تأكيد الحضور والانتقال لمرحلة العربون'}
                  </QuickBtn>
                  <QuickBtn variant="gray" onClick={() => setPipelineMode('default')}>رجوع</QuickBtn>
                </div>
              </ContextBlock>
            )}

            {lead.stage === 'visit_booked' && pipelineMode === 'noshow' && (
              <ContextBlock color="#f59e0b">
                <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '12px', color: '#78350f' }}>
                  📅 إعادة جدولة الزيارة
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>تاريخ الزيارة الجديدة</div>
                  <input type="date" style={inputStyle} value={rescheduleDate}
                    onChange={e => setRescheduleDate(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <QuickBtn variant="amber" onClick={() => handleVisitResult(false)} disabled={saving}>
                    {saving ? '⏳' : '📅 تأكيد إعادة الجدولة'}
                  </QuickBtn>
                  <QuickBtn variant="gray" onClick={() => setPipelineMode('default')}>رجوع</QuickBtn>
                </div>
              </ContextBlock>
            )}

            {/* Deposit fields when moving to deposit_paid manually */}
            {newStage === 'deposit_paid' && (
              <ContextBlock color="#22c55e">
                <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '10px', color: '#14532d' }}>
                  💰 تفاصيل العربون
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>مبلغ العربون (ر.س)</div>
                    <input type="number" style={inputStyle} placeholder="مثال: 5000"
                      value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>تاريخ الاستلام</div>
                    <input type="date" style={inputStyle} value={depositDate}
                      onChange={e => setDepositDate(e.target.value)} />
                  </div>
                </div>
              </ContextBlock>
            )}

            {/* Separator before manual control */}
            {!['no_response', 'attended', 'noshow'].includes(pipelineMode) && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>تغيير يدوي للمرحلة</span>
                  <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                </div>

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
                    <textarea value={lostReason} onChange={e => setLostReason(e.target.value)} rows={3} placeholder="السبب..." />
                  </div>
                )}

                {newStage && (
                  <button className="btn-primary" onClick={handleStageChange} disabled={!newStage || saving}>
                    {saving ? 'جاري الحفظ...' : '✅ تحديث المرحلة'}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Tab: Add Activity ── */}
        {activeTab === 'activity' && canEdit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label>نوع النشاط</label>
              <select value={actForm.action_type} onChange={e => setActForm(f => ({ ...f, action_type: e.target.value }))}>
                {ACTION_TYPE_OPTIONS.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>ملاحظة</label>
              <textarea value={actForm.note} onChange={e => setActForm(f => ({ ...f, note: e.target.value }))}
                rows={3} placeholder="تفاصيل النشاط..." />
            </div>
            <button className="btn-primary" onClick={handleAddActivity} disabled={saving}>
              {saving ? 'جاري الحفظ...' : '✅ تسجيل النشاط'}
            </button>
          </div>
        )}

        {/* ── Tab: Financial ── */}
        {activeTab === 'financial' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Deposit summary */}
            <div style={{
              background: lead.deposit_amount ? '#f0fdf4' : '#f8fafc',
              border: `1.5px solid ${lead.deposit_amount ? '#bbf7d0' : '#e2e8f0'}`,
              borderRadius: '12px', padding: '18px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', color: lead.deposit_amount ? '#14532d' : '#94a3b8', marginBottom: '12px' }}>
                  💰 تفاصيل العربون
                </div>
                {canEdit && (
                  <button
                    onClick={() => {
                      setEditingDeposit(!editingDeposit)
                      if (!editingDeposit) {
                        setDepositAmount(lead.deposit_amount ? String(lead.deposit_amount) : '')
                        setDepositDate(lead.deposit_date || '')
                      }
                    }}
                    style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: '700' }}
                  >
                    {editingDeposit ? 'إلغاء' : '✏️ تعديل'}
                  </button>
                )}
              </div>

              {!editingDeposit ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>مبلغ العربون</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#16a34a' }}>
                      {lead.deposit_amount ? lead.deposit_amount.toLocaleString('ar-SA') + ' ر.س' : '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>تاريخ الاستلام</div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                      {lead.deposit_date ? format(new Date(lead.deposit_date), 'dd/MM/yyyy') : '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>نوع التمويل</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                      {payment?.label || lead.payment_type}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '3px' }}>المندوب المسؤول</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                      {lead.rep?.name || '—'}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>مبلغ العربون (ر.س)</div>
                      <input type="number" style={inputStyle} placeholder="مثال: 5000"
                        value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>تاريخ الاستلام</div>
                      <input type="date" style={inputStyle} value={depositDate}
                        onChange={e => setDepositDate(e.target.value)} />
                    </div>
                  </div>
                  <button className="btn-primary" onClick={handleDepositSave} disabled={saving}>
                    {saving ? '⏳' : '💾 حفظ التفاصيل المالية'}
                  </button>
                </div>
              )}
            </div>

            {/* Financial activity history */}
            <div>
              <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '10px', color: '#374151' }}>
                📋 سجل التغييرات المالية
              </div>
              {activities.filter(a => ['deposit_recorded', 'stage_changed'].includes(a.action_type) && a.note?.includes('ر.س')).length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '13px' }}>لا توجد سجلات مالية بعد</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activities
                    .filter(a => ['deposit_recorded', 'stage_changed'].includes(a.action_type) && a.note?.includes('ر.س'))
                    .map(act => (
                      <div key={act.id} style={{
                        background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#14532d' }}>{act.note}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                            {act.user?.name || '—'} · {formatDistanceToNow(new Date(act.created_at), { locale: ar, addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoCell({ label, value, highlight }) {
  return (
    <div style={highlight ? { background: highlight, borderRadius: '6px', padding: '4px 8px' } : {}}>
      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{value}</div>
    </div>
  )
}
