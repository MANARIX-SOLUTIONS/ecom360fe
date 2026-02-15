import { useState, useEffect, useCallback } from 'react'
import { getSubscription, listPlans } from '@/api'
import type { PlanResponse } from '@/api'

/**
 * Plan-based feature gating.
 * Fetches plan features from backend when authenticated; falls back to pro (trial) when not.
 */

type FeatureFlags = {
  expenses: boolean
  reports: boolean
  suppliers: boolean
  multiPayment: boolean
  clientCredits: boolean
  settingsUsers: boolean
  advancedReports: boolean
  api: boolean
}

const DEFAULT_FEATURES: FeatureFlags = {
  expenses: true,
  reports: true,
  suppliers: true,
  multiPayment: true,
  clientCredits: true,
  settingsUsers: true,
  advancedReports: false,
  api: false,
}

function planToFeatures(p: PlanResponse): FeatureFlags {
  return {
    expenses: p.featureExpenses,
    reports: p.featureReports,
    suppliers: p.maxSuppliers > 0,
    multiPayment: p.featureMultiPayment,
    clientCredits: p.featureClientCredits,
    settingsUsers: p.featureRoleManagement,
    advancedReports: p.featureAdvancedReports,
    api: p.featureApi,
  }
}

export function usePlanFeatures() {
  const [planSlug, setPlanSlug] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('ecom360_plan_slug') : null
  )
  const [features, setFeatures] = useState<FeatureFlags>(DEFAULT_FEATURES)

  const fetchPlanFeatures = useCallback(async () => {
    if (!localStorage.getItem('ecom360_access_token')) {
      setFeatures(DEFAULT_FEATURES)
      return
    }
    try {
      const [sub, plans] = await Promise.all([getSubscription(), listPlans()])
      const slug = sub?.planSlug ?? localStorage.getItem('ecom360_plan_slug')
      setPlanSlug(slug)
      const plan = plans.find((p) => p.slug.toLowerCase() === (slug ?? '').toLowerCase())
      setFeatures(plan ? planToFeatures(plan) : DEFAULT_FEATURES)
    } catch {
      setFeatures(DEFAULT_FEATURES)
    }
  }, [])

  useEffect(() => {
    fetchPlanFeatures()
  }, [fetchPlanFeatures])

  useEffect(() => {
    const onUpdate = () => {
      setPlanSlug(localStorage.getItem('ecom360_plan_slug'))
      fetchPlanFeatures()
    }
    window.addEventListener('ecom360:plan-updated', onUpdate)
    return () => window.removeEventListener('ecom360:plan-updated', onUpdate)
  }, [fetchPlanFeatures])

  return {
    planSlug,
    canExpenses: features.expenses,
    canReports: features.reports,
    canSuppliers: features.suppliers,
    canMultiPayment: features.multiPayment,
    canClientCredits: features.clientCredits,
    canSettingsUsers: features.settingsUsers,
    canAdvancedReports: features.advancedReports,
    canApi: features.api,
    /** Combined: can access this permission (role + plan) */
    canAccess: (permission: string, roleCan: boolean) => {
      if (!roleCan) return false
      if (permission === 'expenses') return features.expenses
      if (permission === 'reports') return features.reports
      if (permission === 'suppliers') return features.suppliers
      if (permission === 'settings:users') return features.settingsUsers
      return true
    },
  }
}
