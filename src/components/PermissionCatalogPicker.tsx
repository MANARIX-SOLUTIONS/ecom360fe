import { useMemo } from "react";
import { Checkbox, Typography } from "antd";
import type { PermissionCatalogItem } from "@/api/roles";
import { groupPermissionsByCategory } from "@/utils/permissionCatalog";

type Props = {
  catalog: PermissionCatalogItem[];
  selected: string[];
  onChange: (codes: string[]) => void;
};

/**
 * Grille de permissions groupée par domaine métier (données issues du catalogue API).
 */
export function PermissionCatalogPicker({ catalog, selected, onChange }: Props) {
  const groups = useMemo(() => groupPermissionsByCategory(catalog), [catalog]);

  return (
    <Checkbox.Group
      style={{ width: "100%" }}
      value={selected}
      onChange={(v) => onChange(v as string[])}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxHeight: 440,
          overflow: "auto",
        }}
      >
        {groups.map((g) => (
          <div key={g.category}>
            <Typography.Text strong style={{ display: "block", marginBottom: 8, fontSize: 13 }}>
              {g.title}
            </Typography.Text>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 8,
              }}
            >
              {g.items.map((item) => (
                <Checkbox key={item.code} value={item.code}>
                  <span title={item.code}>{item.label}</span>
                </Checkbox>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Checkbox.Group>
  );
}
