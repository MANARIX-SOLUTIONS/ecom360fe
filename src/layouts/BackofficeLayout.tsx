import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Typography, Button, Badge, Dropdown, Tag } from 'antd'
import {
  Building2,
  Users,
  Settings,
  LayoutDashboard,
  ArrowLeft,
  LogOut,
  Menu as MenuIcon,
  X,
  Bell,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  UserPlus,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useUserProfile } from '@/hooks/useUserProfile'
// i18n removed – labels are now inline French
import styles from './BackofficeLayout.module.css'

const { Header, Sider, Content } = Layout

const navItems = [
  { key: '/backoffice', icon: <LayoutDashboard size={18} />, label: 'Vue d\'ensemble' },
  { key: '/backoffice/businesses', icon: <Building2 size={18} />, label: 'Entreprises' },
  { key: '/backoffice/users', icon: <Users size={18} />, label: 'Utilisateurs' },
  { key: '/backoffice/system', icon: <Settings size={18} />, label: 'Système' },
]

const notifItems = [
  {
    key: '1',
    label: (
      <div className="bo-notif-item">
        <AlertTriangle size={14} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>Abonnement expiré</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Mini Market Rufisque — Plan Starter</div>
        </div>
      </div>
    ),
  },
  {
    key: '2',
    label: (
      <div className="bo-notif-item">
        <UserPlus size={14} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>Nouvel utilisateur inscrit</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Moussa Keita — Il y a 2h</div>
        </div>
      </div>
    ),
  },
  {
    key: '3',
    label: (
      <div className="bo-notif-item">
        <CheckCircle size={14} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>Backup terminé</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Base de données — 04:00 UTC</div>
        </div>
      </div>
    ),
  },
]

export default function BackofficeLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  const { displayName, initials } = useUserProfile()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const selectedKey = navItems.find(n => location.pathname === n.key)?.key
    ?? navItems.find(n => n.key !== '/backoffice' && location.pathname.startsWith(n.key))?.key
    ?? '/backoffice'

  const handleNav = (key: string) => {
    navigate(key)
    setMobileOpen(false)
  }

  return (
    <Layout className={styles.root}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className={styles.overlay} onClick={() => setMobileOpen(false)} />
      )}

      <Sider
        width={260}
        className={`${styles.sider} ${mobileOpen ? styles.siderOpen : ''}`}
        theme="light"
      >
        {/* Logo area */}
        <div className={styles.siderHeader}>
          <div className={styles.logoGroup}>
            <div className={styles.logoIcon}>
              <Shield size={18} />
            </div>
            <div>
              <Typography.Text strong className={styles.logoTitle}>360 PME</Typography.Text>
              <Typography.Text className={styles.logoSub}>Backoffice Admin</Typography.Text>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeMobile}
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Platform status */}
        <div className={styles.statusCard}>
          <div className={styles.statusDot} />
          <div>
            <span className={styles.statusLabel}>Plateforme</span>
            <span className={styles.statusValue}>Opérationnelle</span>
          </div>
          <Activity size={14} className={styles.statusPulse} />
        </div>

        {/* Navigation */}
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={navItems.map(({ key, icon, label }) => ({ key, icon, label }))}
          onClick={({ key }) => handleNav(key)}
          style={{ borderRight: 0 }}
          className={styles.menu}
        />

        {/* Quick stats */}
        <div className={styles.siderStats}>
          <div className={styles.siderStat}>
            <span className={styles.siderStatValue}>47</span>
            <span className={styles.siderStatLabel}>Entreprises</span>
          </div>
          <div className={styles.siderStat}>
            <span className={styles.siderStatValue}>183</span>
            <span className={styles.siderStatLabel}>Utilisateurs</span>
          </div>
          <div className={styles.siderStat}>
            <span className={styles.siderStatValue}>99.9%</span>
            <span className={styles.siderStatLabel}>Uptime</span>
          </div>
        </div>

        {/* User area */}
        <div className={styles.siderUser}>
          <span className={styles.siderAvatar}>{initials}</span>
          <div className={styles.siderUserInfo}>
            <span className={styles.siderUserName}>{displayName}</span>
            <Tag color="red" style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 6px' }}>
              Super Admin
            </Tag>
          </div>
        </div>
      </Sider>

      <Layout>
        <Header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              className={styles.hamburger}
              onClick={() => setMobileOpen(true)}
              aria-label="Menu"
            >
              <MenuIcon size={20} />
            </button>
            <div className={styles.breadcrumb}>
              <span className={styles.breadcrumbSep}>Backoffice</span>
              {location.pathname !== '/backoffice' && (
                <>
                  <span className={styles.breadcrumbDivider}>/</span>
                  <span className={styles.breadcrumbCurrent}>
                    {navItems.find(n => n.key === selectedKey)?.label ?? ''}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className={styles.headerActions}>
            <Dropdown
              menu={{ items: notifItems }}
              trigger={['click']}
              placement="bottomRight"
            >
              <button type="button" className={styles.headerBtn} aria-label="Notifications">
                <Badge count={3} size="small" offset={[-2, 2]}>
                  <Bell size={18} />
                </Badge>
              </button>
            </Dropdown>
            <Button
              type="text"
              icon={<ArrowLeft size={16} />}
              onClick={() => navigate('/dashboard')}
              className={styles.backBtn}
            >
              <span className={styles.backBtnText}>Retour à l'app</span>
            </Button>
            <button
              type="button"
              className={styles.headerBtn}
              onClick={handleLogout}
              aria-label="Déconnexion"
            >
              <LogOut size={18} />
            </button>
          </div>
        </Header>

        <Content className={styles.content}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
