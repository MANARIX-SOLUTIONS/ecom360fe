import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { message } from 'antd'
import { useAuth } from './hooks/useAuth'
import { RequirePermission } from './components/RequirePermission'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import MainLayout from './layouts/MainLayout'
import BackofficeLayout from './layouts/BackofficeLayout'
import Dashboard from './pages/Dashboard'
import Backoffice from './pages/Backoffice'
import BackofficeBusinesses from './pages/BackofficeBusinesses'
import BackofficeUsers from './pages/BackofficeUsers'
import BackofficeSystem from './pages/BackofficeSystem'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import POS from './pages/POS'
import Receipt from './pages/Receipt'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Suppliers from './pages/Suppliers'
import SupplierDetail from './pages/SupplierDetail'
import Expenses from './pages/Expenses'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import SettingsProfile from './pages/SettingsProfile'
import SettingsSubscription from './pages/SettingsSubscription'
import SettingsUsers from './pages/SettingsUsers'
import SettingsSecurity from './pages/SettingsSecurity'
import SettingsStores from './pages/SettingsStores'
import Profile from './pages/Profile'
import More from './pages/More'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

export default function App() {
  useEffect(() => {
    const onExpired = () => message.error('Session expirée — veuillez vous reconnecter')
    window.addEventListener('ecom360:auth-expired', onExpired)
    return () => window.removeEventListener('ecom360:auth-expired', onExpired)
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<RequirePermission permission="dashboard"><Dashboard /></RequirePermission>} />
          <Route path="pos" element={<RequirePermission permission="pos"><POS /></RequirePermission>} />
          <Route path="products" element={<RequirePermission permission="products"><Products /></RequirePermission>} />
          <Route path="products/:id" element={<RequirePermission permission="products"><ProductDetail /></RequirePermission>} />
          <Route path="receipt" element={<RequirePermission permission="pos"><Receipt /></RequirePermission>} />
          <Route path="clients" element={<RequirePermission permission="clients"><Clients /></RequirePermission>} />
          <Route path="clients/:id" element={<RequirePermission permission="clients"><ClientDetail /></RequirePermission>} />
          <Route path="suppliers" element={<RequirePermission permission="suppliers"><Suppliers /></RequirePermission>} />
          <Route path="suppliers/:id" element={<RequirePermission permission="suppliers"><SupplierDetail /></RequirePermission>} />
          <Route path="expenses" element={<RequirePermission permission="expenses"><Expenses /></RequirePermission>} />
          <Route path="reports" element={<RequirePermission permission="reports"><Reports /></RequirePermission>} />
          <Route path="more" element={<More />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<RequirePermission permission="settings"><Settings /></RequirePermission>} />
          <Route path="settings/stores" element={<RequirePermission permission="settings:stores"><SettingsStores /></RequirePermission>} />
          <Route path="settings/profile" element={<RequirePermission permission="settings:profile"><SettingsProfile /></RequirePermission>} />
          <Route path="settings/subscription" element={<RequirePermission permission="settings:subscription"><SettingsSubscription /></RequirePermission>} />
          <Route path="settings/users" element={<RequirePermission permission="settings:users"><SettingsUsers /></RequirePermission>} />
          <Route path="settings/security" element={<RequirePermission permission="settings:security"><SettingsSecurity /></RequirePermission>} />
        </Route>
        <Route
          path="backoffice"
          element={
            <RequirePermission permission="backoffice">
              <BackofficeLayout />
            </RequirePermission>
          }
        >
          <Route index element={<Backoffice />} />
          <Route path="businesses" element={<BackofficeBusinesses />} />
          <Route path="users" element={<BackofficeUsers />} />
          <Route path="system" element={<BackofficeSystem />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
