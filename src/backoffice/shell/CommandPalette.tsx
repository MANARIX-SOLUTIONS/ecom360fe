import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Modal, type InputRef } from "antd";
import { Search } from "lucide-react";
import { searchAdmin, type AdminSearchResponse } from "@/api/backoffice";
import { QUICK_ACTIONS, visibleNav, type NavItem } from "../nav";
import { useBackofficeI18n } from "../useBackofficePreferences";
import { useCan } from "../rbac/useCan";
import styles from "./shell.module.css";

type Hit = { key: string; title: string; meta: string; href: string };

const EMPTY: AdminSearchResponse = {
  companies: [],
  users: [],
  invoices: [],
  payments: [],
  audit: [],
  stores: [],
};

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { t } = useBackofficeI18n();
  const can = useCan();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminSearchResponse>(EMPTY);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<InputRef>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(EMPTY);
      setFailed(false);
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(EMPTY);
      setFailed(false);
      return;
    }
    const handle = window.setTimeout(async () => {
      try {
        setResults(await searchAdmin(trimmed));
        setFailed(false);
      } catch {
        setResults(EMPTY);
        setFailed(true);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [open, query]);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const pages: Hit[] = visibleNav(can)
      .flatMap((group) => group.items)
      .filter((item) => !needle || t.nav.items[item.id].toLowerCase().includes(needle))
      .map((item: NavItem) => ({
        key: `page-${item.id}`,
        title: t.nav.items[item.id],
        meta: t.nav.groups[
          visibleNav(can).find((group) => group.items.some((entry) => entry.id === item.id))?.id ??
            "pilotage"
        ],
        href: item.href,
      }));
    const actions: Hit[] = QUICK_ACTIONS.filter((action) => can(action.permission))
      .filter((action) => !needle || t.command[action.id].toLowerCase().includes(needle))
      .map((action) => ({
        key: `action-${action.id}`,
        title: t.command[action.id],
        meta: t.command.actions,
        href: action.href,
      }));
    const remote: { title: string; items: Hit[] }[] =
      needle.length < 2
        ? []
        : [
            {
              title: t.command.companies,
              items: results.companies.map((item) => ({
                key: `c-${item.id}`,
                title: item.name,
                meta: item.email,
                href: `/backoffice/businesses?highlight=${item.id}`,
              })),
            },
            {
              title: t.command.users,
              items: results.users.map((item) => ({
                key: `u-${item.id}`,
                title: item.name,
                meta: item.email,
                href: `/backoffice/users?highlight=${item.id}`,
              })),
            },
            {
              title: t.command.payments,
              items: results.payments.map((item) => ({
                key: `p-${item.intentId}`,
                title: item.externalRef || item.intentId,
                meta: item.status,
                href: `/backoffice/payments?businessId=${item.businessId}&highlight=${item.intentId}`,
              })),
            },
            {
              title: t.command.invoices,
              items: results.invoices.map((item) => ({
                key: `i-${item.id}`,
                title: item.number,
                meta: item.status,
                href: `/backoffice/invoices?search=${encodeURIComponent(item.number)}`,
              })),
            },
            {
              title: t.command.stores,
              items: (results.stores ?? []).map((item) => ({
                key: `s-${item.id}`,
                title: item.name,
                meta: item.businessName,
                href: `/backoffice/stores?highlight=${item.id}`,
              })),
            },
          ];
    return [
      { title: t.command.pages, items: pages },
      { title: t.command.actions, items: actions },
      ...remote,
    ].filter((group) => group.items.length > 0);
  }, [can, query, results, t]);

  const flat = groups.flatMap((group) => group.items);

  useEffect(() => setActive(0), [query, results]);

  const go = (href: string) => {
    navigate(href);
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={t.command.title}
      destroyOnHidden
      width={640}
    >
      <Input
        ref={inputRef}
        allowClear
        prefix={<Search size={16} strokeWidth={1.75} aria-hidden />}
        placeholder={t.command.placeholder}
        aria-label={t.shell.searchLabel}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((current) => (flat.length === 0 ? 0 : (current + 1) % flat.length));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((current) =>
              flat.length === 0 ? 0 : (current - 1 + flat.length) % flat.length
            );
          } else if (event.key === "Enter" && flat[active]) {
            go(flat[active].href);
          }
        }}
      />
      <div className={styles.paletteList}>
        {failed ? <p>{t.command.error}</p> : null}
        {!failed && flat.length === 0 ? <p>{t.command.empty}</p> : null}
        {groups.map((group) => (
          <div key={group.title} className={styles.paletteGroup}>
            <h3>{group.title}</h3>
            {group.items.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`${styles.hit} ${flat[active]?.key === item.key ? styles.hitActive : ""}`}
                onClick={() => go(item.href)}
              >
                <span>{item.title}</span>
                <span className={styles.hitMeta}>{item.meta}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  );
}
