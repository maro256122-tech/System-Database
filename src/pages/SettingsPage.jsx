import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [carModels, setCarModels] = useState([])
  const [newModel, setNewModel] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('car_models').select('*').order('name')
      .then(r => setCarModels(r.data || []))
  }, [])

  async function addCarModel() {
    if (!newModel.trim()) return
    setSaving(true)
    try {
      const { data } = await supabase
        .from('car_models')
        .insert({ name: newModel.trim() })
        .select()
        .single()
      setCarModels(m => [...m, data])
      setNewModel('')
      toast.success('تم إضافة الموديل ✅')
    } catch {
      toast.error('حدث خطأ')
    } finally {
      setSaving(false)
    }
  }

  async function deleteCarModel(id) {
    try {
      await supabase.from('car_models').delete().eq('id', id)
      setCarModels(m => m.filter(x => x.id !== id))
      toast.success('تم الحذف')
    } catch {
      toast.error('لا يمكن الحذف — الموديل مرتبط بعملاء')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">⚙️ الإعدادات</h1>
      </div>

      <div style={{ maxWidth: '600px' }}>
        {/* Car Models */}
        <div className="card">
          <h3 style={{ fontWeight: '700', marginBottom: '16px' }}>🚗 موديلات السيارات</h3>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <input
              value={newModel}
              onChange={e => setNewModel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCarModel()}
              placeholder="اسم الموديل..."
              style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', fontFamily: 'inherit', fontSize: '14px', direction: 'rtl' }}
            />
            <button className="btn-primary" onClick={addCarModel} disabled={saving}>
              {saving ? '...' : '➕ إضافة'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {carModels.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}>
                <span style={{ fontSize: '14px' }}>🚗 {m.name}</span>
                <button
                  className="btn-danger"
                  onClick={() => deleteCarModel(m.id)}
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                >
                  حذف
                </button>
              </div>
            ))}
            {carModels.length === 0 && (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>لا توجد موديلات</p>
            )}
          </div>
        </div>

        {/* Info card */}
        <div className="card" style={{ marginTop: '16px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <h4 style={{ fontWeight: '700', color: '#1e40af', marginBottom: '8px' }}>ℹ️ معلومات النظام</h4>
          <p style={{ fontSize: '13px', color: '#1e40af', lineHeight: '1.7' }}>
            لإضافة فروع أو مستخدمين جدد، يرجى التواصل مع مدير النظام أو استخدام لوحة Supabase مباشرة.
          </p>
        </div>
      </div>
    </div>
  )
}
