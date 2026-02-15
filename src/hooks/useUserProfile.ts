import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'ecom360_user'

export type UserProfile = {
  name: string
  email: string
  phone?: string
}

const defaultProfile: UserProfile = {
  name: 'Utilisateur',
  email: '',
}

function load(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as UserProfile
      if (parsed && typeof parsed.name === 'string') {
        return { ...defaultProfile, ...parsed }
      }
    }
  } catch {
    // ignore
  }
  return defaultProfile
}

function save(profile: UserProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  } catch {
    // ignore
  }
}

export const PROFILE_UPDATED_EVENT = 'ecom360:profile-updated'

export function useUserProfile() {
  const [profile, setProfileState] = useState<UserProfile>(load)

  useEffect(() => {
    setProfileState(load())
    const onUpdate = () => setProfileState(load())
    window.addEventListener(PROFILE_UPDATED_EVENT, onUpdate)
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, onUpdate)
  }, [])

  const setProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfileState((prev) => {
      const next = { ...prev, ...updates }
      save(next)
      return next
    })
  }, [])

  const displayName = profile.name?.trim() || defaultProfile.name
  const initials = displayName
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

  return { profile, setProfile, displayName, initials }
}
