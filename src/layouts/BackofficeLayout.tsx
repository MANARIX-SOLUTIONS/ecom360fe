import { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu, Typography, Button, Badge, Dropdown, Tag } from "antd";
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
  Activity,
  UserPlus,
  FileText,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useNotifications } from "@/hooks/useNotifications";
import { getAdminStats } from "@/api/backoffice";
import { SkipLink } from "@/components/SkipLink";
// i18n removed – labels are now inline French
import { APP_LOGO_MARK } from "@/constants/branding";
import {
  getNotificationColor,
  getNotificationPresentation,
} from "@/utils/notificationPresentation";
import styles from "./BackofficeLayout.module.css";

const { Header, Sider, Content } = Layout;

const navItems = [
  { key: "/backoffice", icon: <LayoutDashboard size={18} />, label: "Vue d'ensemble" },
  {
    key: "/backoffice/demo-requests",
    icon: <UserPlus size={18} />,
    label: "Demandes démo",
  },
  { key: "/backoffice/businesses", icon: <Building2 size={18} />, label: "Entreprises" },
  { key: "/backoffice/users", icon: <Users size={18} />, label: "Utilisateurs" },
  { key: "/backoffice/audit", icon: <FileText size={18} />, label: "Journal d'audit" },
  { key: "/backoffice/system", icon: <Settings size={18} />, label: "Système" },
];

export default function BackofficeLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { displayName, initials } = useUserProfile();
  const { notifications, unreadCount, markRead } = useNotifications({ pollingIntervalMs: 30000 });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stats, setStats] = useState<{
    businessesCount: number;
    usersCount: number;
  } | null>(null);

  useEffect(() => {
    getAdminStats()
      .then((s) => setStats({ businessesCount: s.businessesCount, usersCount: s.usersCount }))
      .catch(() => setStats(null));
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const selectedKey =
    navItems.find((n) => location.pathname === n.key)?.key ??
    navItems.find((n) => n.key !== "/backoffice" && location.pathname.startsWith(n.key))?.key ??
    "/backoffice";

  const handleNav = (key: string) => {
    navigate(key);
    setMobileOpen(false);
  };

  const notifItems = useMemo(() => {
    if (notifications.length === 0) {
      return [
        {
          key: "empty",
          label: (
            <div style={{ padding: 16, textAlign: "center", color: "var(--color-text-muted)" }}>
              Aucune notification
            </div>
          ),
        },
      ];
    }

    return notifications.map((notification) => {
      const Icon = getNotificationPresentation(notification.type).icon;
      return {
        key: notification.id,
        label: (
          <div
            className="bo-notif-item"
            role="button"
            tabIndex={0}
            style={{ cursor: "pointer", opacity: notification.isRead ? 0.8 : 1 }}
            onClick={() => {
              if (!notification.isRead) markRead(notification.id);
              if (notification.actionUrl) navigate(notification.actionUrl);
            }}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (!notification.isRead) markRead(notification.id);
                if (notification.actionUrl) navigate(notification.actionUrl);
              }
            }}
          >
            <Icon
              size={14}
              style={{
                color: getNotificationColor(notification.type),
                flexShrink: 0,
                marginTop: 2,
              }}
            />
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{notification.title}</div>
              {notification.body && (
                <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  {notification.body}
                </div>
              )}
            </div>
          </div>
        ),
      };
    });
  }, [markRead, navigate, notifications]);

  return (
    <Layout className={styles.root}>
      <SkipLink />
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className={styles.overlay}
          role="button"
          tabIndex={0}
          aria-label="Fermer le menu"
          onClick={() => setMobileOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setMobileOpen(false);
            }
          }}
        />
      )}

      <Sider
        width={260}
        className={`${styles.sider} ${mobileOpen ? styles.siderOpen : ""}`}
        theme="light"
      >
        {/* Logo area */}
        <div className={styles.siderHeader}>
          <div className={styles.logoGroup}>
            <div className={`${styles.logoIcon} ${styles.logoIconImage}`}>
              <img src={APP_LOGO_MARK} alt="" className={styles.logoBrandImg} />
            </div>
            <div>
              <Typography.Text strong className={styles.logoTitle}>
                360 PME
              </Typography.Text>
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
            <span className={styles.siderStatValue}>{stats?.businessesCount ?? "—"}</span>
            <span className={styles.siderStatLabel}>Entreprises</span>
          </div>
          <div className={styles.siderStat}>
            <span className={styles.siderStatValue}>{stats?.usersCount ?? "—"}</span>
            <span className={styles.siderStatLabel}>Utilisateurs</span>
          </div>
          <div className={styles.siderStat}>
            <span className={styles.siderStatValue}>—</span>
            <span className={styles.siderStatLabel}>Uptime</span>
          </div>
        </div>

        {/* User area */}
        <div className={styles.siderUser}>
          <span className={styles.siderAvatar}>{initials}</span>
          <div className={styles.siderUserInfo}>
            <span className={styles.siderUserName}>{displayName}</span>
            <Tag
              color="red"
              style={{ margin: 0, fontSize: 10, lineHeight: "16px", padding: "0 6px" }}
            >
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
              {location.pathname !== "/backoffice" && (
                <>
                  <span className={styles.breadcrumbDivider}>/</span>
                  <span className={styles.breadcrumbCurrent}>
                    {navItems.find((n) => n.key === selectedKey)?.label ?? ""}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className={styles.headerActions}>
            <Dropdown menu={{ items: notifItems }} trigger={["click"]} placement="bottomRight">
              <button type="button" className={styles.headerBtn} aria-label="Notifications">
                <Badge count={unreadCount} size="small" offset={[-2, 2]}>
                  <Bell size={18} />
                </Badge>
              </button>
            </Dropdown>
            <Button
              type="text"
              icon={<ArrowLeft size={16} />}
              onClick={() => navigate("/dashboard")}
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

        <Content id="main-content" className={styles.content} tabIndex={-1}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
