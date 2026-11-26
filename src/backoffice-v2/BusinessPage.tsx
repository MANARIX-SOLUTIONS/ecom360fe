import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  HEALTH_DEFINITION,
  PLAN_LABEL,
  PLAN_LIMITS,
  STATUS_LABEL,
  canDo,
  denyReason,
  formatDate,
  formatFcfa,
  healthScore,
  maskEmail,
  maskPhone,
  monthlyAmount,
  type Tenant,
} from "./model";
import { EnterpriseFeatures } from "./features";
import { useConsole } from "./store";
import { EmptyState, Modal, Pill } from "./ui";
import styles from "./console.module.css";

const TABS = [
  ["apercu", "Aperçu"],
  ["abonnement", "Abonnement & paiements"],
  ["boutiques", "Boutiques"],
  ["utilisateurs", "Utilisateurs"],
  ["activite", "Activité"],
  ["tickets", "Tickets"],
  ["notes", "Notes"],
  ["fonctionnalites", "Fonctionnalités"],
  ["journal", "Journal"],
] as const;

type Tab = (typeof TABS)[number][0];

export default function BusinessPage() {
  const { tenantId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const state = useConsole();
  const tenant = state.tenants.find((item) => item.id === tenantId);
  const tab = (params.get("tab") as Tab) || "apercu";
  const [reminderFor, setReminderFor] = useState<string | null>(null);
  const [confirmFor, setConfirmFor] = useState<string | null>(null);
  const [assistOpen, setAssistOpen] = useState(false);
  const [note, setNote] = useState("Paiement Wave confirmé par le marchand.");
  const [reason, setReason] = useState("Ticket T-204 · paiement refusé");
  const [minutes, setMinutes] = useState(30);
  const [readOnly, setReadOnly] = useState(true);

  if (!tenant) {
    return (
      <EmptyState
        title="Entreprise introuvable"
        body="Cet identifiant n'est pas dans l'échantillon."
      />
    );
  }

  const score = healthScore(tenant);
  const payments = state.payments.filter((payment) => payment.tenantId === tenant.id);
  const phoneKey = `${tenant.id}-phone`;
  const emailKey = `${tenant.id}-email`;

  return (
    <div>
      <div className={styles.headerTenant}>
        <div>
          <p className={styles.kpiHint}>
            <Link to="/backoffice/v2/entreprises">Entreprises</Link> / {tenant.city}
          </p>
          <h1 className={styles.pageTitle}>{tenant.name}</h1>
          <p className={styles.lede}>
            {tenant.owner} · {tenant.sector} · créé le {formatDate(tenant.createdAt)}
          </p>
          <div className={styles.actions} style={{ marginTop: 8 }}>
            <Pill
              tone={
                tenant.status === "actif" ? "ok" : tenant.status === "impaye" ? "danger" : "warn"
              }
            >
              {STATUS_LABEL[tenant.status]}
            </Pill>
            <Pill>{PLAN_LABEL[tenant.plan]}</Pill>
            <Pill>{score == null ? "Santé —" : `Santé ${score}`}</Pill>
            <span title={HEALTH_DEFINITION}>{formatFcfa(monthlyAmount(tenant))} MRR</span>
          </div>
          <p>
            {state.isRevealed(phoneKey) ? tenant.phone : maskPhone(tenant.phone)}{" "}
            <Reveal
              allowed={state.can("reveal")}
              role={state.role}
              onClick={() => state.reveal(phoneKey, "le téléphone", tenant)}
            />
            {" · "}
            {state.isRevealed(emailKey) ? tenant.email : maskEmail(tenant.email)}{" "}
            <Reveal
              allowed={state.can("reveal")}
              role={state.role}
              onClick={() => state.reveal(emailKey, "l'e-mail", tenant)}
            />
          </p>
        </div>
        <div className={styles.actions}>
          <ActionButton
            allowed={state.can("impersonate")}
            role={state.role}
            label="Ouvrir une session d'assistance"
            onClick={() => setAssistOpen(true)}
          />
          <ActionButton allowed={state.can("suspend")} role={state.role} label="Suspendre" danger />
        </div>
      </div>

      <div className={styles.tabs} role="tablist">
        {TABS.map(([item, label]) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            onClick={() => setParams({ tab: item })}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "apercu" ? <Overview tenant={tenant} /> : null}
      {tab === "abonnement" ? (
        <div className={styles.card}>
          <h2>
            {PLAN_LABEL[tenant.plan]} · {tenant.cycle} · renouvellement {formatDate(tenant.renewal)}
          </h2>
          {payments.length === 0 ? (
            <EmptyState
              title="Aucun paiement"
              body="Aucune tentative enregistrée pour cette entreprise."
            />
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className={styles.queue}>
                <div className={styles.barRow}>
                  <strong>{payment.channel}</strong>
                  <span>
                    {formatFcfa(payment.amount)} · {payment.ref} · {payment.invoice}
                  </span>
                  <Pill
                    tone={
                      payment.status === "reussi"
                        ? "ok"
                        : payment.status === "echoue"
                          ? "danger"
                          : "warn"
                    }
                  >
                    {payment.status === "reussi"
                      ? "Réussi"
                      : payment.status === "echoue"
                        ? "Échoué"
                        : payment.status}
                  </Pill>
                </div>
                {payment.status === "echoue" ? (
                  <div className={styles.actions}>
                    <ActionButton
                      allowed={state.can("remind")}
                      role={state.role}
                      label={
                        state.remindedIds.includes(payment.id)
                          ? "Rappel WhatsApp envoyé"
                          : "Envoyer un rappel WhatsApp"
                      }
                      onClick={() => setReminderFor(payment.id)}
                      disabled={state.remindedIds.includes(payment.id)}
                    />
                    <ActionButton
                      allowed={state.can("confirmPayment")}
                      role={state.role}
                      label="Enregistrer la confirmation PayDunya"
                      onClick={() => setConfirmFor(payment.id)}
                      primary
                      disabled={!state.remindedIds.includes(payment.id)}
                      title={
                        state.remindedIds.includes(payment.id)
                          ? undefined
                          : "Envoyez d'abord le rappel WhatsApp"
                      }
                    />
                  </div>
                ) : null}
                {payment.status === "reussi" && state.remindedIds.includes(payment.id) ? (
                  <p>
                    Abonnement réactivé.{" "}
                    <Link to="/backoffice/v2/audit">Voir l'événement dans le journal</Link>
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}
      {tab === "boutiques" ? (
        <div className={styles.card}>
          <h2>
            {tenant.stores} boutique{tenant.stores > 1 ? "s" : ""}
          </h2>
          <p>
            {tenant.name} · {tenant.city}
          </p>
        </div>
      ) : null}
      {tab === "utilisateurs" ? (
        <div className={styles.card}>
          <h2>{tenant.users} utilisateurs</h2>
          <p>
            {tenant.owner} · Propriétaire · dernière activité {formatDate(tenant.lastActivity)}
          </p>
        </div>
      ) : null}
      {tab === "activite" ? (
        <div className={styles.card}>
          <h2>Activité</h2>
          <p>Dernière vente : {formatDate(tenant.lastActivity)}</p>
          <p>GMV 30 jours : {formatFcfa(tenant.gmv30)} — volume marchand, pas le MRR.</p>
        </div>
      ) : null}
      {tab === "tickets" ? (
        <div className={styles.card}>
          <h2>Tickets</h2>
          {state.tickets.filter((ticket) => ticket.tenantId === tenant.id).length === 0 ? (
            <EmptyState
              title="Aucun ticket ouvert"
              body="Les conversations WhatsApp, e-mail et in-app liées à cette entreprise apparaîtront ici."
            />
          ) : (
            state.tickets
              .filter((ticket) => ticket.tenantId === tenant.id)
              .map((ticket) => (
                <p key={ticket.id}>
                  {ticket.id} · {ticket.title} · {ticket.channel} · {ticket.priority}
                </p>
              ))
          )}
        </div>
      ) : null}
      {tab === "notes" ? (
        <EmptyState
          title="Aucune note interne"
          body="Les notes d'équipe, avec @mentions, restent visibles uniquement dans le backoffice."
        />
      ) : null}
      {tab === "fonctionnalites" ? <EnterpriseFeatures tenant={tenant} /> : null}
      {tab === "journal" ? (
        <div className={styles.queue}>
          {state.audit
            .filter((event) => event.tenantId === tenant.id)
            .map((event) => (
              <p key={event.id}>
                {event.actor} {event.action}
              </p>
            ))}
        </div>
      ) : null}

      {reminderFor ? (
        <Modal title="Rappel WhatsApp" onClose={() => setReminderFor(null)}>
          <p>
            {tenant.owner}, votre paiement {PLAN_LABEL[tenant.plan]} de{" "}
            {formatFcfa(payments.find((item) => item.id === reminderFor)?.amount ?? 0)} via Wave
            n'est pas passé. Vous pouvez réessayer depuis l'application.
          </p>
          <div className={styles.modalActions}>
            <button type="button" className={styles.btn} onClick={() => setReminderFor(null)}>
              Annuler
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => {
                const payment = payments.find((item) => item.id === reminderFor);
                if (payment) state.sendReminder(payment, tenant);
                setReminderFor(null);
              }}
            >
              Envoyer
            </button>
          </div>
        </Modal>
      ) : null}

      {confirmFor ? (
        <Modal title="Confirmation PayDunya" onClose={() => setConfirmFor(null)}>
          <p>Le paiement est reçu. L'abonnement repasse actif. Un motif est obligatoire.</p>
          <label className={styles.field}>
            Motif
            <textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <div className={styles.modalActions}>
            <button type="button" className={styles.btn} onClick={() => setConfirmFor(null)}>
              Annuler
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={note.trim().length < 3}
              onClick={() => {
                const payment = payments.find((item) => item.id === confirmFor);
                if (payment) state.confirmPayment(payment, tenant, note.trim());
                setConfirmFor(null);
              }}
            >
              Réactiver l'abonnement
            </button>
          </div>
        </Modal>
      ) : null}

      {assistOpen ? (
        <Modal title="Session d'assistance" onClose={() => setAssistOpen(false)}>
          <label className={styles.field}>
            Motif
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          <label className={styles.field}>
            Durée
            <select value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
            </select>
          </label>
          <label className={styles.field}>
            <input
              type="checkbox"
              checked={readOnly}
              onChange={(event) => setReadOnly(event.target.checked)}
            />{" "}
            Lecture seule
          </label>
          <div className={styles.modalActions}>
            <button type="button" className={styles.btn} onClick={() => setAssistOpen(false)}>
              Annuler
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={reason.trim().length < 3}
              onClick={() => {
                state.startAssistance(tenant, reason.trim(), minutes, readOnly);
                setAssistOpen(false);
              }}
            >
              Ouvrir la session
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Overview({ tenant }: { tenant: Tenant }) {
  const limits = PLAN_LIMITS[tenant.plan];
  const meters = [
    ["Ventes / mois", tenant.salesMonth, limits.sales],
    ["Produits", tenant.products, limits.products],
    ["Utilisateurs", tenant.users, limits.users],
    ["Boutiques", tenant.stores, limits.stores],
  ] as const;
  return (
    <div className={styles.meters}>
      {meters.map(([label, value, max]) => (
        <article key={label} className={styles.card}>
          <h2>
            {label} · {value} / {max}
          </h2>
          <div className={styles.track}>
            <div
              className={styles.fill}
              style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

function Reveal({
  allowed,
  role,
  onClick,
}: {
  allowed: boolean;
  role: Parameters<typeof denyReason>[0];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.btn}
      disabled={!allowed}
      title={allowed ? "Cette révélation est journalisée" : denyReason(role)}
      onClick={onClick}
    >
      Révéler
    </button>
  );
}

function ActionButton({
  allowed,
  role,
  label,
  onClick,
  primary,
  danger,
  disabled,
  title,
}: {
  allowed: boolean;
  role: Parameters<typeof canDo>[0];
  label: string;
  onClick?: () => void;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      className={primary ? styles.btnPrimary : danger ? styles.btnDanger : styles.btn}
      disabled={!allowed || disabled}
      title={allowed ? title : denyReason(role)}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
