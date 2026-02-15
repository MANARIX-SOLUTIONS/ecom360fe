import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Spin, message } from 'antd'
import { useAuth } from './hooks/useAuth'
import { RequirePermission } from './components/RequirePermission'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import MainLayout from './layouts/MainLayout'
import BackofficeLayout from './layouts/BackofficeLayout'
import NotFound from './pages/NotFound'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Backoffice = lazy(() => import('./pages/Backoffice'))
const BackofficeBusinesses = lazy(() => import('./pages/BackofficeBusinesses'))
const BackofficeUsers = lazy(() => import('./pages/BackofficeUsers'))
const BackofficeSystem = lazy(() => import('./pages/BackofficeSystem'))
const Products = lazy(() => import('./pages/Products'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const POS = lazy(() => import('./pages/POS'))
const Receipt = lazy(() => import('./pages/Receipt'))
const Clients = lazy(() => import('./pages/Clients'))
const ClientDetail = lazy(() => import('./pages/ClientDetail'))
const Suppliers = lazy(() => import('./pages/Suppliers'))
const SupplierDetail = lazy(() => import('./pages/SupplierDetail'))
const Expenses = lazy(() => import('./pages/Expenses'))
const Reports = lazy(() => import('./pages/Reports'))
const Settings = lazy(() => import('./pages/Settings'))
const SettingsProfile = lazy(() => import('./pages/SettingsProfile'))
const SettingsSubscription = lazy(() => import('./pages/SettingsSubscription'))
const SettingsUsers = lazy(() => import('./pages/SettingsUsers'))
const SettingsSecurity = lazy(() => import('./pages/SettingsSecurity'))
const SettingsStores = lazy(() => import('./pages/SettingsStores'))
const Profile = lazy(() => import('./pages/Profile'))
const More = lazy(() => import('./pages/More'))

function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 280, padding: 24 }}>
      <Spin size="large" />
    </div>
  )
}

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
          <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><RequirePermission permission="dashboard"><Dashboard /></RequirePermission></Suspense>} />
          <Route path="pos" element={<Suspense fallback={<PageLoader />}><RequirePermission permission="pos"><POS /></RequirePermission></Suspense>} />
          <Route path="products" element={<Suspense fallback={<PageLoader />}><RequirePermission permission="products"><Products /></RequirePermission></Suspense>} />
          <Route path="products/:id" element={<Suspense fallback={<PageLoader />}><RequirePermission permission="products"><ProductDetail /></RequirePermission></Suspense>} />
          <Route path="receipt" element={<Suspense fallback={<PageLoader />}><RequirePermission permission="pos"><Receipt /></RequirePermission></Suspense>} />
          <Route path="clients" element={<Suspense fallback={<PageLoader />}><RequirePermission permission="clients"><Clients /></RequirePermission></Suspense>} />
          <Route path="clients/:id" element={<Suspense fallback={<PageLoader />}><RequirePermission permission="clients"><ClientDetail /></RequirePermission></Suspense>} />
          <Route path="suppliers" element={<Suspense fallback={<PageLoader />}><RequirePermission permission="suppliers"><Suppliers /></RequirePermission></Suspense>} />
          <Route path="suppliers/:id" element={<Suspense fallback={<PageLoader />}><RequirePermission permission="suppliers"><SupplierDetail /></RequirePermission></Suspense>} />
          <Route path="expenses" element={<Suspense fallback={<PageLoader />}><RequirePermission permission="expenses"><Expenses /></RequirePermission></Suspense>} />
          <Route path="reports" element={<Suspense fallback={<PageLoader />}><RequirePermission permission="reports"><Reports /></RequirePermission></Suspense>} />
          <Route path="more" element={<Suspense fallback={<PageLoader />}><More /></Suspense>} />
          <Route path="profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageLoader />}><RequirePermission permission="settings"><Settings /></RequirePermission></Suspense>} />
          <Route path="settings/stores" element={<Suspense fallback={<PageLoader />}><RequirePermission permission="settings:stores"><SettingsStores /></RequirePermission></Suspense>} />
          <Route path="settings/profile" element={<Suspense fallback={<PageLoader />}><RequirePermission permission="settings:profile"><SettingsProfile /></RequirePermission></Suspense>} />
          <Route path="settings/subscription" element={<Suspense fallback={<PageLoader />}><RequirePermission permission="settings:subscription"><SettingsSubscription /></RequirePermission></Suspense>} />
          <Route path="settings/users" element={<Suspense fallback={<PageLoader />}><RequirePermission permission="settings:users"><SettingsUsers /></RequirePermission></Suspense>} />
          <Route path="settings/security" element={<Suspense fallback={<PageLoader />}><RequirePermission permission="settings:security"><SettingsSecurity /></RequirePermission></Suspense>} />
        </Route>
        <Route
          path="backoffice"
          element={
            <RequirePermission permission="backoffice">
              <BackofficeLayout />
            </RequirePermission>
          }
        >
          <Route index element={<Suspense fallback={<PageLoader />}><Backoffice /></Suspense>} />
          <Route path="businesses" element={<Suspense fallback={<PageLoader />}><BackofficeBusinesses /></Suspense>} />
          <Route path="users" element={<Suspense fallback={<PageLoader />}><BackofficeUsers /></Suspense>} />
          <Route path="system" element={<Suspense fallback={<PageLoader />}><BackofficeSystem /></Suspense>} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
