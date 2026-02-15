import { useMemo, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu, Typography, Space, Badge, Dropdown } from "antd";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  Users,
  Truck,
  Receipt,
  TrendingUp,
  Settings,
  MoreHorizontal,
  Shield,
  Bell,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { SyncIndicator } from "@/components/SyncIndicator";
import { SkipLink } from "@/components/SkipLink";
import { StoreSwitcher } from "@/components/StoreSwitcher";
import { HeaderProfile } from "@/components/HeaderProfile";
import { useAuthRole } from "@/hooks/useAuthRole";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { useNotifications } from "@/hooks/useNotifications";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { t } from "@/i18n";
import styles from "./MainLayout.module.css";

const { Header, Sider, Content } = Layout;

const navConfig = [
  {
    key: "/dashboard",
    permission: "dashboard" as const,
    icon: <LayoutDashboard size={20} />,
    label: "Dashboard",
  },
  {
    key: "/pos",
    permission: "pos" as const,
    icon: <ShoppingCart size={20} />,
    label: "POS",
  },
  {
    key: "/products",
    permission: "products" as const,
    icon: <Package size={20} />,
    label: "Produits",
  },
  {
    key: "/reports",
    permission: "reports" as const,
    icon: <FileText size={20} />,
    label: "Rapports",
  },
  {
    key: "/clients",
    permission: "clients" as const,
    icon: <Users size={20} />,
    label: "Clients",
  },
  {
    key: "/suppliers",
    permission: "suppliers" as const,
    icon: <Truck size={20} />,
    label: "Fournisseurs",
  },
  {
    key: "/expenses",
    permission: "expenses" as const,
    icon: <Receipt size={20} />,
    label: "Dépenses",
  },
  {
    key: "/settings",
    permission: "settings" as const,
    icon: <Settings size={20} />,
    label: "Paramètres",
  },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { can, isSuperAdmin } = useAuthRole();
  const { canAccess } = usePlanFeatures();
  const { notifications, unreadCount, markRead } = useNotifications();
  const { offline } = useNetworkStatus();

  const notificationItems = useMemo(() => {
    if (notifications.length === 0) {
      return [
        {
          key: "empty",
          label: (
            <div
              style={{
                padding: 16,
                textAlign: "center",
                color: "var(--color-text-muted)",
                fontSize: 13,
              }}
            >
              Aucune notification
            </div>
          ),
        },
      ];
    }
    return notifications.map((n) => {
      const isWarning = n.type === "low_stock" || n.type === "stock_alert";
      const Icon = isWarning ? AlertTriangle : CheckCircle;
      const iconColor = isWarning ? "var(--color-warning)" : "var(--color-success)";
      return {
        key: n.id,
        label: (
          <div
            role="button"
            tabIndex={0}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              padding: "8px 0",
              maxWidth: 280,
              cursor: "pointer",
              opacity: n.isRead ? 0.8 : 1,
            }}
            onClick={() => {
              if (!n.isRead) markRead(n.id);
              if (n.actionUrl) navigate(n.actionUrl);
            }}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (!n.isRead) markRead(n.id);
                if (n.actionUrl) navigate(n.actionUrl);
              }
            }}
          >
            <Icon size={16} style={{ color: iconColor, flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{n.title}</div>
              {n.body && (
                <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{n.body}</div>
              )}
            </div>
          </div>
        ),
      };
    });
  }, [notifications, markRead, navigate]);

  const navItems = useMemo(() => {
    const items = navConfig
      .filter((item) => canAccess(item.permission, can(item.permission)))
      .map(({ key, icon, label }) => ({ key, icon, label }));
    if (isSuperAdmin) {
      items.push({
        key: "/backoffice",
        icon: <Shield size={20} />,
        label: t.backoffice.title,
      });
    }
    return items;
  }, [can, canAccess, isSuperAdmin]);

  return (
    <Layout className={styles.root}>
      <SkipLink />
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={240}
        className={styles.sider}
        theme="light"
      >
        <div
          className={styles.logo}
          role="button"
          tabIndex={0}
          onClick={() => navigate("/dashboard")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate("/dashboard");
            }
          }}
        >
          <div className={styles.logoIcon}>
            <ShoppingCart size={20} />
          </div>
          <div className={styles.logoText}>
            <Typography.Text strong className={styles.logoTitle}>
              360 PME
            </Typography.Text>
            <Typography.Text className={styles.logoSub}>Commerce</Typography.Text>
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={navItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
          className={styles.menu}
        />
      </Sider>

      <Layout>
        <Header className={styles.header}>
          <StoreSwitcher />
          <Space size="middle">
            <SyncIndicator offline={offline} />
            <Dropdown
              menu={{ items: notificationItems }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <button type="button" className={styles.notifBtn} aria-label="Notifications">
                <Badge count={unreadCount} size="small" offset={[-2, 2]}>
                  <Bell size={20} />
                </Badge>
              </button>
            </Dropdown>
            <HeaderProfile />
          </Space>
        </Header>

        <Content id="main-content" className={styles.content} tabIndex={-1}>
          <Outlet />
        </Content>
      </Layout>

      {/* Mobile: bottom navigation */}
      <nav className={styles.bottomNav}>
        <button
          type="button"
          className={location.pathname === "/dashboard" ? styles.navActive : ""}
          onClick={() => navigate("/dashboard")}
          aria-label="Dashboard"
        >
          <LayoutDashboard size={22} />
          <span>Dashboard</span>
          {location.pathname === "/dashboard" && <span className={styles.navDot} />}
        </button>
        <button
          type="button"
          className={location.pathname === "/products" ? styles.navActive : ""}
          onClick={() => navigate("/products")}
          aria-label="Produits"
        >
          <Package size={22} />
          <span>Produits</span>
          {location.pathname === "/products" && <span className={styles.navDot} />}
        </button>
        {/* Center POS FAB */}
        <button
          type="button"
          className={`${styles.navFab} ${location.pathname === "/pos" ? styles.navFabActive : ""}`}
          onClick={() => navigate("/pos")}
          aria-label="POS"
        >
          <ShoppingCart size={24} />
        </button>
        <button
          type="button"
          className={location.pathname === "/reports" ? styles.navActive : ""}
          onClick={() => navigate("/reports")}
          aria-label="Rapports"
        >
          <TrendingUp size={22} />
          <span>Rapports</span>
          {location.pathname === "/reports" && <span className={styles.navDot} />}
        </button>
        <button
          type="button"
          className={
            location.pathname === "/more" ||
            location.pathname === "/backoffice" ||
            ["/settings", "/clients", "/expenses", "/suppliers"].some((p) =>
              location.pathname.startsWith(p)
            )
              ? styles.navActive
              : ""
          }
          onClick={() => navigate("/more")}
          aria-label="Plus"
        >
          <MoreHorizontal size={22} />
          <span>Plus</span>
          {(location.pathname === "/more" ||
            ["/settings", "/clients", "/expenses", "/suppliers"].some((p) =>
              location.pathname.startsWith(p)
            )) && <span className={styles.navDot} />}
        </button>
      </nav>
    </Layout>
  );
}
