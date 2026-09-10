import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { SOURCE_OPTIONS, PAYMENT_TYPES } from '../lib/constants'
import toast from 'react-hot-toast'

export default function AddLeadModal({ onClose, onSuccess }) {
  const { user, branchId, isHelicopter } = useAuth()
  const [carModels, setCarModels] = useState([])
  const [branches, setBranches] = useState([])
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    source: 'message',
    payment_type: 'cash',
    car_model_id: '',
    branch_id: branchId || '',
    note: '',
  })

  useEffect(() => {
    async function fetchData() {
      const [modelsRes, branchesRes] = await Promise.all([
        supabase.from('car_models').select('id, name').order('name'),
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
      // Create lead
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

      // Log activity
      await supabase.from('activities').insert({
        lead_id: lead.id,
        user_id: user.id,
        action_type: 'lead_created',
        note: form.note || (form.source === 'message' ? 'عميل جديد — رسالة' : 'عميل جديد — زيارة'),
      })

      toast.success('تم إضافة العميل بنجاح ✅')
      onSuccess?.()
      onClose()
    } catch (err) {
      toast.error('حدث خطأ: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">➕ إضافة عميل جديد</h2>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '6px 12px' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Customer Name */}
          <div className="form-group">
            <label>اسم العميل *</label>
            <input
              value={form.customer_name}
              onChange={e => setField('customer_name', e.target.value)}
              placeholder="محمد عبدالله"
              required
            />
          </div>

          {/* Phone */}
          <div className="form-group">
            <label>رقم الجوال</label>
            <input
              value={form.customer_phone}
              onChange={e => setField('customer_phone', e.target.value)}
              placeholder="05xxxxxxxx"
              dir="ltr"
            />
          </div>

          {/* Source + Payment (side by side) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>المصدر *</label>
              <select value={form.source} onChange={e => setField('source', e.target.value)}>
                {SOURCE_OPTIONS.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>نوع الدفع *</label>
              <select value={form.payment_type} onChange={e => setField('payment_type', e.target.value)}>
                {PAYMENT_TYPES.map(p => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Car Model */}
          <div className="form-group">
            <label>الموديل</label>
            <select value={form.car_model_id} onChange={e => setField('car_model_id', e.target.value)}>
              <option value="">اختر الموديل...</option>
              {carModels.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Branch (for helicopter only) */}
          {isHelicopter && (
            <div className="form-group">
              <label>الفرع *</label>
              <select value={form.branch_id} onChange={e => setField('branch_id', e.target.value)} required>
                <option value="">اختر الفرع...</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Note */}
          <div className="form-group">
            <label>ملاحظة أولية</label>
            <textarea
              value={form.note}
              onChange={e => setField('note', e.target.value)}
              rows={3}
              placeholder="أي تفاصيل إضافية..."
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-start', marginTop: '6px' }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'جاري الحفظ...' : '✅ حفظ العميل'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  )
}
