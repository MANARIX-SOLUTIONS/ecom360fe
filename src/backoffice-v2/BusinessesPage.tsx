import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PLAN_LABEL,
  STATUS_LABEL,
  daysFromToday,
  daysSince,
  formatFcfa,
  healthScore,
  monthlyAmount,
  type Tenant,
} from "./model";
import { useConsole } from "./store";
import { EmptyState, Pill } from "./ui";
import styles from "./console.module.css";

type View = "tous" | "renouvellements" | "impayes" | "inactifs" | "essais";

const VIEWS: { id: View; label: string }[] = [
  { id: "tous", label: "Toutes" },
  { id: "renouvellements", label: "Renouvellements proches" },
  { id: "impayes", label: "Impayés" },
  { id: "inactifs", label: "Inactifs" },
  { id: "essais", label: "Essais qui finissent cette semaine" },
];

function statusTone(status: Tenant["status"]): "ok" | "warn" | "danger" | "info" | undefined {
  if (status === "actif") return "ok";
  if (status === "impaye" || status === "essai") return "warn";
  if (status === "suspendu" || status === "resilie") return "danger";
  if (status === "demo") return "info";
  return undefined;
}

export default function BusinessesPage() {
  const { tenants } = useConsole();
  const navigate = useNavigate();
  const [view, setView] = useState<View>("tous");
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return tenants.filter((tenant) => {
      if (needle && !`${tenant.name} ${tenant.owner}`.toLowerCase().includes(needle)) return false;
      const days = daysFromToday(tenant.renewal);
      if (view === "renouvellements") {
        return (tenant.status === "actif" || tenant.status === "impaye") && days >= 0 && days <= 30;
      }
      if (view === "impayes") return tenant.status === "impaye";
      if (view === "inactifs")
        return tenant.status === "actif" && daysSince(tenant.lastActivity) >= 14;
      if (view === "essais") return tenant.status === "essai" && days >= 0 && days <= 7;
      return true;
    });
  }, [search, tenants, view]);

  return (
    <div>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Entreprises</h1>
          <p className={styles.lede}>
            {rows.length} lignes · MRR et GMV viennent du même échantillon
          </p>
        </div>
      </div>
      <div className={styles.filters}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nom ou propriétaire"
          aria-label="Rechercher une entreprise"
        />
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={view === item.id ? styles.btnPrimary : styles.btn}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title="Aucune entreprise"
          body="Ce filtre ne correspond à aucune ligne de l'échantillon."
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Entreprise</th>
                <th>Plan</th>
                <th>Modes</th>
                <th>Boutiques</th>
                <th>Utilisateurs</th>
                <th>MRR</th>
                <th>GMV 30 j</th>
                <th>Activité</th>
                <th>Santé</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tenant, index) => {
                const renewalDays = daysFromToday(tenant.renewal);
                const score = healthScore(tenant);
                return (
                  <tr
                    key={tenant.id}
                    data-active={index === activeIndex}
                    tabIndex={0}
                    onClick={() => navigate(`/backoffice/v2/entreprises/${tenant.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        setActiveIndex(Math.min(rows.length - 1, index + 1));
                      }
                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        setActiveIndex(Math.max(0, index - 1));
                      }
                      if (event.key === "Enter")
                        navigate(`/backoffice/v2/entreprises/${tenant.id}`);
                    }}
                  >
                    <td>
                      <strong>{tenant.name}</strong>
                      <div className={styles.kpiHint}>{tenant.owner}</div>
                    </td>
                    <td>
                      {PLAN_LABEL[tenant.plan]}
                      <div
                        className={
                          renewalDays < 30 && renewalDays >= 0 ? styles.warn : styles.kpiHint
                        }
                      >
                        {renewalDays < 30 && renewalDays >= 0 ? `${renewalDays} j` : ""}{" "}
                        {new Date(tenant.renewal).toLocaleDateString("fr-FR")}
                      </div>
                    </td>
                    <td>{tenant.modes.join(" · ")}</td>
                    <td>{tenant.stores}</td>
                    <td>{tenant.users}</td>
                    <td>{formatFcfa(monthlyAmount(tenant))}</td>
                    <td>{formatFcfa(tenant.gmv30)}</td>
                    <td>
                      {daysSince(tenant.lastActivity) === 0
                        ? "Aujourd'hui"
                        : `${daysSince(tenant.lastActivity)} j`}
                    </td>
                    <td>{score == null ? "—" : score}</td>
                    <td>
                      <Pill tone={statusTone(tenant.status)}>{STATUS_LABEL[tenant.status]}</Pill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
