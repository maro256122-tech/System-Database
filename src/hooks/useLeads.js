import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { differenceInDays } from 'date-fns'
import { OVERDUE_DAYS } from '../lib/constants'

export function useLeads(filters = {}) {
  const { isHelicopter, branchId } = useAuth()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('leads')
        .select(`
          *,
          branches(id, name),
          car_models(id, name, category)
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.branchId) query = query.eq('branch_id', filters.branchId)
      if (filters.stage) query = query.eq('stage', filters.stage)
      if (filters.source) query = query.eq('source', filters.source)
      if (filters.carModelId) query = query.eq('car_model_id', filters.carModelId)
      if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom)
      if (filters.dateTo) query = query.lte('created_at', filters.dateTo + 'T23:59:59')

      const { data, error } = await query

      if (error) throw error

      // Mark overdue leads
      const withOverdue = (data || []).map(lead => {
        const daysSinceActivity = differenceInDays(new Date(), new Date(lead.updated_at))
        return {
          ...lead,
          isOverdue: daysSinceActivity >= OVERDUE_DAYS && !['closed_won', 'closed_lost'].includes(lead.stage)
        }
      })

      setLeads(withOverdue)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  return { leads, loading, error, refetch: fetchLeads }
}

export function useLead(leadId) {
  const [lead, setLead] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchLead = useCallback(async () => {
    if (!leadId) return
    try {
      setLoading(true)
      const [leadRes, actRes] = await Promise.all([
        supabase
          .from('leads')
          .select(`*, branches(id, name), car_models(id, name)`)
          .eq('id', leadId)
          .single(),
        supabase
          .from('activities')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false }),
      ])

      if (leadRes.error) throw leadRes.error

      // Collect all user ids to resolve names (activity authors + assigned rep)
      const actUserIds = (actRes.data || []).map(a => a.user_id)
      const repId = leadRes.data?.assigned_rep_id
      const allIds = [...new Set([...actUserIds, repId].filter(Boolean))]

      let userMap = {}
      if (allIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, name')
          .in('id', allIds)
        profiles?.forEach(p => { userMap[p.id] = p })
      }

      setLead({ ...leadRes.data, rep: repId ? (userMap[repId] || null) : null })
      setActivities((actRes.data || []).map(a => ({ ...a, user: userMap[a.user_id] || null })))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    fetchLead()
  }, [fetchLead])

  return { lead, activities, loading, refetch: fetchLead }
}
