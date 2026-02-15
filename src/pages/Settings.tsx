import { useMemo } from "react";
import { Card, Typography } from "antd";
import { Building2, CreditCard, Users, Shield, LogOut, Store, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAuthRole } from "@/hooks/useAuthRole";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import type { Permission } from "@/constants/roles";
import { t } from "@/i18n";
import styles from "./Settings.module.css";

type SettingItem = {
  icon: typeof Store;
  title: string;
  desc: string;
  path: string;
  permission: string;
};

const organisationConfig: SettingItem[] = [
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

const accountConfig: SettingItem[] = [
  {
    icon: Users,
    title: t.settings.usersAndRoles,
    desc: t.settings.usersAndRolesDesc,
    path: "/settings/users",
    permission: "settings:users",
  },
  {
    icon: Shield,
    title: t.settings.security,
    desc: t.settings.securityDesc,
    path: "/settings/security",
    permission: "settings:security",
  },
];

export default function Settings() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { can } = useAuthRole();
  const { canAccess } = usePlanFeatures();

  const organisationItems = useMemo(
    () =>
      organisationConfig.filter((item) =>
        canAccess(item.permission, can(item.permission as Permission))
      ),
    [can, canAccess]
  );
  const accountItems = useMemo(
    () =>
      accountConfig.filter((item) =>
        canAccess(item.permission, can(item.permission as Permission))
      ),
    [can, canAccess]
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
      <header className={styles.header}>
        <Typography.Title level={4} className={styles.title}>
          {t.settings.title}
        </Typography.Title>
        <Typography.Text type="secondary" className={styles.subtitle}>
          {t.settings.subtitle}
        </Typography.Text>
      </header>

      {organisationItems.length > 0 && (
        <section className={styles.section}>
          <Typography.Text type="secondary" className={styles.sectionTitle}>
            {t.settings.sectionOrganisation}
          </Typography.Text>
          <Card bordered={false} className={styles.card}>
            <div className={styles.itemList}>
              {organisationItems.map((item, i) => (
                <div key={item.path}>
                  {renderItem(item)}
                  {i < organisationItems.length - 1 && <div className={styles.itemDivider} />}
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {accountItems.length > 0 && (
        <section className={styles.section}>
          <Typography.Text type="secondary" className={styles.sectionTitle}>
            {t.settings.sectionAccount}
          </Typography.Text>
          <Card bordered={false} className={styles.card}>
            <div className={styles.itemList}>
              {accountItems.map((item, i) => (
                <div key={item.path}>
                  {renderItem(item)}
                  {i < accountItems.length - 1 && <div className={styles.itemDivider} />}
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      <section className={styles.section}>
        <Card bordered={false} className={styles.logoutCard}>
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
