import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { SOURCE_OPTIONS, PAYMENT_TYPES } from '../lib/constants'
import toast from 'react-hot-toast'

const INTEREST_LEVELS = [
  { key: 'hot', label: '🔥 حار — جاهز للشراء', color: '#dc2626' },
  { key: 'warm', label: '🌡️ دافئ — مهتم بجدية', color: '#d97706' },
  { key: 'cold', label: '❄️ بارد — يستكشف فقط', color: '#0284c7' },
]

function FieldGroup({ label, icon, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '13px', fontWeight: '700', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '15px' }}>{icon}</span>
        {label}
        {required && <span style={{ color: '#dc2626', fontWeight: '900' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function SectionDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '6px 0 2px' }}>
      <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
      <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
    </div>
  )
}

export default function AddLeadModal({ onClose, onSuccess }) {
  const { user, branchId, isHelicopter } = useAuth()
  const [carModels, setCarModels] = useState([])
  const [branches, setBranches] = useState([])
  const [saving, setSaving] = useState(false)
  const [interestLevel, setInterestLevel] = useState('warm')

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    source: 'message',
    payment_type: 'cash',
    car_model_id: '',
    branch_id: branchId || '',
    note: '',
    budget_range: '',
  })

  useEffect(() => {
    async function fetchData() {
      const [modelsRes, branchesRes] = await Promise.all([
        supabase.from('car_models').select('id, name, category').order('name'),
        isHelicopter ? supabase.from('branches').select('id, name').order('name') : Promise.resolve({ data: [] }),
      ])
      setCarModels(modelsRes.data || [])
      setBranches(branchesRes.data || [])
    }
    fetchData()
  }, [isHelicopter])

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.customer_name.trim()) return toast.error('اسم العميل مطلوب')
    if (!form.branch_id) return toast.error('الفرع مطلوب')

    setSaving(true)
    try {
      const { data: lead, error: leadErr } = await supabase
        .from('leads')
        .insert({
          customer_name: form.customer_name.trim(),
          customer_phone: form.customer_phone.trim() || null,
          source: form.source,
          payment_type: form.payment_type,
          car_model_id: form.car_model_id || null,
          branch_id: form.branch_id,
          assigned_rep_id: user.id,
          stage: 'lead_in',
        })
        .select()
        .single()

      if (leadErr) throw leadErr

      const noteText = form.note.trim() ||
        `عميل جديد — ${form.source === 'message' ? 'رسالة' : 'زيارة'} — اهتمام: ${INTEREST_LEVELS.find(l => l.key === interestLevel)?.label || ''}`

      await supabase.from('activities').insert({
        lead_id: lead.id,
        user_id: user.id,
        action_type: 'lead_created',
        note: noteText,
      })

      toast.success('✅ تم إضافة العميل بنجاح')
      onSuccess?.()
      onClose()
    } catch (err) {
      toast.error('حدث خطأ: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    padding: '10px 14px',
    fontFamily: 'Cairo, sans-serif',
    fontSize: '13px',
    color: '#1e293b',
    background: '#fafafa',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.15s',
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '560px', width: '100%' }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
          borderRadius: '16px 16px 0 0',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '-24px -24px 20px',
        }}>
          <div>
            <div style={{ color: 'white', fontWeight: '800', fontSize: '17px' }}>➕ إضافة عميل جديد</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '12px', marginTop: '2px' }}>أدخل بيانات العميل المهتم</div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            width: '32px', height: '32px',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* ── Section 1: Customer Info ── */}
          <SectionDivider label="معلومات العميل" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FieldGroup label="اسم العميل" icon="👤" required>
              <input
                style={inputStyle}
                value={form.customer_name}
                onChange={e => setField('customer_name', e.target.value)}
                placeholder="محمد عبدالله"
                required
              />
            </FieldGroup>

            <FieldGroup label="رقم الجوال" icon="📱">
              <input
                style={{ ...inputStyle, direction: 'ltr', textAlign: 'left' }}
                value={form.customer_phone}
                onChange={e => setField('customer_phone', e.target.value)}
                placeholder="05xxxxxxxx"
                type="tel"
              />
            </FieldGroup>
          </div>

          {/* ── Section 2: Deal Details ── */}
          <SectionDivider label="تفاصيل الطلب" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <FieldGroup label="مصدر العميل" icon="📡" required>
              <select style={inputStyle} value={form.source} onChange={e => setField('source', e.target.value)}>
                {SOURCE_OPTIONS.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </FieldGroup>

            <FieldGroup label="نوع التمويل" icon="💳" required>
              <select style={inputStyle} value={form.payment_type} onChange={e => setField('payment_type', e.target.value)}>
                {PAYMENT_TYPES.map(p => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </FieldGroup>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isHelicopter ? '1fr 1fr' : '1fr', gap: '12px' }}>
            <FieldGroup label="الموديل المطلوب" icon="🚗">
              <select style={inputStyle} value={form.car_model_id} onChange={e => setField('car_model_id', e.target.value)}>
                <option value="">اختر الموديل...</option>
                {carModels.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </FieldGroup>

            {isHelicopter && (
              <FieldGroup label="الفرع" icon="🏢" required>
                <select style={inputStyle} value={form.branch_id} onChange={e => setField('branch_id', e.target.value)} required>
                  <option value="">اختر الفرع...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </FieldGroup>
            )}
          </div>

          {/* ── Section 3: Interest Level ── */}
          <SectionDivider label="مستوى الاهتمام" />

          <div style={{ display: 'flex', gap: '8px' }}>
            {INTEREST_LEVELS.map(lvl => (
              <button
                key={lvl.key}
                type="button"
                onClick={() => setInterestLevel(lvl.key)}
                style={{
                  flex: 1,
                  padding: '8px 6px',
                  borderRadius: '10px',
                  border: `2px solid ${interestLevel === lvl.key ? lvl.color : '#e2e8f0'}`,
                  background: interestLevel === lvl.key ? lvl.color + '12' : 'white',
                  color: interestLevel === lvl.key ? lvl.color : '#64748b',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontFamily: 'Cairo, sans-serif',
                  transition: 'all 0.15s',
                  textAlign: 'center',
                }}
              >
                {lvl.label}
              </button>
            ))}
          </div>

          {/* ── Section 4: Notes ── */}
          <SectionDivider label="ملاحظات" />

          <FieldGroup label="ملاحظة أولية" icon="📝">
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' }}
              value={form.note}
              onChange={e => setField('note', e.target.value)}
              placeholder="اكتب أي تفاصيل إضافية عن العميل أو طلبه..."
              rows={3}
            />
          </FieldGroup>

          {/* ── Actions ── */}
          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                background: saving ? '#94a3b8' : 'linear-gradient(135deg, #1e3a5f, #2563eb)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: '800',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'Cairo, sans-serif',
                transition: 'opacity 0.15s',
              }}
            >
              {saving ? '⏳ جاري الحفظ...' : '✅ حفظ العميل'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '12px 20px',
                background: '#f1f5f9',
                color: '#64748b',
                border: '1.5px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                fontFamily: 'Cairo, sans-serif',
              }}
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
