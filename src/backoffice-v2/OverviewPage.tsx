import { Link } from "react-router-dom";
import { AlertTriangle, CircleHelp } from "lucide-react";
import {
  ACTIVE_DEFINITION,
  GMV_DEFINITION,
  MRR_DEFINITION,
  PAYMENT_STATUS_LABEL,
  PLAN_LABEL,
  daysFromToday,
  daysSince,
  formatFcfa,
} from "./model";
import { STORY_PAYMENT_ID } from "./demo-data";
import { useConsole, useMetrics } from "./store";
import { ErrorState, Sparkline } from "./ui";
import styles from "./console.module.css";

export default function OverviewPage() {
  const state = useConsole();
  const metrics = useMetrics(state.tenants);
  if (state.dataState === "loading") {
    return (
      <div className={styles.kpis}>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className={styles.skel} />
        ))}
      </div>
    );
  }
  if (state.dataState === "error") {
    return <ErrorState onRetry={() => state.setDataState("ready")} />;
  }

  const failed = state.payments.filter((payment) => payment.status === "echoue");
  const pendingLeads = state.leads.filter((lead) => lead.stage === "nouvelle");
  const conversion = Math.round((state.conversion.paid / state.conversion.demos) * 100);
  const maxMove = Math.max(
    state.movement.nouveau,
    state.movement.expansion,
    state.movement.contraction,
    state.movement.churn,
    1
  );
  const planMax = Math.max(...metrics.plans.map((plan) => plan.count), 1);

  return (
    <div>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Vue d'ensemble</h1>
          <p className={styles.lede}>Jeudi 8 octobre 2026 · ce qu'il faut traiter aujourd'hui</p>
        </div>
        <label className={styles.chip}>
          <input
            type="checkbox"
            checked={state.includeDemo}
            onChange={(event) => state.setIncludeDemo(event.target.checked)}
          />
          Inclure les comptes démo/test
        </label>
      </div>

      <div className={styles.strip}>
        <Link to="/backoffice/v2/sante">
          <span
            className={`${styles.dot} ${state.platform.level === "ok" ? styles.dotOk : styles.dotWarn}`}
          />
          {state.platform.level === "ok" ? "Opérationnelle" : "Dégradée"} · {state.platform.label}
        </Link>
        <Link to="/backoffice/v2/incidents">0 incident ouvert</Link>
        <Link to="/backoffice/v2/taches">{state.failedJobs} jobs en échec · 24 h</Link>
      </div>

      <section className={styles.kpis}>
        <Kpi
          label="MRR"
          value={formatFcfa(metrics.mrr)}
          hint={MRR_DEFINITION}
          values={metrics.history}
        />
        <Kpi
          label="Nouveau MRR"
          value={formatFcfa(state.movement.nouveau)}
          hint="Nouveaux abonnements payants d'octobre. L'expansion est dans le graphique, pas ici."
        />
        <Kpi
          label="MRR perdu"
          value={formatFcfa(state.movement.churn)}
          hint="Abonnements résiliés en octobre, au prix mensuel qu'ils payaient."
        />
        <Kpi
          label="Entreprises actives"
          value={`${metrics.active} / ${metrics.total}`}
          hint={ACTIVE_DEFINITION}
        />
        <Kpi
          label="Essais en cours"
          value={String(metrics.trials)}
          hint="Essais non convertis, comptes démo exclus."
        />
        <Kpi
          label="Démo → payant"
          value={`${conversion} %`}
          hint={`${state.conversion.paid} payants pour ${state.conversion.demos} demandes sur 90 jours.`}
        />
      </section>

      <div className={styles.grid2}>
        <article className={styles.card}>
          <h2>Mouvements de MRR · octobre</h2>
          <div className={styles.bars}>
            <Bar label="Nouveau" amount={state.movement.nouveau} max={maxMove} tone="ok" />
            <Bar label="Expansion" amount={state.movement.expansion} max={maxMove} />
            <Bar
              label="Contraction"
              amount={state.movement.contraction}
              max={maxMove}
              tone="warn"
            />
            <Bar label="Churn" amount={state.movement.churn} max={maxMove} tone="danger" />
          </div>
          <p className={styles.kpiHint}>
            Volume d'affaires traité par les marchands (GMV, 30 j) : {formatFcfa(metrics.gmv)}.{" "}
            {GMV_DEFINITION}
          </p>
        </article>
        <article className={styles.card}>
          <h2>À traiter aujourd'hui</h2>
          <div className={styles.queue}>
            {failed.map((payment) => {
              const tenant = state.tenants.find((item) => item.id === payment.tenantId);
              if (!tenant) return null;
              return (
                <Link
                  key={payment.id}
                  to={`/backoffice/v2/entreprises/${tenant.id}?tab=abonnement`}
                >
                  <AlertTriangle size={14} />
                  <span>
                    Paiement {payment.channel} échoué · {tenant.name}
                    <span className={styles.kpiHint}> {PAYMENT_STATUS_LABEL[payment.status]}</span>
                  </span>
                  <strong>{formatFcfa(payment.amount)}</strong>
                </Link>
              );
            })}
            {pendingLeads.map((lead) => (
              <Link key={lead.id} to="/backoffice/v2/leads">
                <span />
                <span>Demande de démo · {lead.business}</span>
                <span>{lead.city}</span>
              </Link>
            ))}
            {metrics.renewalsSoon.slice(0, 4).map((tenant) => (
              <Link key={tenant.id} to={`/backoffice/v2/entreprises/${tenant.id}`}>
                <span />
                <span>Renouvellement · {tenant.name}</span>
                <span>{daysFromToday(tenant.renewal)} j</span>
              </Link>
            ))}
            {state.tickets.map((ticket) => (
              <Link key={ticket.id} to="/backoffice/v2/tickets">
                <span />
                <span>
                  Ticket {ticket.id} · {ticket.title}
                </span>
                <span>{ticket.waiting}</span>
              </Link>
            ))}
            {metrics.inactive.slice(0, 3).map((tenant) => (
              <Link key={tenant.id} to={`/backoffice/v2/entreprises/${tenant.id}`}>
                <span />
                <span>
                  Inactive depuis {daysSince(tenant.lastActivity)} j · {tenant.name}
                </span>
                <span />
              </Link>
            ))}
          </div>
        </article>
      </div>

      <div className={styles.grid2} style={{ marginTop: 12 }}>
        <article className={styles.card}>
          <h2>Répartition des plans</h2>
          <div className={styles.bars}>
            {metrics.plans.map((plan) => (
              <div key={plan.plan} className={styles.barRow}>
                <span>{PLAN_LABEL[plan.plan]}</span>
                <div className={styles.track}>
                  <div
                    className={styles.fill}
                    style={{ width: `${(plan.count / planMax) * 100}%` }}
                  />
                </div>
                <span>
                  {plan.count} ·{" "}
                  {metrics.total ? Math.round((plan.count / metrics.total) * 100) : 0} %
                </span>
              </div>
            ))}
          </div>
          <p className={styles.kpiHint}>
            Même périmètre que la liste Entreprises, filtre démo compris.
          </p>
        </article>
        <article className={styles.card}>
          <h2>Activité récente</h2>
          <div className={styles.queue}>
            {state.audit.slice(0, 5).map((event) => (
              <Link key={event.id} to="/backoffice/v2/audit">
                <span />
                <span>
                  {event.actor} {event.action}
                </span>
                <span>{event.tenantName}</span>
              </Link>
            ))}
          </div>
        </article>
      </div>
      {failed.some((payment) => payment.id === STORY_PAYMENT_ID) ? null : (
        <p className={styles.kpiHint}>
          Le paiement Wave de Garage Sow est confirmé. Le journal d'audit a l'événement.
        </p>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  values,
}: {
  label: string;
  value: string;
  hint: string;
  values?: number[];
}) {
  return (
    <article className={styles.kpi}>
      <div className={styles.kpiLabel}>
        {label}
        <button type="button" className={styles.help} title={hint} aria-label={hint}>
          <CircleHelp size={14} />
        </button>
      </div>
      <div className={styles.kpiValue}>{value}</div>
      {values ? <Sparkline values={values} /> : null}
    </article>
  );
}

function Bar({
  label,
  amount,
  max,
  tone,
}: {
  label: string;
  amount: number;
  max: number;
  tone?: "ok" | "warn" | "danger";
}) {
  const toneClass =
    tone === "ok"
      ? styles.fillOk
      : tone === "warn"
        ? styles.fillWarn
        : tone === "danger"
          ? styles.fillDanger
          : "";
  return (
    <div className={styles.barRow}>
      <span>{label}</span>
      <div className={styles.track}>
        <div
          className={`${styles.fill} ${toneClass}`}
          style={{ width: `${(amount / max) * 100}%` }}
        />
      </div>
      <span>{formatFcfa(amount)}</span>
    </div>
  );
}
