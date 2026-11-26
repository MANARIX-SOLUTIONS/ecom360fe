import { useMemo } from "react";
import { Card } from "antd";
import {
  Building2,
  CreditCard,
  Users,
  Shield,
  LogOut,
  Store,
  ChevronRight,
  Bell,
  BadgeCheck,
  ShoppingBag,
  KeyRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { PageHeader } from "@/components/ui/PageHeader";
import { t } from "@/i18n";
import styles from "./Settings.module.css";

type SettingItem = {
  icon: typeof Store;
  title: string;
  desc: string;
  path: string;
  permission: string;
};

const businessConfig: SettingItem[] = [
  {
    icon: Store,
    title: t.stores.title,
    desc: t.stores.titleDesc,
    path: "/settings/stores",
    permission: "settings:stores",
  },
  {
    icon: Building2,
    title: t.settings.companyProfile,
    desc: t.settings.companyProfileDesc,
    path: "/settings/profile",
    permission: "settings:profile",
  },
  {
    icon: CreditCard,
    title: t.settings.subscription,
    desc: t.settings.subscriptionDesc,
    path: "/settings/subscription",
    permission: "settings:subscription",
  },
];

const teamConfig: SettingItem[] = [
  {
    icon: Users,
    title: t.settings.usersAndRoles,
    desc: t.settings.usersAndRolesDesc,
    path: "/settings/users",
    permission: "settings:users",
  },
  {
    icon: BadgeCheck,
    title: t.settings.rolesPermissions,
    desc: t.settings.rolesPermissionsDesc,
    path: "/settings/roles",
    permission: "settings:roles",
  },
];

const integrationsConfig: SettingItem[] = [
  {
    icon: ShoppingBag,
    title: t.settings.commerceTitle,
    desc: t.settings.commerceDesc,
    path: "/settings/commerce",
    permission: "settings:commerce",
  },
  {
    icon: KeyRound,
    title: t.settings.apiTitle,
    desc: t.settings.apiDesc,
    path: "/settings/api",
    permission: "settings:api",
  },
];

const accountConfig: SettingItem[] = [
  {
    icon: Bell,
    title: t.settings.notifications,
    desc: t.settings.notificationsDesc,
    path: "/settings/notifications",
    permission: "settings:notifications",
  },
  {
    icon: Shield,
    title: t.settings.security,
    desc: t.settings.securityDesc,
    path: "/settings/security",
    permission: "settings:security",
  },
];

const settingGroups = [
  { title: t.settings.sectionBusiness, items: businessConfig },
  { title: t.settings.sectionTeam, items: teamConfig },
  { title: t.settings.sectionIntegrations, items: integrationsConfig },
  { title: t.settings.sectionAccount, items: accountConfig },
] as const;

export default function Settings() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { canAccess: canAccessBackend } = usePermissions();
  const { canAccess: canAccessPlan } = usePlanFeatures();

  const visibleGroups = useMemo(
    () =>
      settingGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => {
            const backendCan = canAccessBackend(
              item.permission as Parameters<typeof canAccessBackend>[0]
            );
            return backendCan && canAccessPlan(item.permission, backendCan);
          }),
        }))
        .filter((group) => group.items.length > 0),
    [canAccessBackend, canAccessPlan]
  );

  const renderItem = (item: SettingItem) => {
    const Icon = item.icon;
    return (
      <button
        key={item.path}
        type="button"
        className={styles.item}
        onClick={() => navigate(item.path)}
      >
        <span className={styles.itemIcon}>
          <Icon size={20} />
        </span>
        <span className={styles.itemContent}>
          <span className={styles.itemTitle}>{item.title}</span>
          <span className={styles.itemDesc}>{item.desc}</span>
        </span>
        <ChevronRight size={18} className={styles.itemChevron} />
      </button>
    );
  };

  return (
    <div className={`${styles.page} pageWrapper`}>
      <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />

      {visibleGroups.map((group) => (
        <section key={group.title} className={styles.section}>
          <span className={styles.sectionTitle}>{group.title}</span>
          <Card variant="borderless" className={styles.card}>
            <div className={styles.itemList}>
              {group.items.map((item, i) => (
                <div key={item.path}>
                  {renderItem(item)}
                  {i < group.items.length - 1 && <div className={styles.itemDivider} />}
                </div>
              ))}
            </div>
          </Card>
        </section>
      ))}

      <section className={styles.section}>
        <Card variant="borderless" className={styles.logoutCard}>
          <button
            type="button"
            className={styles.logoutBtn}
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            <LogOut size={20} />
            <span>{t.settings.logout}</span>
          </button>
        </Card>
      </section>
    </div>
  );
}
