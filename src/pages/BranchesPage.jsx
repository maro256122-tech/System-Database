import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function BranchesPage() {
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [leadCounts, setLeadCounts] = useState({})

  useEffect(() => {
    fetchBranches()
  }, [])

  async function fetchBranches() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('branches')
        .select('*, owner:user_profiles!owner_user_id(id, name)')
        .order('name')
      setBranches(data || [])

      // Get lead counts per branch
      const { data: counts } = await supabase
        .from('leads')
        .select('branch_id')
      const countMap = {}
      ;(counts || []).forEach(l => {
        countMap[l.branch_id] = (countMap[l.branch_id] || 0) + 1
      })
      setLeadCounts(countMap)
    } catch (err) {
      toast.error('حدث خطأ في التحميل')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🏢 إدارة الفروع</h1>
        <span style={{ fontSize: '13px', color: '#64748b' }}>{branches.length} فرع</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>⏳ جاري التحميل...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
          {branches.map((branch, i) => (
            <div key={branch.id} className="card" style={{ borderRight: '4px solid #2563eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  width: '40px', height: '40px',
                  background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '800',
                  fontSize: '16px',
                }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '15px' }}>{branch.name}</div>
                  {branch.owner?.name && (
                    <div style={{ fontSize: '12px', color: '#64748b' }}>مالك: {branch.owner.name}</div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1, background: '#f8fafc', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#2563eb' }}>
                    {leadCounts[branch.id] || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>عميل</div>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px' }}>
                أُنشئ: {new Date(branch.created_at).toLocaleDateString('ar-SA')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
