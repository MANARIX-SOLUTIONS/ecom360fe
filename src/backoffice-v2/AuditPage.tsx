import { useMemo, useState } from "react";
import { formatDateTime, type AuditEvent } from "./model";
import { useConsole } from "./store";
import { EmptyState, Pill } from "./ui";
import styles from "./console.module.css";

export default function AuditPage() {
  const { audit } = useConsole();
  const [severity, setSeverity] = useState("tous");
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const rows = useMemo(
    () => audit.filter((event) => severity === "tous" || event.severity === severity),
    [audit, severity]
  );

  return (
    <div>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Journal d'audit</h1>
          <p className={styles.lede}>
            Actions sensibles, lisibles. L'identifiant technique est dans le détail.
          </p>
        </div>
        <select
          value={severity}
          onChange={(event) => setSeverity(event.target.value)}
          aria-label="Gravité"
        >
          <option value="tous">Toutes les gravités</option>
          <option value="info">Info</option>
          <option value="attention">Attention</option>
          <option value="critique">Critique</option>
        </select>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Aucune entrée" body="Aucune action ne correspond à ce filtre." />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Acteur</th>
                <th>Action</th>
                <th>Entreprise</th>
                <th>Origine</th>
                <th>Gravité</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((event) => (
                <tr key={event.id} onClick={() => setSelected(event)}>
                  <td>{formatDateTime(event.at)}</td>
                  <td>
                    {event.actor}
                    <div className={styles.kpiHint}>{event.actorType}</div>
                  </td>
                  <td>{event.action}</td>
                  <td>{event.tenantName}</td>
                  <td>
                    {event.ip}
                    <div className={styles.kpiHint}>{event.country}</div>
                  </td>
                  <td>
                    <Pill
                      tone={
                        event.severity === "critique"
                          ? "danger"
                          : event.severity === "attention"
                            ? "warn"
                            : "info"
                      }
                    >
                      {event.severity}
                    </Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected ? (
        <div className={styles.drawerBack}>
          <button
            type="button"
            className={styles.scrim}
            aria-label="Fermer"
            onClick={() => setSelected(null)}
          />
          <aside className={styles.drawer}>
            <h2>{selected.actor}</h2>
            <p>{selected.action}</p>
            <div className={styles.diff}>
              <div>
                <strong>Avant</strong>
                <p>{selected.before ?? "—"}</p>
              </div>
              <div>
                <strong>Après</strong>
                <p>{selected.after ?? "—"}</p>
              </div>
            </div>
            <p>Cible : {selected.target}</p>
            <p>
              IP : {selected.ip} · {selected.country}
            </p>
            <p>User agent : {selected.userAgent}</p>
            <p>Request ID : {selected.requestId}</p>
            <button type="button" className={styles.btn} onClick={() => setSelected(null)}>
              Fermer
            </button>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
