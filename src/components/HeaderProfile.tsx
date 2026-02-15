import { useNavigate } from "react-router-dom";
import { Dropdown } from "antd";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { t } from "@/i18n";
import styles from "./HeaderProfile.module.css";

export function HeaderProfile() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { displayName, initials } = useUserProfile();

  const menuItems = [
    {
      key: "profile",
      icon: <User size={16} />,
      label: t.profile.myProfile,
      onClick: () => navigate("/profile"),
    },
    {
      key: "settings",
      icon: <Settings size={16} />,
      label: t.settings.title,
      onClick: () => navigate("/settings"),
    },
    { type: "divider" as const },
    {
      key: "logout",
      icon: <LogOut size={16} />,
      label: t.settings.logout,
      danger: true,
      onClick: () => {
        logout();
        navigate("/login");
      },
    },
  ];

  return (
    <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight">
      <button type="button" className={styles.trigger} aria-label={t.profile.myProfile}>
        <span className={styles.avatar}>{initials}</span>
        <span className={styles.name}>{displayName}</span>
        <ChevronDown size={16} className={styles.chevron} />
      </button>
    </Dropdown>
  );
}
