import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Layout, Typography, Badge, Dropdown, Drawer, Button } from "antd";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  Users,
  Truck,
  Bike,
  Receipt,
  ListOrdered,
  ClipboardList,
  TrendingUp,
  Settings,
  Store,
  MoreHorizontal,
  Menu as MenuIcon,
  Shield,
  Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SyncIndicator } from "@/components/SyncIndicator";
import { SkipLink } from "@/components/SkipLink";
import { StoreSwitcher } from "@/components/StoreSwitcher";
import { HeaderProfile } from "@/components/HeaderProfile";
import { useAuthRole } from "@/hooks/useAuthRole";
import { usePermissions } from "@/hooks/usePermissions";
import type { NavPermission } from "@/hooks/usePermissions";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { useNotifications } from "@/hooks/useNotifications";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { markAllNotificationsRead } from "@/api";
import { t } from "@/i18n";
import { useBusinessProfile } from "@/contexts/BusinessProfileContext";
import { APP_LOGO_MARK } from "@/constants/branding";
import { sanitizeExternalImageUrl } from "@/utils/sanitizeImageUrl";
import {
  getNotificationColor,
  getNotificationPresentation,
} from "@/utils/notificationPresentation";
import { OnboardingTour } from "@/components/OnboardingTour";
import styles from "./MainLayout.module.css";

const { Header, Sider, Content } = Layout;

type NavGroup = "shop" | "follow" | "account";

type NavDef = {
  key: string;
  permission: NavPermission;
  icon: LucideIcon;
  label: string;
  group: NavGroup;
};

const NAV_ITEMS: NavDef[] = [
  {
    key: "/dashboard",
    permission: "dashboard",
    icon: LayoutDashboard,
    label: t.nav.dashboard,
    group: "shop",
  },
  {
    key: "/pos",
    permission: "pos",
    icon: ShoppingCart,
    label: t.nav.pos,
    group: "shop",
  },
  {
    key: "/sales",
    permission: "pos",
    icon: ListOrdered,
    label: t.sales.title,
    group: "shop",
  },
  {
    key: "/products",
    permission: "products",
    icon: Package,
    label: t.products.title,
    group: "shop",
  },
  {
    key: "/vue-globale",
    permission: "globalView",
    icon: Store,
    label: t.globalView.title,
    group: "follow",
  },
  {
    key: "/reports",
    permission: "reports",
    icon: FileText,
    label: t.reports.title,
    group: "follow",
  },
  {
    key: "/clients",
    permission: "clients",
    icon: Users,
    label: t.clients.title,
    group: "follow",
  },
  {
    key: "/suppliers",
    permission: "suppliers",
    icon: Truck,
    label: t.suppliers.title,
    group: "follow",
  },
  {
    key: "/purchase-orders",
    permission: "purchaseOrders",
    icon: ClipboardList,
    label: t.purchaseOrders.title,
    group: "follow",
  },
  {
    key: "/livreurs",
    permission: "livreurs",
    icon: Bike,
    label: t.livreurs.title,
    group: "follow",
  },
  {
    key: "/expenses",
    permission: "expenses",
    icon: Receipt,
    label: t.expenses.title,
    group: "follow",
  },
  {
    key: "/settings",
    permission: "settings",
    icon: Settings,
    label: t.settings.title,
    group: "account",
  },
];

const GROUP_ORDER: { id: NavGroup; label: string }[] = [
  { id: "shop", label: t.nav.groupShop },
  { id: "follow", label: t.nav.groupFollow },
  { id: "account", label: t.nav.groupAccount },
];

const MORE_SECTION_PREFIXES = [
  "/settings",
  "/clients",
  "/expenses",
  "/suppliers",
  "/purchase-orders",
  "/livreurs",
  "/sales",
  "/vue-globale",
  "/profile",
] as const;

function pathMatches(pathname: string, key: string): boolean {
  return pathname === key || pathname.startsWith(`${key}/`);
}

function selectedNavKey(pathname: string, keys: string[]): string | null {
  const matches = keys.filter((key) => pathMatches(pathname, key));
  if (matches.length === 0) return null;
  return matches.reduce((best, key) => (key.length > best.length ? key : best));
}

function matchesMoreSection(pathname: string): boolean {
  return MORE_SECTION_PREFIXES.some((p) => pathMatches(pathname, p));
}

function formatNotifTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

type BrandMarkProps = {
  src: string | undefined;
  broken: boolean;
  onBroken: () => void;
};

function BrandMark({ src, broken, onBroken }: BrandMarkProps) {
  return (
    <span className={`${styles.logoIcon} ${!broken && src ? styles.logoIconImage : ""}`}>
      {!broken && src ? (
        <img src={src} alt="" className={styles.logoBrandImg} onError={onBroken} />
      ) : (
        <ShoppingCart size={20} />
      )}
    </span>
  );
}

type SideNavProps = {
  items: NavDef[];
  pathname: string;
  onNavigate: (path: string) => void;
};

function SideNav({ items, pathname, onNavigate }: SideNavProps) {
  const selected = selectedNavKey(
    pathname,
    items.map((item) => item.key)
  );

  return (
    <nav className={styles.navList} aria-label={t.nav.mobileNav}>
      {GROUP_ORDER.map((group) => {
        const groupItems = items.filter((item) => item.group === group.id);
        if (groupItems.length === 0) return null;
        return (
          <div key={group.id} className={styles.navGroup}>
            <span className={styles.navGroupLabel}>{group.label}</span>
            {groupItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.key === selected;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => onNavigate(item.key)}
                >
                  <span className={styles.navIcon}>
                    <Icon size={18} />
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { isSuperAdmin } = useAuthRole();
  const { canAccess: canAccessBackend } = usePermissions();
  const { canAccess: canAccessPlan } = usePlanFeatures();
  const { notifications, unreadCount, markRead, refetch } = useNotifications({
    pollingIntervalMs: 30000,
  });
  const { offline } = useNetworkStatus();
  const { profile: businessProfile } = useBusinessProfile();
  const brandLogoUrl = sanitizeExternalImageUrl(businessProfile?.logoUrl ?? undefined);
  const [brandLogoBroken, setBrandLogoBroken] = useState(false);
  const [defaultLogoBroken, setDefaultLogoBroken] = useState(false);
  const useBusinessLogo = Boolean(brandLogoUrl && !brandLogoBroken);
  const effectiveLogoSrc = useBusinessLogo ? brandLogoUrl : APP_LOGO_MARK;
  const logoBroken = useBusinessLogo ? brandLogoBroken : defaultLogoBroken;
  const sidebarBrandTitle = businessProfile?.name?.trim();

  const canGo = useCallback(
    (permission: NavPermission) => {
      const backendCan = canAccessBackend(permission);
      return backendCan && canAccessPlan(permission, backendCan);
    },
    [canAccessBackend, canAccessPlan]
  );

  useEffect(() => {
    setBrandLogoBroken(false);
    setDefaultLogoBroken(false);
  }, [brandLogoUrl]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const navItems = useMemo(() => {
    const items = NAV_ITEMS.filter((item) => canGo(item.permission));
    if (isSuperAdmin) {
      items.push({
        key: "/backoffice",
        permission: "backoffice",
        icon: Shield,
        label: t.backoffice.title,
        group: "account",
      });
    }
    return items;
  }, [canGo, isSuperAdmin]);

  const moreNavActive =
    location.pathname === "/more" ||
    location.pathname === "/backoffice" ||
    matchesMoreSection(location.pathname);

  const isActive = (key: string) => pathMatches(location.pathname, key);

  const goHome = () => navigate("/dashboard");

  const onLogoError = () => {
    if (brandLogoUrl && !brandLogoBroken) setBrandLogoBroken(true);
    else setDefaultLogoBroken(true);
  };

  const openNotification = async (id: string, actionUrl: string | null, isRead: boolean) => {
    if (!isRead) await markRead(id);
    setNotifOpen(false);
    if (actionUrl) navigate(actionUrl);
  };

  const onMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      await refetch();
    } catch {
      /* ignore */
    }
  };

  const notificationPanel = (
    <div className={styles.notifPanel}>
      <div className={styles.notifHead}>
        <span className={styles.notifTitle}>{t.nav.notifications}</span>
        {unreadCount > 0 ? (
          <Button type="link" size="small" onClick={() => void onMarkAllRead()}>
            {t.settings.notificationsMarkAllRead}
          </Button>
        ) : null}
      </div>
      {notifications.length === 0 ? (
        <div className={styles.notifEmpty}>{t.nav.notificationsEmpty}</div>
      ) : (
        <ul className={styles.notifList}>
          {notifications.map((n) => {
            const Icon = getNotificationPresentation(n.type).icon;
            const time = formatNotifTime(n.createdAt);
            return (
              <li key={n.id}>
                <button
                  type="button"
                  className={`${styles.notifItem} ${n.isRead ? "" : styles.notifUnread}`}
                  aria-label={n.isRead ? n.title : `${n.title}. ${t.nav.unreadAria}`}
                  onClick={() => void openNotification(n.id, n.actionUrl, n.isRead)}
                >
                  <Icon
                    size={16}
                    className={styles.notifIcon}
                    style={{ color: getNotificationColor(n.type) }}
                  />
                  <span className={styles.notifBody}>
                    <span className={styles.notifItemTitle}>{n.title}</span>
                    {n.body ? <span className={styles.notifItemText}>{n.body}</span> : null}
                    {time ? <span className={styles.notifItemTime}>{time}</span> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className={styles.notifFoot}>
        <button
          type="button"
          className={styles.notifManage}
          onClick={() => {
            setNotifOpen(false);
            navigate("/settings/notifications");
          }}
        >
          {t.nav.notificationsManage}
        </button>
      </div>
    </div>
  );

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
        <div data-onboarding="sidebar" className={styles.sidebarTourRegion}>
          <button
            type="button"
            className={styles.logo}
            onClick={goHome}
            aria-label={t.nav.goHomeAria}
          >
            <BrandMark src={effectiveLogoSrc} broken={logoBroken} onBroken={onLogoError} />
            <span className={styles.logoText}>
              <span className={styles.logoTitle}>{sidebarBrandTitle}</span>
              <span className={styles.logoSub}>{t.nav.brandSubtitle}</span>
            </span>
          </button>
          <SideNav items={navItems} pathname={location.pathname} onNavigate={navigate} />
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
          </div>
          <div className={styles.headerTools}>
            <SyncIndicator offline={offline} />
            <Dropdown
              popupRender={() => notificationPanel}
              trigger={["click"]}
              placement="bottomRight"
              open={notifOpen}
              onOpenChange={setNotifOpen}
            >
              <button
                type="button"
                className={`${styles.notifBtn} ${notifOpen ? styles.notifBtnOpen : ""}`}
                aria-label={t.nav.notifications}
                aria-expanded={notifOpen}
                data-onboarding="notifications"
              >
                <Badge count={unreadCount} size="small" offset={[-2, 2]}>
                  <Bell size={20} />
                </Badge>
              </button>
            </Dropdown>
            <HeaderProfile />
          </div>
        </Header>

        <Content id="main-content" className={styles.content} tabIndex={-1}>
          <Outlet />
        </Content>
      </Layout>

      <nav className={styles.bottomNav} data-onboarding="bottom-nav" aria-label={t.nav.mobileNav}>
        {canGo("dashboard") ? (
          <button
            type="button"
            className={`${styles.bottomItem} ${isActive("/dashboard") ? styles.bottomActive : ""}`}
            onClick={() => navigate("/dashboard")}
            aria-label={t.nav.dashboard}
            aria-current={isActive("/dashboard") ? "page" : undefined}
          >
            <LayoutDashboard size={22} />
            <span>{t.nav.dashboardShort}</span>
            {isActive("/dashboard") ? <span className={styles.navDot} /> : null}
          </button>
        ) : null}
        {canGo("products") ? (
          <button
            type="button"
            className={`${styles.bottomItem} ${isActive("/products") ? styles.bottomActive : ""}`}
            onClick={() => navigate("/products")}
            aria-label={t.products.title}
            aria-current={isActive("/products") ? "page" : undefined}
          >
            <Package size={22} />
            <span>{t.products.title}</span>
            {isActive("/products") ? <span className={styles.navDot} /> : null}
          </button>
        ) : null}
        {canGo("pos") ? (
          <button
            type="button"
            className={`${styles.navFab} ${isActive("/pos") ? styles.navFabActive : ""}`}
            onClick={() => navigate("/pos")}
            aria-label={t.nav.pos}
            aria-current={isActive("/pos") ? "page" : undefined}
          >
            <ShoppingCart size={24} />
          </button>
        ) : null}
        {canGo("reports") ? (
          <button
            type="button"
            className={`${styles.bottomItem} ${isActive("/reports") ? styles.bottomActive : ""}`}
            onClick={() => navigate("/reports")}
            aria-label={t.reports.title}
            aria-current={isActive("/reports") ? "page" : undefined}
          >
            <TrendingUp size={22} />
            <span>{t.reports.title}</span>
            {isActive("/reports") ? <span className={styles.navDot} /> : null}
          </button>
        ) : null}
        <button
          type="button"
          className={`${styles.bottomItem} ${moreNavActive ? styles.bottomActive : ""}`}
          onClick={() => navigate("/more")}
          aria-label={t.nav.more}
          aria-current={moreNavActive ? "page" : undefined}
        >
          <MoreHorizontal size={22} />
          <span>{t.nav.more}</span>
          {moreNavActive ? <span className={styles.navDot} /> : null}
        </button>
      </nav>

      <Drawer
        title={
          <div className={styles.drawerBrand}>
            <BrandMark src={effectiveLogoSrc} broken={logoBroken} onBroken={onLogoError} />
            <div className={styles.drawerTitles}>
              <Typography.Text strong>{sidebarBrandTitle}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t.common.menu}
              </Typography.Text>
            </div>
          </div>
        }
        placement="left"
        width={280}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        styles={{ body: { padding: "8px 8px 24px" } }}
      >
        <SideNav
          items={navItems}
          pathname={location.pathname}
          onNavigate={(path) => {
            navigate(path);
            setMobileNavOpen(false);
          }}
        />
      </Drawer>

      <OnboardingTour />
    </Layout>
  );
}
