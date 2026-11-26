import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { NAV, ROLE_LABEL, navAllowed, type RoleId } from "./model";
import { useConsole } from "./store";
import { Denied } from "./ui";
import styles from "./console.module.css";

const ROLES: RoleId[] = ["super_admin", "finance", "support", "sales", "lecture"];

export default function BackofficeV2Layout() {
  const consoleState = useConsole();
  const navigate = useNavigate();
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [roleOpen, setRoleOpen] = useState(false);
  const allowed = navAllowed(consoleState.role);
  const allowedPaths = allowed.flatMap((group) => group.items.map((item) => item.to));
  const currentAllowed =
    location.pathname === "/backoffice/v2" ||
    allowedPaths.some((path) => path !== "/backoffice/v2" && location.pathname.startsWith(path));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (event.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const commands = useMemo(() => {
    const pages = NAV.flatMap((group) => group.items).map((item) => ({
      label: item.label,
      to: item.to,
      hint: "Page",
    }));
    const tenants = consoleState.tenants.slice(0, 12).map((tenant) => ({
      label: tenant.name,
      to: `/backoffice/v2/entreprises/${tenant.id}`,
      hint: tenant.owner,
    }));
    const needle = query.trim().toLowerCase();
    return [...pages, ...tenants]
      .filter((item) => !needle || `${item.label} ${item.hint}`.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [consoleState.tenants, query]);

  const levelClass =
    consoleState.platform.level === "ok"
      ? styles.dotOk
      : consoleState.platform.level === "degraded"
        ? styles.dotWarn
        : styles.dotDanger;

  return (
    <div
      className={styles.root}
      data-theme={consoleState.theme}
      data-density={consoleState.density}
    >
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.mark}>360</div>
          <div>
            <div className={styles.brandName}>360 PME</div>
            <span className={styles.brandSub}>Backoffice</span>
          </div>
        </div>
        <div className={styles.env}>
          <span className={styles.envDot} />
          Environnement · Production
        </div>
        <button
          type="button"
          className={styles.statusBtn}
          onClick={() => navigate("/backoffice/v2/sante")}
        >
          <span className={`${styles.dot} ${levelClass}`} />
          <span>
            <strong>
              {consoleState.platform.level === "ok"
                ? "Plateforme opérationnelle"
                : "Plateforme dégradée"}
            </strong>
            <span>{consoleState.platform.label}</span>
          </span>
        </button>
        <nav className={styles.nav} aria-label="Backoffice">
          {allowed.map((group) => (
            <div key={group.id}>
              <div className={styles.groupLabel}>{group.label}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/backoffice/v2"}
                  className={({ isActive }) =>
                    `${styles.link} ${isActive ? styles.linkActive : ""}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <button type="button" className={styles.userBox} onClick={() => setRoleOpen(true)}>
          <span className={styles.avatar}>AD</span>
          <span className={styles.userMeta}>
            <strong>Awa Diop</strong>
            <span>{ROLE_LABEL[consoleState.role]}</span>
          </span>
        </button>
      </aside>
      <div className={styles.main}>
        <header className={styles.topbar}>
          <button type="button" className={styles.searchBtn} onClick={() => setPaletteOpen(true)}>
            Rechercher une entreprise, un paiement, une page
            <span className={styles.kbd}>⌘K</span>
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label={
              consoleState.theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"
            }
            onClick={() => consoleState.setTheme(consoleState.theme === "dark" ? "light" : "dark")}
          >
            {consoleState.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Changer la densité"
            onClick={() =>
              consoleState.setDensity(consoleState.density === "compact" ? "comfort" : "compact")
            }
          >
            {consoleState.density === "compact" ? "C" : "L"}
          </button>
        </header>
        {consoleState.assistance ? (
          <div className={styles.banner}>
            <span>
              Session d'assistance — Awa Diop ({ROLE_LABEL[consoleState.role]}) —{" "}
              {consoleState.assistance.minutes} min —{" "}
              {consoleState.assistance.readOnly ? "lecture seule" : "accès complet"}
            </span>
            <button type="button" className={styles.btn} onClick={consoleState.endAssistance}>
              Terminer
            </button>
          </div>
        ) : null}
        <div className={styles.content}>
          {currentAllowed ? <Outlet /> : <Denied moduleName="ce module" />}
        </div>
        <p className={styles.sampleNote}>
          Aperçu V2 · indicateurs calculés sur le jeu d'exemple. Les comptes démo sont exclus par
          défaut.
        </p>
      </div>
      {paletteOpen ? (
        <div className={styles.modalBack}>
          <button
            type="button"
            className={styles.scrim}
            aria-label="Fermer"
            onClick={() => setPaletteOpen(false)}
          />
          <div className={styles.palette}>
            <input
              autoFocus
              placeholder="Aller à…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Recherche globale"
            />
            {commands.map((command, index) => (
              <button
                key={command.to + command.label}
                type="button"
                data-active={index === 0}
                onClick={() => {
                  navigate(command.to);
                  setPaletteOpen(false);
                  setQuery("");
                }}
              >
                {command.label}
                <span className={styles.kpiHint}> {command.hint}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {roleOpen ? (
        <div className={styles.modalBack}>
          <button
            type="button"
            className={styles.scrim}
            aria-label="Fermer"
            onClick={() => setRoleOpen(false)}
          />
          <div className={styles.modal} role="dialog" aria-label="Rôle affiché">
            <h3>Voir l'interface en tant que</h3>
            <p className={styles.lede}>
              Le menu et les actions suivent le rôle. Lecture seule voit les modules, sans action.
            </p>
            <div className={styles.actions}>
              {ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  className={consoleState.role === role ? styles.btnPrimary : styles.btn}
                  onClick={() => {
                    consoleState.setRole(role);
                    setRoleOpen(false);
                  }}
                >
                  {ROLE_LABEL[role]}
                </button>
              ))}
            </div>
            <div className={styles.field}>
              État des données
              <select
                value={consoleState.dataState}
                onChange={(event) =>
                  consoleState.setDataState(event.target.value as "ready" | "loading" | "error")
                }
              >
                <option value="ready">Données chargées</option>
                <option value="loading">Chargement</option>
                <option value="error">Erreur</option>
              </select>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
