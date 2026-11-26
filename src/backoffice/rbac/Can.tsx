import type { ReactNode } from "react";
import { Tooltip } from "antd";
import { useBackofficeI18n } from "../useBackofficePreferences";
import { useCan } from "./useCan";
import type { BackofficePermission } from "./permissions";

export function Can({
  permission,
  mode = "hide",
  children,
}: {
  permission: BackofficePermission;
  mode?: "hide" | "disable";
  children: ReactNode;
}) {
  const allowed = useCan()(permission);
  const { t } = useBackofficeI18n();
  if (allowed) return children;
  if (mode === "hide") return null;
  return (
    <Tooltip title={t.permissions.denied}>
      <span style={{ display: "inline-flex", cursor: "not-allowed" }}>
        <span
          aria-disabled="true"
          style={{ display: "inline-flex", pointerEvents: "none", opacity: 0.45 }}
        >
          {children}
        </span>
      </span>
    </Tooltip>
  );
}
