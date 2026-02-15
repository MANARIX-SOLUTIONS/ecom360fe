import { useState, useCallback, useEffect } from 'react'
import { login as apiLogin, logout as apiLogout } from '@/api'
import type { LoginRequest } from '@/api'

export function useAuth() {
  const [isAuthenticated, setAuthenticated] = useState(() => {
    return localStorage.getItem('ecom360_auth') === 'true' && !!localStorage.getItem('ecom360_access_token')
  })

  useEffect(() => {
    const onExpired = () => setAuthenticated(false)
    window.addEventListener('ecom360:auth-expired', onExpired)
    return () => window.removeEventListener('ecom360:auth-expired', onExpired)
  }, [])

  const loginWithApi = useCallback(async (credentials: LoginRequest) => {
    await apiLogin(credentials)
    setAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    apiLogout()
    setAuthenticated(false)
  }, [])

  return { isAuthenticated, loginWithApi, logout }
}
