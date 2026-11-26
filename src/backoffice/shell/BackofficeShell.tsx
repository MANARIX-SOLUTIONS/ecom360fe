import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { App as AntdApp, Badge, ConfigProvider, Drawer, Dropdown } from "antd";
import enUS from "antd/locale/en_US";
import frFR from "antd/locale/fr_FR";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bell,
  Building2,
  Check,
  CircleHelp,
  CreditCard,
  FileText,
  Flag,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Moon,
  Receipt,
  Search,
  Shield,
  Store,
  Sun,
  UserPlus,
  Users,
  X,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getAdminStats, getAdminSystemHealth } from "@/api/backoffice";
import { SkipLink } from "@/components/SkipLink";
import { APP_LOGO_MARK } from "@/constants/branding";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useUserProfile } from "@/hooks/useUserProfile";
import { visibleNav, type NavItemId } from "../nav";
import { useBackofficeI18n, useBackofficePreferences } from "../useBackofficePreferences";
import { useBackofficeRole, useCan } from "../rbac/useCan";
import { backofficeEnvironment, platformStatusFromOverall, type PlatformTone } from "../status";
import { backofficeTheme } from "../theme";
import { CommandPalette } from "./CommandPalette";
import styles from "./shell.module.css";
import "../tokens.css";

const ICONS: Record<NavItemId, LucideIcon> = {
  overview: LayoutDashboard,
  analytics: LineChart,
  leads: UserPlus,
  tenants: Building2,
  stores: Store,
  payments: CreditCard,
  invoices: Receipt,
  plans: Flag,
  users: Users,
  roles: Shield,
  communications: Bell,
  system: Activity,
  audit: FileText,
};

const STATUS_ICON: Record<PlatformTone, LucideIcon> = {
  ok: Check,
  warn: AlertTriangle,
  danger: AlertTriangle,
  unknown: CircleHelp,
};

const COLLAPSE_KEY = "ecom360_bo_collapsed";

export function BackofficeShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { displayName, initials } = useUserProfile();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications({
    pollingIntervalMs: 30000,
  });
  const { t, locale } = useBackofficeI18n();
  const prefs = useBackofficePreferences();
  const role = useBackofficeRole();
  const can = useCan();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === "true");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [medium, setMedium] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [pending, setPending] = useState(0);
  const [status, setStatus] = useState(platformStatusFromOverall(null));

  useEffect(() => {
    const phone = window.matchMedia("(max-width: 1023px)");
    const tablet = window.matchMedia("(min-width: 1024px) and (max-width: 1279px)");
    const apply = () => {
      setNarrow(phone.matches);
      setMedium(tablet.matches);
    };
    apply();
    phone.addEventListener("change", apply);
    tablet.addEventListener("change", apply);
    return () => {
      phone.removeEventListener("change", apply);
      tablet.removeEventListener("change", apply);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      getAdminSystemHealth()
        .then((health) => {
          if (!cancelled) setStatus(platformStatusFromOverall(health.overall));
        })
        .catch(() => {
          if (!cancelled) setStatus(platformStatusFromOverall(null));
        });
      getAdminStats()
        .then((stats) => {
          if (!cancelled) setPending(stats.pendingDemoRequestsCount ?? 0);
        })
        .catch(() => {
          if (!cancelled) setPending(0);
        });
    };
    load();
    const timer = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let primed = false;
    let timer = 0;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target != null &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() === "g") {
        primed = true;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          primed = false;
        }, 800);
        return;
      }
      if (!primed) return;
      primed = false;
      const key = event.key.toLowerCase();
      if (key === "e") {
        event.preventDefault();
        navigate("/backoffice/businesses");
      } else if (key === "p") {
        event.preventDefault();
        navigate("/backoffice/payments");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [navigate]);

  const rail = !narrow && (collapsed || medium);
  const groups = visibleNav(can);
  const current = groups
    .flatMap((group) => group.items)
    .find((item) =>
      item.end ? location.pathname === item.href : location.pathname.startsWith(item.href)
    );
  const StatusIcon = STATUS_ICON[status.tone];
  const env = backofficeEnvironment();

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      localStorage.setItem(COLLAPSE_KEY, String(!value));
      return !value;
    });
  };

  return (
    <ConfigProvider
      theme={backofficeTheme(prefs.resolvedTheme, prefs.density)}
      locale={locale === "en" ? enUS : frFR}
    >
      <AntdApp notification={{ placement: "bottomRight" }}>
        <div
          className={`${styles.shell} boShell`}
          data-theme={prefs.resolvedTheme}
          data-theme-preference={prefs.theme}
          data-density={prefs.density}
          data-collapsed={rail ? "true" : "false"}
        >
          <SkipLink />
          {mobileOpen ? (
            <button
              type="button"
              className={styles.overlay}
              aria-label={t.shell.closeMenu}
              onClick={() => setMobileOpen(false)}
            />
          ) : null}
          <aside
            className={`${styles.sider} ${mobileOpen ? styles.siderOpen : ""}`}
            aria-label={t.shell.console}
          >
            <div className={styles.brand}>
              <img src={APP_LOGO_MARK} alt="" className={styles.logo} />
              <div className={styles.brandText}>
                <span className={styles.brandName}>{t.shell.product}</span>
                <span className={styles.brandMeta}>{t.shell.console}</span>
              </div>
              <button
                type="button"
                className={`${styles.iconBtn} ${styles.mobileOnly}`}
                aria-label={t.shell.closeMenu}
                onClick={() => setMobileOpen(false)}
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
            <button
              type="button"
              className={styles.statusPill}
              aria-label={`${t.status.platform} : ${t.status[status.key]}`}
              onClick={() => {
                navigate("/backoffice/system");
                setMobileOpen(false);
              }}
            >
              <span className={`${styles.dot} ${styles[status.tone]}`} aria-hidden />
              <StatusIcon size={14} strokeWidth={1.75} aria-hidden />
              <span className={styles.statusLabel}>{t.status[status.key]}</span>
            </button>
            <nav className={styles.nav}>
              {groups.map((group) => (
                <div key={group.id} className={styles.group}>
                  <p className={styles.groupLabel}>{t.nav.groups[group.id]}</p>
                  {group.items.map((item) => {
                    const Icon = ICONS[item.id];
                    const active = current?.id === item.id;
                    const count = item.badge === "demoRequests" ? pending : 0;
                    return (
                      <a
                        key={item.id}
                        href={item.href}
                        className={`${styles.link} ${active ? styles.linkActive : ""}`}
                        aria-current={active ? "page" : undefined}
                        title={t.nav.items[item.id]}
                        onClick={(event) => {
                          event.preventDefault();
                          navigate(item.href);
                          setMobileOpen(false);
                        }}
                      >
                        <Icon size={18} strokeWidth={1.75} aria-hidden />
                        <span className={styles.linkLabel}>{t.nav.items[item.id]}</span>
                        {count > 0 ? <span className={styles.count}>{count}</span> : null}
                      </a>
                    );
                  })}
                </div>
              ))}
            </nav>
            <div className={styles.footer}>
              <span className={styles.avatar} aria-hidden>
                {initials}
              </span>
              <span className={styles.userCopy}>
                <span className={styles.userName}>{displayName}</span>
                <span className={styles.roleBadge}>{t.roles[role]}</span>
              </span>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label={prefs.resolvedTheme === "dark" ? t.shell.themeLight : t.shell.themeDark}
                onClick={() => prefs.setTheme(prefs.resolvedTheme === "dark" ? "light" : "dark")}
              >
                {prefs.resolvedTheme === "dark" ? (
                  <Sun size={16} strokeWidth={1.75} />
                ) : (
                  <Moon size={16} strokeWidth={1.75} />
                )}
              </button>
            </div>
          </aside>

          <div className={styles.main}>
            <header className={styles.topbar}>
              <div className={styles.topLeft}>
                <button
                  type="button"
                  className={`${styles.iconBtn} ${styles.mobileOnly}`}
                  aria-label={t.shell.openMenu}
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu size={18} strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  className={`${styles.iconBtn} ${styles.hideMobile}`}
                  aria-label={collapsed ? t.shell.expand : t.shell.collapse}
                  onClick={toggleCollapsed}
                >
                  {collapsed ? (
                    <ChevronsRight size={18} strokeWidth={1.75} />
                  ) : (
                    <ChevronsLeft size={18} strokeWidth={1.75} />
                  )}
                </button>
                <nav className={styles.crumb} aria-label={t.shell.breadcrumb}>
                  <span>{t.shell.console}</span>
                  {current && current.id !== "overview" ? (
                    <>
                      <span aria-hidden>/</span>
                      <strong>{t.nav.items[current.id]}</strong>
                    </>
                  ) : null}
                </nav>
              </div>
              <div className={styles.topRight}>
                <button
                  type="button"
                  className={styles.searchBtn}
                  aria-label={t.shell.searchLabel}
                  onClick={() => setSearchOpen(true)}
                >
                  <Search size={16} strokeWidth={1.75} aria-hidden />
                  <span className={styles.searchText}>{t.shell.search}</span>
                  <kbd className={styles.hideMobile}>⌘K</kbd>
                </button>
                {env !== "production" ? (
                  <span className={styles.envBadge}>{t.env[env]}</span>
                ) : null}
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label={t.shell.notifications}
                  onClick={() => setNotesOpen(true)}
                >
                  <Badge count={unreadCount} size="small">
                    <Bell size={18} strokeWidth={1.75} />
                  </Badge>
                </button>
                <button
                  type="button"
                  className={styles.textBtn}
                  onClick={() => navigate("/dashboard")}
                >
                  <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
                  <span className={styles.backText}>{t.shell.backToApp}</span>
                </button>
                <Dropdown
                  trigger={["click"]}
                  popupRender={() => (
                    <div
                      className={styles.menuPanel}
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                      }}
                    >
                      <div className={styles.menuLabel}>{t.shell.theme}</div>
                      <div className={styles.menuRow}>
                        {(["light", "dark", "system"] as const).map((option) => (
                          <button
                            key={option}
                            type="button"
                            className={`${styles.choice} ${prefs.theme === option ? styles.choiceOn : ""}`}
                            onClick={() => prefs.setTheme(option)}
                          >
                            {option === "light"
                              ? t.shell.themeLight
                              : option === "dark"
                                ? t.shell.themeDark
                                : t.shell.themeSystem}
                          </button>
                        ))}
                      </div>
                      <div className={styles.menuLabel}>{t.shell.density}</div>
                      <div className={styles.menuRow}>
                        {(["comfortable", "compact"] as const).map((option) => (
                          <button
                            key={option}
                            type="button"
                            className={`${styles.choice} ${prefs.density === option ? styles.choiceOn : ""}`}
                            onClick={() => prefs.setDensity(option)}
                          >
                            {option === "comfortable"
                              ? t.shell.densityComfortable
                              : t.shell.densityCompact}
                          </button>
                        ))}
                      </div>
                      <div className={styles.menuLabel}>{t.shell.language}</div>
                      <div className={styles.menuRow}>
                        {(["fr", "en"] as const).map((option) => (
                          <button
                            key={option}
                            type="button"
                            className={`${styles.choice} ${locale === option ? styles.choiceOn : ""}`}
                            onClick={() => prefs.setLocale(option)}
                          >
                            {option === "fr" ? t.shell.languageFr : t.shell.languageEn}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className={styles.textBtn}
                        onClick={() => {
                          logout();
                          navigate("/login");
                        }}
                      >
                        <LogOut size={16} strokeWidth={1.75} aria-hidden />
                        {t.shell.logout}
                      </button>
                    </div>
                  )}
                >
                  <button type="button" className={styles.iconBtn} aria-label={t.shell.account}>
                    <span className={styles.avatar}>{initials}</span>
                  </button>
                </Dropdown>
              </div>
            </header>
            <main id="main-content" className={styles.content} tabIndex={-1}>
              <div className={styles.inner}>
                <Outlet />
              </div>
            </main>
          </div>
          <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
          <Drawer
            open={notesOpen}
            onClose={() => setNotesOpen(false)}
            title={t.shell.notifications}
            width={400}
            extra={
              unreadCount > 0 ? (
                <button type="button" className={styles.textBtn} onClick={() => void markAllRead()}>
                  {t.shell.markAllRead}
                </button>
              ) : null
            }
          >
            {notifications.length === 0 ? <p>{t.shell.notificationsEmpty}</p> : null}
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                className={`${styles.notice} ${notification.isRead ? styles.noticeRead : ""}`}
                onClick={() => {
                  if (!notification.isRead) void markRead(notification.id);
                  if (notification.actionUrl) navigate(notification.actionUrl);
                  setNotesOpen(false);
                }}
              >
                <span>
                  <strong>{notification.title}</strong>
                  {notification.body ? (
                    <span style={{ display: "block", color: "var(--text-muted)" }}>
                      {notification.body}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </Drawer>
        </div>
      </AntdApp>
    </ConfigProvider>
  );
}
