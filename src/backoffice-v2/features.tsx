import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FEATURES,
  PLAN_LABEL,
  STATUS_LABEL,
  denyReason,
  featureById,
  findFeatureOverride,
  isFeatureEnabled,
  planIncludesFeature,
  type FeatureId,
  type RoleId,
  type Tenant,
} from "./model";
import { useConsole } from "./store";
import { Pill } from "./ui";
import styles from "./console.module.css";

type View = "entreprise" | "plan";

function exceptionLabel(count: number): string {
  return count > 1 ? `${count} exceptions` : `${count} exception`;
}

export default function FeaturesPage() {
  const { tenants, featureOverrides } = useConsole();
  const [view, setView] = useState<View>("entreprise");
  const [query, setQuery] = useState("");
  const [pickedId, setPickedId] = useState("epi-medina");

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tenants;
    return tenants.filter(
      (tenant) =>
        tenant.name.toLowerCase().includes(needle) || tenant.city.toLowerCase().includes(needle)
    );
  }, [query, tenants]);

  const selected = matches.find((tenant) => tenant.id === pickedId) ?? matches[0] ?? null;
  const visibleOverrides = featureOverrides.filter((item) =>
    tenants.some((tenant) => tenant.id === item.tenantId)
  );

  return (
    <div>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Modules & fonctionnalités</h1>
          <p className={styles.lede}>
            Le plan décide de ce qui est inclus. Une exception n'ouvre ou ne ferme un module que
            pour une entreprise, avec un motif journalisé.
          </p>
        </div>
      </div>

      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={view === "entreprise"}
          onClick={() => setView("entreprise")}
        >
          Par entreprise
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "plan"}
          onClick={() => setView("plan")}
        >
          Par plan
        </button>
      </div>

      {visibleOverrides.length > 0 ? (
        <div className={styles.strip}>
          {visibleOverrides.map((item) => {
            const tenant = tenants.find((candidate) => candidate.id === item.tenantId);
            const feature = featureById(item.featureId);
            if (!tenant) return null;
            return (
              <button
                key={`${item.tenantId}-${item.featureId}`}
                type="button"
                className={styles.chip}
                onClick={() => {
                  setQuery("");
                  setPickedId(item.tenantId);
                  setView("entreprise");
                }}
              >
                {tenant.name} · {feature.label} · {item.enabled ? "accordé" : "retiré"}
              </button>
            );
          })}
        </div>
      ) : null}

      {view === "plan" ? <PlanMatrix /> : null}

      {view === "entreprise" ? (
        <div className={styles.stack}>
          <div className={styles.filters}>
            <input
              value={query}
              placeholder="Rechercher une entreprise ou une ville"
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Rechercher une entreprise"
            />
            <select
              value={selected?.id ?? ""}
              aria-label="Entreprise"
              onChange={(event) => setPickedId(event.target.value)}
            >
              {matches.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} · {PLAN_LABEL[tenant.plan]} · {tenant.city}
                </option>
              ))}
            </select>
          </div>
          {selected ? (
            <>
              <div className={styles.pageHead}>
                <div>
                  <h2 className={styles.moduleName}>{selected.name}</h2>
                  <p className={styles.lede}>
                    {PLAN_LABEL[selected.plan]} · {STATUS_LABEL[selected.status]} ·{" "}
                    {exceptionLabel(
                      featureOverrides.filter((item) => item.tenantId === selected.id).length
                    )}
                  </p>
                </div>
                <Link
                  className={styles.btn}
                  to={`/backoffice/v2/entreprises/${selected.id}?tab=fonctionnalites`}
                >
                  Fiche entreprise
                </Link>
              </div>
              <EnterpriseFeatures tenant={selected} />
            </>
          ) : (
            <p className={styles.lede}>Aucune entreprise ne correspond à cette recherche.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function EnterpriseFeatures({ tenant }: { tenant: Tenant }) {
  const state = useConsole();
  const [moduleQuery, setModuleQuery] = useState("");
  const [draft, setDraft] = useState<{
    featureId: FeatureId;
    enabled: boolean;
    reason: string;
  } | null>(null);
  const [resetId, setResetId] = useState<FeatureId | null>(null);

  const rows = FEATURES.filter((feature) => {
    const needle = moduleQuery.trim().toLowerCase();
    if (!needle) return true;
    return (
      feature.label.toLowerCase().includes(needle) ||
      feature.description.toLowerCase().includes(needle)
    );
  });
  const exceptions = state.featureOverrides.filter((item) => item.tenantId === tenant.id);

  return (
    <div className={styles.stack}>
      <p className={styles.lede}>
        {exceptions.length === 0
          ? `Tous les modules suivent le plan ${PLAN_LABEL[tenant.plan]}.`
          : `${exceptions.length} exception${exceptions.length > 1 ? "s" : ""} pour ${tenant.name}. Les autres modules suivent le plan ${PLAN_LABEL[tenant.plan]}.`}
      </p>
      <div className={styles.filters}>
        <input
          value={moduleQuery}
          placeholder="Filtrer les modules"
          aria-label="Filtrer les modules"
          onChange={(event) => setModuleQuery(event.target.value)}
        />
      </div>
      <div className={styles.tableWrap}>
        <table className={`${styles.table} ${styles.tableStatic}`}>
          <thead>
            <tr>
              <th>Module</th>
              <th>Plan {PLAN_LABEL[tenant.plan]}</th>
              <th>Cette entreprise</th>
              <th>Exception</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((feature) => {
              const included = feature.plans[tenant.plan];
              const override = findFeatureOverride(state.featureOverrides, tenant.id, feature.id);
              const enabled = isFeatureEnabled(
                tenant.plan,
                feature.id,
                state.featureOverrides,
                tenant.id
              );
              return (
                <tr key={feature.id}>
                  <td>
                    <span className={styles.moduleName}>{feature.label}</span>
                    <span className={styles.moduleDesc}>{feature.description}</span>
                  </td>
                  <td>{included ? "Inclus" : "Non inclus"}</td>
                  <td>
                    <Pill tone={enabled ? "ok" : undefined}>
                      {enabled ? "Activé" : "Désactivé"}
                    </Pill>
                  </td>
                  <td>{override ? override.reason : "Suit le plan"}</td>
                  <td>
                    <div className={styles.actions}>
                      <GuardButton
                        allowed={state.can("manageFeatures")}
                        role={state.role}
                        label={override ? "Modifier" : included ? "Retirer" : "Accorder"}
                        onClick={() =>
                          setDraft({
                            featureId: feature.id,
                            enabled: override ? override.enabled : !included,
                            reason: override?.reason ?? "",
                          })
                        }
                      />
                      {override ? (
                        <GuardButton
                          allowed={state.can("manageFeatures")}
                          role={state.role}
                          label="Revenir au plan"
                          onClick={() => setResetId(feature.id)}
                        />
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {draft ? (
        <FeatureDraftModal
          tenant={tenant}
          draft={draft}
          hasOverride={Boolean(
            findFeatureOverride(state.featureOverrides, tenant.id, draft.featureId)
          )}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onSave={(enabled, reason) => {
            const included = planIncludesFeature(tenant.plan, draft.featureId);
            if (enabled === included) {
              state.clearFeatureOverride(tenant, draft.featureId);
            } else {
              state.setFeatureOverride(tenant, draft.featureId, enabled, reason);
            }
            setDraft(null);
          }}
        />
      ) : null}

      {resetId ? (
        <ResetModal
          tenant={tenant}
          featureId={resetId}
          reason={findFeatureOverride(state.featureOverrides, tenant.id, resetId)?.reason ?? ""}
          onClose={() => setResetId(null)}
          onConfirm={() => {
            state.clearFeatureOverride(tenant, resetId);
            setResetId(null);
          }}
        />
      ) : null}
    </div>
  );
}

function PlanMatrix() {
  return (
    <div className={styles.stack}>
      <p className={styles.lede}>
        Changer l'inclusion d'un plan crée une nouvelle version. Les entreprises en cours gardent
        leur plan. Pour une seule entreprise, enregistrez une exception.
      </p>
      <div className={styles.tableWrap}>
        <table className={`${styles.table} ${styles.tableStatic}`}>
          <thead>
            <tr>
              <th>Module</th>
              <th>Starter</th>
              <th>Pro</th>
              <th>Business</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((feature) => (
              <tr key={feature.id}>
                <td>
                  <span className={styles.moduleName}>{feature.label}</span>
                  <span className={styles.moduleDesc}>{feature.description}</span>
                </td>
                <td>{feature.plans.starter ? <Pill tone="ok">Inclus</Pill> : "—"}</td>
                <td>{feature.plans.pro ? <Pill tone="ok">Inclus</Pill> : "—"}</td>
                <td>{feature.plans.business ? <Pill tone="ok">Inclus</Pill> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FeatureDraftModal({
  tenant,
  draft,
  hasOverride,
  onChange,
  onClose,
  onSave,
}: {
  tenant: Tenant;
  draft: { featureId: FeatureId; enabled: boolean; reason: string };
  hasOverride: boolean;
  onChange: (draft: { featureId: FeatureId; enabled: boolean; reason: string }) => void;
  onClose: () => void;
  onSave: (enabled: boolean, reason: string) => void;
}) {
  const feature = featureById(draft.featureId);
  const included = feature.plans[tenant.plan];
  const matchesPlan = draft.enabled === included;
  const reason = draft.reason.trim();
  const canSave = matchesPlan ? hasOverride : reason.length >= 8;

  return (
    <div className={styles.modalBack}>
      <button type="button" className={styles.scrim} aria-label="Fermer" onClick={onClose} />
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={`${feature.label} pour ${tenant.name}`}
      >
        <h3>
          {feature.label} · {tenant.name}
        </h3>
        <p className={styles.lede}>
          {included
            ? `Le plan ${PLAN_LABEL[tenant.plan]} inclut ce module.`
            : `Le plan ${PLAN_LABEL[tenant.plan]} n'inclut pas ce module.`}
        </p>
        <div className={styles.choice}>
          <label>
            <input
              type="radio"
              name="feature-effect"
              checked={draft.enabled}
              onChange={() => onChange({ ...draft, enabled: true })}
            />
            Accorder
          </label>
          <label>
            <input
              type="radio"
              name="feature-effect"
              checked={!draft.enabled}
              onChange={() => onChange({ ...draft, enabled: false })}
            />
            Retirer
          </label>
        </div>
        {matchesPlan ? (
          <p className={styles.lede}>
            {hasOverride
              ? "Cet état est déjà celui du plan. L'exception sera retirée."
              : "Cet état est déjà celui du plan."}
          </p>
        ) : (
          <label className={styles.field}>
            Motif
            <textarea
              value={draft.reason}
              onChange={(event) => onChange({ ...draft, reason: event.target.value })}
            />
          </label>
        )}
        <div className={styles.modalActions}>
          <button type="button" className={styles.btn} onClick={onClose}>
            Annuler
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={!canSave}
            title={canSave ? undefined : "Le motif doit expliquer l'exception"}
            onClick={() => onSave(draft.enabled, reason)}
          >
            {matchesPlan ? "Revenir au plan" : "Enregistrer l'exception"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetModal({
  tenant,
  featureId,
  reason,
  onClose,
  onConfirm,
}: {
  tenant: Tenant;
  featureId: FeatureId;
  reason: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const feature = featureById(featureId);
  return (
    <div className={styles.modalBack}>
      <button type="button" className={styles.scrim} aria-label="Fermer" onClick={onClose} />
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Revenir au plan">
        <h3>Revenir au plan</h3>
        <p>
          {feature.label} suivra à nouveau le plan {PLAN_LABEL[tenant.plan]} pour {tenant.name}. Le
          retour est journalisé.
        </p>
        {reason ? <p className={styles.lede}>Exception actuelle : {reason}</p> : null}
        <div className={styles.modalActions}>
          <button type="button" className={styles.btn} onClick={onClose}>
            Annuler
          </button>
          <button type="button" className={styles.btnPrimary} onClick={onConfirm}>
            Revenir au plan
          </button>
        </div>
      </div>
    </div>
  );
}

function GuardButton({
  allowed,
  role,
  label,
  onClick,
}: {
  allowed: boolean;
  role: RoleId;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.btn}
      disabled={!allowed}
      title={allowed ? undefined : denyReason(role)}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
