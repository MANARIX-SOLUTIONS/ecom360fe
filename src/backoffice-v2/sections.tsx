import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { formatFcfa, PLAN_LABEL, STATUS_LABEL, monthlyAmount } from "./model";
import { useConsole } from "./store";
import { EmptyState, Pill } from "./ui";
import styles from "./console.module.css";

export function PaymentsPage() {
  const { payments, tenants } = useConsole();
  return (
    <Section
      title="Paiements & factures"
      lede="Chaque activation payante a une ligne. Les écarts PayDunya restent visibles."
    >
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Entreprise</th>
              <th>Plan</th>
              <th>Montant</th>
              <th>Canal</th>
              <th>Statut</th>
              <th>Référence</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => {
              const tenant = tenants.find((item) => item.id === payment.tenantId);
              return (
                <tr key={payment.id}>
                  <td>{new Date(payment.at).toLocaleString("fr-FR")}</td>
                  <td>
                    {tenant ? (
                      <Link to={`/backoffice/v2/entreprises/${tenant.id}?tab=abonnement`}>
                        {tenant.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{PLAN_LABEL[payment.plan]}</td>
                  <td>{formatFcfa(payment.amount)}</td>
                  <td>{payment.channel}</td>
                  <td>
                    <Pill tone={payment.status === "reussi" ? "ok" : "danger"}>
                      {payment.status}
                    </Pill>
                  </td>
                  <td>{payment.ref}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

export function HealthPage() {
  const { services } = useConsole();
  return (
    <Section title="Santé de la plateforme" lede="Un seul statut, repris dans la barre latérale.">
      <div className={styles.meters}>
        {services.map((service) => (
          <article key={service.name} className={styles.card}>
            <h2>{service.name}</h2>
            <Pill
              tone={
                service.status === "ok" ? "ok" : service.status === "degraded" ? "warn" : "danger"
              }
            >
              {service.status === "ok"
                ? "Opérationnel"
                : service.status === "degraded"
                  ? "Dégradé"
                  : "Indisponible"}
            </Pill>
            <p>{service.detail}</p>
          </article>
        ))}
        <article className={styles.card}>
          <h2>Ressources</h2>
          <EmptyState
            title="Non connecté"
            body="CPU, mémoire et bande passante ne s'affichent pas tant que le monitoring n'est pas branché."
          />
        </article>
      </div>
    </Section>
  );
}

export function LeadsPage() {
  const { leads } = useConsole();
  const columns = [
    ["nouvelle", "Nouvelle"],
    ["contactee", "Contactée"],
    ["demo", "Démo planifiée"],
    ["essai", "Essai"],
  ] as const;
  return (
    <Section
      title="Demandes de démo & leads"
      lede="Les demandes arrivent du formulaire de la landing et de WhatsApp."
    >
      <div className={styles.kanban}>
        {columns.map(([stage, label]) => (
          <div key={stage} className={styles.kanbanCol}>
            <strong>{label}</strong>
            {leads
              .filter((lead) => lead.stage === stage)
              .map((lead) => (
                <article key={lead.id} className={styles.lead}>
                  <strong>{lead.business}</strong>
                  <p>
                    {lead.sector} · {lead.mode} · {lead.city}
                  </p>
                  <p>{lead.source}</p>
                </article>
              ))}
          </div>
        ))}
      </div>
    </Section>
  );
}

export function SubscriptionsPage() {
  const { tenants } = useConsole();
  return (
    <Section
      title="Abonnements"
      lede="Le MRR de la ligne est le même montant que dans la vue d'ensemble."
    >
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Entreprise</th>
              <th>Plan</th>
              <th>Cycle</th>
              <th>Prochaine échéance</th>
              <th>MRR</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id}>
                <td>{tenant.name}</td>
                <td>{PLAN_LABEL[tenant.plan]}</td>
                <td>{tenant.cycle}</td>
                <td>{new Date(tenant.renewal).toLocaleDateString("fr-FR")}</td>
                <td>{formatFcfa(monthlyAmount(tenant))}</td>
                <td>{STATUS_LABEL[tenant.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

export function SimplePage({ title, lede, body }: { title: string; lede: string; body: string }) {
  return (
    <Section title={title} lede={lede}>
      <EmptyState title={title} body={body} />
    </Section>
  );
}

function Section({ title, lede, children }: { title: string; lede: string; children: ReactNode }) {
  return (
    <div>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>{title}</h1>
          <p className={styles.lede}>{lede}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
