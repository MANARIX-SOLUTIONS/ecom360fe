import { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu, Typography, Space, Badge, Dropdown, Drawer, Button } from "antd";
import {
  ShoppingCart,
  MoreHorizontal,
  Menu as MenuIcon,
  Shield,
  Bell,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
  Package,
  TrendingUp,
} from "lucide-react";
import { SyncIndicator } from "@/components/SyncIndicator";
import { SkipLink } from "@/components/SkipLink";
import { StoreSwitcher } from "@/components/StoreSwitcher";
import { HeaderProfile } from "@/components/HeaderProfile";
import { GlobalSearch, GlobalSearchTrigger } from "@/components/shell/GlobalSearch";
import { QuickCreate } from "@/components/shell/QuickCreate";
import { useAuthRole } from "@/hooks/useAuthRole";
import { usePermissions } from "@/hooks/usePermissions";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { useNotifications } from "@/hooks/useNotifications";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { t } from "@/i18n";
import { useBusinessProfile } from "@/contexts/BusinessProfileContext";
import { APP_LOGO_MARK } from "@/constants/branding";
import { sanitizeExternalImageUrl } from "@/utils/sanitizeImageUrl";
import {
  getNotificationColor,
  getNotificationPresentation,
} from "@/utils/notificationPresentation";
import { OnboardingTour } from "@/components/OnboardingTour";
import {
  NAV_SECTIONS,
  matchNavKey,
  matchesMoreSection,
  navItemHref,
  type NavItem,
} from "@/constants/navigation";
import styles from "./MainLayout.module.css";

const { Header, Sider, Content } = Layout;

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { isSuperAdmin } = useAuthRole();
  const { canAccess: canAccessBackend } = usePermissions();
  const { canAccess: canAccessPlan } = usePlanFeatures();
  const canSeePos = canAccessPlan("pos", canAccessBackend("pos"));
  const canSeeProducts = canAccessPlan("products", canAccessBackend("products"));
  const canSeeReports = canAccessPlan("reports", canAccessBackend("reports"));
  const { notifications, unreadCount, markRead } = useNotifications({ pollingIntervalMs: 30000 });
  const { offline } = useNetworkStatus();
  const { profile: businessProfile } = useBusinessProfile();
  const brandLogoUrl = sanitizeExternalImageUrl(businessProfile?.logoUrl ?? undefined);
  const [brandLogoBroken, setBrandLogoBroken] = useState(false);
  const [defaultLogoBroken, setDefaultLogoBroken] = useState(false);
  const useBusinessLogo = Boolean(brandLogoUrl && !brandLogoBroken);
  const effectiveLogoSrc = useBusinessLogo ? brandLogoUrl : APP_LOGO_MARK;
  useEffect(() => {
    setBrandLogoBroken(false);
    setDefaultLogoBroken(false);
  }, [brandLogoUrl]);
  const sidebarBrandTitle = businessProfile?.name?.trim() || "Ecom360 PME";

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (typing) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visibleItems = useMemo(() => {
    const allowed = (item: NavItem) => {
      const backendCan = canAccessBackend(item.permission);
      return backendCan && canAccessPlan(item.permission, backendCan);
    };
    return NAV_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter(allowed),
    })).filter((section) => section.items.length > 0);
  }, [canAccessBackend, canAccessPlan]);

  const selectedKeys = useMemo(() => {
    const matched = visibleItems
      .flatMap((section) => section.items)
      .filter((item) => matchNavKey(location.pathname, location.search, item))
      .map(navItemHref);
    return matched.length > 0 ? matched : [location.pathname];
  }, [location.pathname, location.search, visibleItems]);

  const menuItems = useMemo(() => {
    const groups = visibleItems.map((section) => ({
      type: "group" as const,
      key: section.id,
      label: section.label,
      children: section.items.map((item) => {
        const Icon = item.icon;
        return {
          key: navItemHref(item),
          icon: <Icon size={18} />,
          label: item.label,
        };
      }),
    }));
    if (isSuperAdmin) {
      groups.push({
        type: "group" as const,
        key: "platform",
        label: "Plateforme",
        children: [
          {
            key: "/backoffice",
            icon: <Shield size={18} />,
            label: t.backoffice.title,
          },
        ],
      });
    }
    return groups;
  }, [isSuperAdmin, visibleItems]);

  const notificationItems = useMemo(() => {
    const items: { key: string; label: React.ReactNode }[] = [];
    if (notifications.length === 0) {
      items.push({
        key: "empty",
        label: <div className={styles.notifEmpty}>Aucune notification</div>,
      });
    } else {
      items.push(
        ...notifications.map((n) => {
          const Icon = getNotificationPresentation(n.type).icon;
          const iconColor = getNotificationColor(n.type);
          return {
            key: n.id,
            label: (
              <div
                role="button"
                tabIndex={0}
                className={styles.notifItem}
                style={{ opacity: n.isRead ? 0.8 : 1 }}
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
                  <div className={styles.notifTitle}>{n.title}</div>
                  {n.body && <div className={styles.notifBody}>{n.body}</div>}
                </div>
              </div>
            ),
          };
        })
      );
    }
    items.push({
      key: "manage",
      label: (
        <div
          role="button"
          tabIndex={0}
          className={styles.notifManage}
          onClick={() => navigate("/settings/notifications")}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate("/settings/notifications");
            }
          }}
        >
          Gérer les notifications
        </div>
      ),
    });
    return items;
  }, [notifications, markRead, navigate]);

  const moreNavActive =
    location.pathname === "/more" ||
    location.pathname === "/backoffice" ||
    matchesMoreSection(location.pathname);

  const go = (key: string) => navigate(key);

  return (
    <Layout className={`${styles.root} ${collapsed ? styles.rootCollapsed : ""}`}>
      <SkipLink />
      <Sider
        collapsed={collapsed}
        collapsedWidth={72}
        width={248}
        className={styles.sider}
        theme="light"
        trigger={null}
      >
        <div data-onboarding="sidebar" className={styles.sidebarTourRegion}>
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
            <div className={`${styles.logoIcon} ${!defaultLogoBroken ? styles.logoIconImage : ""}`}>
              {!defaultLogoBroken ? (
                <img
                  src={effectiveLogoSrc}
                  alt=""
                  className={styles.logoBrandImg}
                  onError={() => {
                    if (brandLogoUrl && !brandLogoBroken) setBrandLogoBroken(true);
                    else setDefaultLogoBroken(true);
                  }}
                />
              ) : (
                <ShoppingCart size={20} />
              )}
            </div>
            {!collapsed && (
              <div className={styles.logoText}>
                <Typography.Text strong className={styles.logoTitle}>
                  {sidebarBrandTitle}
                </Typography.Text>
                <Typography.Text className={styles.logoSub}>Ecom360 PME</Typography.Text>
              </div>
            )}
          </div>
          <Menu
            mode="inline"
            selectedKeys={selectedKeys}
            items={menuItems}
            onClick={({ key }) => go(String(key))}
            style={{ borderRight: 0 }}
            className={styles.menu}
            inlineCollapsed={collapsed}
          />
          <div className={styles.siderFooter}>
            <Button
              type="text"
              className={styles.collapseBtn}
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
              icon={collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            >
              {!collapsed && "Réduire"}
            </Button>
          </div>
        </div>
      </Sider>

      <Layout>
        <Header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              className={styles.mobileMenuBtn}
              aria-label={t.common.openNavigationMenu}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}
            >
              <MenuIcon size={22} aria-hidden />
            </button>
            <StoreSwitcher />
            <GlobalSearchTrigger onOpen={() => setSearchOpen(true)} />
          </div>
          <Space size={8} className={styles.headerRight} wrap={false}>
            <QuickCreate />
            <SyncIndicator offline={offline} />
            <Dropdown
              menu={{
                items: [
                  {
                    key: "demo",
                    label: "Demander une démo",
                    onClick: () => navigate("/demo-request"),
                  },
                  {
                    key: "billing",
                    label: "Abonnement",
                    onClick: () => navigate("/settings/subscription"),
                  },
                ],
              }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <button type="button" className={styles.iconBtn} aria-label="Aide">
                <HelpCircle size={20} />
              </button>
            </Dropdown>
            <Dropdown
              menu={{ items: notificationItems }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="Notifications"
                data-onboarding="notifications"
              >
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

      <nav className={styles.bottomNav} data-onboarding="bottom-nav" aria-label="Navigation mobile">
        <button
          type="button"
          className={location.pathname === "/dashboard" ? styles.navActive : ""}
          onClick={() => navigate("/dashboard")}
          aria-label="Tableau de bord"
        >
          <LayoutDashboard size={22} />
          <span>Accueil</span>
          {location.pathname === "/dashboard" && <span className={styles.navDot} />}
        </button>
        {canSeeProducts && (
          <button
            type="button"
            className={
              location.pathname.startsWith("/products") &&
              new URLSearchParams(location.search).get("type") !== "service"
                ? styles.navActive
                : ""
            }
            onClick={() => navigate("/products")}
            aria-label="Catalogue"
          >
            <Package size={22} />
            <span>Catalogue</span>
            {location.pathname.startsWith("/products") &&
              new URLSearchParams(location.search).get("type") !== "service" && (
                <span className={styles.navDot} />
              )}
          </button>
        )}
        {canSeePos && (
          <button
            type="button"
            className={`${styles.navFab} ${location.pathname === "/pos" ? styles.navFabActive : ""}`}
            onClick={() => navigate("/pos")}
            aria-label="Caisse"
          >
            <ShoppingCart size={24} />
          </button>
        )}
        {canSeeReports && (
          <button
            type="button"
            className={location.pathname === "/reports" ? styles.navActive : ""}
            onClick={() => navigate("/reports")}
            aria-label={t.reports.title}
          >
            <TrendingUp size={22} />
            <span>Rapports</span>
            {location.pathname === "/reports" && <span className={styles.navDot} />}
          </button>
        )}
        <button
          type="button"
          className={moreNavActive ? styles.navActive : ""}
          onClick={() => navigate("/more")}
          aria-label="Plus"
        >
          <MoreHorizontal size={22} />
          <span>Plus</span>
          {moreNavActive && <span className={styles.navDot} />}
        </button>
      </nav>

      <Drawer
        title={
          <div>
            <Typography.Text strong>{sidebarBrandTitle}</Typography.Text>
            <Typography.Text type="secondary" className={styles.drawerSub}>
              {t.common.menu}
            </Typography.Text>
          </div>
        }
        placement="left"
        width={300}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        styles={{ body: { padding: "8px 12px 24px" } }}
      >
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          onClick={({ key }) => {
            go(String(key));
            setMobileNavOpen(false);
          }}
          style={{ borderRight: 0 }}
          className={styles.menu}
        />
      </Drawer>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <OnboardingTour />
    </Layout>
  );
}
