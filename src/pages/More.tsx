import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Typography } from "antd";
import { Users, Truck, Receipt, Settings, Shield, ChevronRight } from "lucide-react";
import { useAuthRole } from "@/hooks/useAuthRole";
import { usePermissions } from "@/hooks/usePermissions";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { useUserProfile } from "@/hooks/useUserProfile";
import { t } from "@/i18n";
import styles from "./More.module.css";

type MenuLink = {
  path: string;
  permission: string;
  icon: typeof Users;
  label: string;
  desc: string;
  group: "commerce" | "admin";
};

const linkConfig: MenuLink[] = [
  {
    path: "/clients",
    permission: "clients",
    icon: Users,
    label: t.clients.title,
    desc: "Crédits et paiements",
    group: "commerce",
  },
  {
    path: "/suppliers",
    permission: "suppliers",
    icon: Truck,
    label: t.suppliers.title,
    desc: "Achats et soldes",
    group: "commerce",
  },
  {
    path: "/expenses",
    permission: "expenses",
    icon: Receipt,
    label: t.expenses.title,
    desc: "Suivi des charges",
    group: "commerce",
  },
  {
    path: "/settings",
    permission: "settings",
    icon: Settings,
    label: t.settings.title,
    desc: t.settings.subtitle,
    group: "admin",
  },
  {
    path: "/backoffice",
    permission: "backoffice",
    icon: Shield,
    label: t.backoffice.title,
    desc: t.backoffice.subtitle,
    group: "admin",
  },
];

export default function More() {
  const navigate = useNavigate();
  const { can } = useAuthRole();
  const { canAccess: canAccessBackend } = usePermissions();
  const { canAccess: canAccessPlan } = usePlanFeatures();
  const { displayName, initials } = useUserProfile();

  const links = useMemo(
    () =>
      linkConfig.filter((l) => {
        const backendCan = canAccessBackend(l.permission as Parameters<typeof canAccessBackend>[0]);
        const roleCan = can(l.permission as Parameters<typeof can>[0]);
        return (backendCan || roleCan) && canAccessPlan(l.permission, backendCan || roleCan);
      }),
    [can, canAccessBackend, canAccessPlan]
  );
  const commerceLinks = links.filter((l) => l.group === "commerce");
  const adminLinks = links.filter((l) => l.group === "admin");

  const renderItem = (item: MenuLink) => {
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
          <span className={styles.itemTitle}>{item.label}</span>
          <span className={styles.itemDesc}>{item.desc}</span>
        </span>
        <ChevronRight size={18} className={styles.itemChevron} />
      </button>
    );
  };

  return (
    <div className={`${styles.page} pageWrapper`}>
      {/* Profile card */}
      <Card
        bordered={false}
        className={styles.profileCard}
        onClick={() => navigate("/profile")}
        hoverable
      >
        <div className={styles.profileInner}>
          <span className={styles.avatar}>{initials}</span>
          <div className={styles.profileInfo}>
            <Typography.Text strong className={styles.profileName}>
              {displayName}
            </Typography.Text>
            <Typography.Text type="secondary" className={styles.profileHint}>
              Voir mon profil
            </Typography.Text>
          </div>
          <ChevronRight size={20} className={styles.itemChevron} />
        </div>
      </Card>

      {/* Commerce section */}
      {commerceLinks.length > 0 && (
        <section className={styles.section}>
          <Typography.Text type="secondary" className={styles.sectionTitle}>
            Commerce
          </Typography.Text>
          <Card bordered={false} className={styles.listCard}>
            <div className={styles.itemList}>
              {commerceLinks.map((item, i) => (
                <div key={item.path}>
                  {renderItem(item)}
                  {i < commerceLinks.length - 1 && <div className={styles.divider} />}
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Admin section */}
      {adminLinks.length > 0 && (
        <section className={styles.section}>
          <Typography.Text type="secondary" className={styles.sectionTitle}>
            Administration
          </Typography.Text>
          <Card bordered={false} className={styles.listCard}>
            <div className={styles.itemList}>
              {adminLinks.map((item, i) => (
                <div key={item.path}>
                  {renderItem(item)}
                  {i < adminLinks.length - 1 && <div className={styles.divider} />}
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}
