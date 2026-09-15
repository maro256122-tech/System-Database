import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { differenceInDays } from 'date-fns'
import { OVERDUE_DAYS, STAGES, SOURCE_OPTIONS } from '../lib/constants'

export function useDashboardData(filters = {}) {
  const { branchId: userBranchId, isHelicopter } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('leads')
        .select(`
          *,
          branches(id, name),
          car_models(id, name)
        `)

      if (filters.branchId) query = query.eq('branch_id', filters.branchId)
      else if (!isHelicopter && userBranchId) query = query.eq('branch_id', userBranchId)

      if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom)
      if (filters.dateTo) query = query.lte('created_at', filters.dateTo + 'T23:59:59')

      const { data: leads } = await query

      if (!leads) {
        setData(getEmptyData())
        return
      }

      // Process analytics
      const totalLeads = leads.length
      const closedWon = leads.filter(l => l.stage === 'closed_won').length
      const closedLost = leads.filter(l => l.stage === 'closed_lost').length
      const overdue = leads.filter(l => {
        const days = differenceInDays(new Date(), new Date(l.updated_at))
        return days >= OVERDUE_DAYS && !['closed_won', 'closed_lost'].includes(l.stage)
      })
      const cvr = totalLeads > 0 ? ((closedWon / totalLeads) * 100).toFixed(1) : 0

      // Funnel data
      const funnelData = STAGES.map(s => ({
        stage: s.label,
        count: leads.filter(l => l.stage === s.key).length,
        color: s.color,
      }))

      // Branch performance
      const branchMap = {}
      leads.forEach(l => {
        const bid = l.branch_id
        const bname = l.branches?.name || 'غير معروف'
        if (!branchMap[bid]) branchMap[bid] = { name: bname, total: 0, won: 0 }
        branchMap[bid].total++
        if (l.stage === 'closed_won') branchMap[bid].won++
      })
      const branchPerformance = Object.values(branchMap).map(b => ({
        ...b,
        cvr: b.total > 0 ? ((b.won / b.total) * 100).toFixed(1) : 0,
      })).sort((a, b) => b.won - a.won)

      // Rep leaderboard
      const repMap = {}
      leads.forEach(l => {
        const rid = l.assigned_rep_id
        if (!rid) return
        const rname = l.rep?.name || 'غير معروف'
        if (!repMap[rid]) repMap[rid] = { name: rname, total: 0, won: 0 }
        repMap[rid].total++
        if (l.stage === 'closed_won') repMap[rid].won++
      })
      const repLeaderboard = Object.values(repMap).map(r => ({
        ...r,
        cvr: r.total > 0 ? ((r.won / r.total) * 100).toFixed(1) : 0,
      })).sort((a, b) => b.won - a.won)

      // Car model distribution
      const carMap = {}
      leads.forEach(l => {
        const cid = l.car_model_id
        if (!cid) return
        const cname = l.car_models?.name || 'غير محدد'
        if (!carMap[cid]) carMap[cid] = { name: cname, total: 0, won: 0 }
        carMap[cid].total++
        if (l.stage === 'closed_won') carMap[cid].won++
      })
      const carModelData = Object.values(carMap).sort((a, b) => b.total - a.total).slice(0, 10)

      // Payment type distribution
      const paymentMap = { cash: 0, installment: 0, bank_finance: 0, murabaha: 0 }
      leads.forEach(l => { if (paymentMap[l.payment_type] !== undefined) paymentMap[l.payment_type]++ })
      const paymentData = [
        { name: 'كاش', value: paymentMap.cash },
        { name: 'تقسيط', value: paymentMap.installment },
        { name: 'تمويل بنكي', value: paymentMap.bank_finance },
        { name: 'مرابحة', value: paymentMap.murabaha },
      ].filter(p => p.value > 0)

      // Source breakdown — dynamic across all SOURCE_OPTIONS
      const sourceData = SOURCE_OPTIONS
        .map(src => {
          const srcLeads = leads.filter(l => l.source === src.key)
          if (srcLeads.length === 0) return null
          const won = srcLeads.filter(l => l.stage === 'closed_won').length
          return {
            key: src.key,
            name: src.label,
            total: srcLeads.length,
            won,
            cvr: ((won / srcLeads.length) * 100).toFixed(1),
          }
        })
        .filter(Boolean)
        .sort((a, b) => b.total - a.total)

      // Weekly trend (last 8 weeks)
      const trendData = buildWeeklyTrend(leads)

      // Monthly trend (last 6 months)
      const monthlyData = buildMonthlyTrend(leads)

      // Active leads (not closed)
      const activeLeads = leads.filter(l => !['closed_won', 'closed_lost'].includes(l.stage)).length

      // Avg days to close (won leads only)
      const wonLeads = leads.filter(l => l.stage === 'closed_won')
      const avgDaysToClose = wonLeads.length > 0
        ? Math.round(wonLeads.reduce((sum, l) => {
            return sum + differenceInDays(new Date(l.updated_at), new Date(l.created_at))
          }, 0) / wonLeads.length)
        : 0

      // Stage velocity (count per stage for active leads)
      const activeStageMap = {}
      leads.filter(l => !['closed_won', 'closed_lost'].includes(l.stage)).forEach(l => {
        activeStageMap[l.stage] = (activeStageMap[l.stage] || 0) + 1
      })

      setData({
        totalLeads,
        closedWon,
        closedLost,
        cvr,
        activeLeads,
        avgDaysToClose,
        overdue: overdue.length,
        overdueLeads: overdue.slice(0, 10),
        funnelData,
        branchPerformance,
        repLeaderboard,
        carModelData,
        paymentData,
        sourceData,
        trendData,
        monthlyData,
        rawLeads: leads,
      })
    } catch (err) {
      console.error('Dashboard error:', err)
      setData(getEmptyData())
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters), userBranchId, isHelicopter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, refetch: fetchData }
}

function buildMonthlyTrend(leads) {
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    const monthLeads = leads.filter(l => {
      const c = new Date(l.created_at)
      return c >= d && c <= end
    })
    months.push({
      month: d.toLocaleDateString('ar-SA', { month: 'short', year: '2-digit' }),
      total: monthLeads.length,
      won: monthLeads.filter(l => l.stage === 'closed_won').length,
      lost: monthLeads.filter(l => l.stage === 'closed_lost').length,
    })
  }
  return months
}

function buildWeeklyTrend(leads) {
  const weeks = []
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - i * 7 - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    const weekLeads = leads.filter(l => {
      const d = new Date(l.created_at)
      return d >= weekStart && d <= weekEnd
    })

    weeks.push({
      week: `أسبوع ${8 - i}`,
      total: weekLeads.length,
      won: weekLeads.filter(l => l.stage === 'closed_won').length,
    })
  }
  return weeks
}

function getEmptyData() {
  return {
    totalLeads: 0, closedWon: 0, closedLost: 0, cvr: 0,
    activeLeads: 0, avgDaysToClose: 0,
    overdue: 0, overdueLeads: [],
    funnelData: [], branchPerformance: [], repLeaderboard: [],
    carModelData: [], paymentData: [], sourceData: [],
    trendData: [], monthlyData: [], rawLeads: [],
  }
}
