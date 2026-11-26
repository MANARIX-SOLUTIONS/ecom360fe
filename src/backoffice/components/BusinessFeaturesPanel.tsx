import { useCallback, useEffect, useState } from "react";
import { Button, Select, Typography, message } from "antd";
import {
  listAdminBusinessFeatures,
  replaceAdminBusinessFeatures,
  type AdminBusinessFeature,
} from "@/api/backoffice";
import { PLAN_FEATURES } from "@/backoffice/planFeatures";
import { useCan } from "@/backoffice/rbac/useCan";

type Choice = "inherit" | "on" | "off";

type Props = {
  businessId: string;
};

function choiceOf(feature: AdminBusinessFeature | undefined): Choice {
  if (!feature || feature.override == null) return "inherit";
  return feature.override ? "on" : "off";
}

export function BusinessFeaturesPanel({ businessId }: Props) {
  const can = useCan();
  const canWrite = can("tenants.write");
  const [features, setFeatures] = useState<AdminBusinessFeature[]>([]);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const apply = useCallback((rows: AdminBusinessFeature[]) => {
    setFeatures(rows);
    const next: Record<string, Choice> = {};
    for (const row of rows) next[row.key] = choiceOf(row);
    setChoices(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAdminBusinessFeatures(businessId)
      .then((rows) => {
        if (!cancelled) apply(rows);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          message.error(error instanceof Error ? error.message : "Chargement impossible");
          setFeatures([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apply, businessId]);

  const save = async () => {
    const overrides: Record<string, boolean | null> = {};
    for (const feature of PLAN_FEATURES) {
      const choice = choices[feature.key] ?? "inherit";
      if (choice === "on") overrides[feature.key] = true;
      if (choice === "off") overrides[feature.key] = false;
    }
    setSaving(true);
    try {
      const rows = await replaceAdminBusinessFeatures(businessId, overrides);
      apply(rows);
      message.success("Exceptions enregistrées");
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  const rows = features.length
    ? features
    : PLAN_FEATURES.map((feature) => ({
        key: feature.key,
        label: feature.label,
        planEnabled: false,
        override: null,
        effective: false,
      }));

  return (
    <div>
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 10 }}>
        Hérité suit le plan. Activé ou Désactivé force la valeur pour cette entreprise, y compris
        sur les contrôles déjà en place.
      </Typography.Text>
      {rows.map((feature) => (
        <div
          key={feature.key}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div>
            <div>{feature.label}</div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Plan : {feature.planEnabled ? "inclus" : "absent"} · Effectif :{" "}
              {feature.effective ? "oui" : "non"}
            </Typography.Text>
          </div>
          <Select
            size="small"
            style={{ width: 140 }}
            disabled={!canWrite || loading}
            value={choices[feature.key] ?? "inherit"}
            onChange={(value: Choice) =>
              setChoices((current) => ({ ...current, [feature.key]: value }))
            }
            options={[
              { value: "inherit", label: "Hérité" },
              { value: "on", label: "Activé" },
              { value: "off", label: "Désactivé" },
            ]}
          />
        </div>
      ))}
      {canWrite ? (
        <Button type="primary" loading={saving} disabled={loading} onClick={() => void save()}>
          Enregistrer les exceptions
        </Button>
      ) : null}
    </div>
  );
}
