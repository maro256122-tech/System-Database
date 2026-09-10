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
          car_models(id, name, category),
          rep:user_profiles!assigned_rep_id(id, name)
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
          .select(`
            *,
            branches(id, name),
            car_models(id, name),
            rep:user_profiles!assigned_rep_id(id, name)
          `)
          .eq('id', leadId)
          .single(),
        supabase
          .from('activities')
          .select('*, user:user_profiles!user_id(id, name)')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false }),
      ])

      if (leadRes.error) throw leadRes.error
      setLead(leadRes.data)
      setActivities(actRes.data || [])
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
