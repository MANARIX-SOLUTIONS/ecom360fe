import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Modal } from "antd";
import type { InputRef } from "antd";
import type { LucideIcon } from "lucide-react";
import { Package, Search, Users } from "lucide-react";
import { listClients, listProducts } from "@/api";
import { usePermissions } from "@/hooks/usePermissions";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { NAV_SECTIONS, navItemHref } from "@/constants/navigation";
import { formatFCFA } from "@/utils/money";
import { isServiceUnit } from "@/utils/serviceUnit";
import { t } from "@/i18n";
import styles from "./shell.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

type Hit = {
  key: string;
  title: string;
  meta: string;
  href: string;
  icon: LucideIcon;
};

const searchShortcut =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘K" : "Ctrl K";

export function GlobalSearch({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { canAccess: canAccessBackend } = usePermissions();
  const { canAccess: canAccessPlan } = usePlanFeatures();
  const inputRef = useRef<InputRef>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Hit[]>([]);
  const [clients, setClients] = useState<Hit[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setProducts([]);
      setClients([]);
      setActiveIndex(0);
      return;
    }
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const pages = useMemo(() => {
    const q = query.trim().toLowerCase();
    return NAV_SECTIONS.flatMap((section) =>
      section.items
        .filter((item) => {
          const backendCan = canAccessBackend(item.permission);
          return backendCan && canAccessPlan(item.permission, backendCan);
        })
        .filter((item) => !q || item.label.toLowerCase().includes(q))
        .map((item) => ({
          key: navItemHref(item),
          title: item.label,
          meta: section.label,
          href: navItemHref(item),
          icon: item.icon,
        }))
    );
  }, [canAccessBackend, canAccessPlan, query]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setProducts([]);
      setClients([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      setLoading(true);
      try {
        const canProducts = canAccessBackend("products");
        const canClients = canAccessBackend("clients");
        const [productPage, clientPage] = await Promise.all([
          canProducts ? listProducts({ search: trimmed, size: 5, page: 0 }) : null,
          canClients ? listClients({ search: trimmed, size: 5, page: 0 }) : null,
        ]);
        if (cancelled) return;
        setProducts(
          (productPage?.content ?? []).map((p) => ({
            key: `p-${p.id}`,
            title: p.name,
            meta: isServiceUnit(p.unit)
              ? `${t.pos.serviceBadge} · ${formatFCFA(p.salePrice)}`
              : p.sku
                ? `SKU ${p.sku}`
                : formatFCFA(p.salePrice),
            href: `/products/${p.id}`,
            icon: Package,
          }))
        );
        setClients(
          (clientPage?.content ?? []).map((c) => ({
            key: `c-${c.id}`,
            title: c.name,
            meta: c.phone || c.email || "Client",
            href: `/clients/${c.id}`,
            icon: Users,
          }))
        );
      } catch {
        if (!cancelled) {
          setProducts([]);
          setClients([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [open, query, canAccessBackend]);

  const groups = useMemo(
    () => [
      { title: "Pages", items: pages },
      { title: "Catalogue", items: products },
      { title: "Clients", items: clients },
    ],
    [pages, products, clients]
  );
  const visibleGroups = groups.filter((group) => group.items.length > 0);
  const flatHits = visibleGroups.flatMap((group) => group.items);
  const trimmed = query.trim();
  const hasResults = flatHits.length > 0;

  useEffect(() => {
    setActiveIndex(0);
  }, [query, products, clients]);

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLButtonElement>("[data-active='true']");
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, flatHits.length]);

  const go = (href: string) => {
    navigate(href);
    onClose();
  };

  const move = (delta: number) => {
    if (flatHits.length === 0) return;
    setActiveIndex((current) => {
      const next = current + delta;
      if (next < 0) return flatHits.length - 1;
      if (next >= flatHits.length) return 0;
      return next;
    });
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter") {
      const hit = flatHits[activeIndex] ?? flatHits[0];
      if (!hit) return;
      event.preventDefault();
      go(hit.href);
    }
  };

  let cursor = 0;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={null}
      closable={false}
      destroyOnClose
      width={560}
      style={{ top: 72 }}
      className={styles.searchModal}
    >
      <div>
        <Input
          ref={inputRef}
          allowClear
          size="large"
          prefix={<Search size={16} />}
          placeholder="Pages, produits, clients…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Recherche globale"
          aria-autocomplete="list"
          aria-controls="global-search-results"
        />
        <div
          id="global-search-results"
          ref={listRef}
          className={styles.searchResults}
          role="listbox"
        >
          {trimmed.length === 1 ? (
            <p className={styles.searchHint}>
              Une lettre de plus pour le catalogue et les clients.
            </p>
          ) : null}
          {loading ? <p className={styles.searchHint}>Recherche…</p> : null}
          {!hasResults && !loading && trimmed.length !== 1 ? (
            <p className={styles.searchEmpty}>
              {trimmed ? "Aucun résultat" : "Parcourez les pages ou tapez un nom."}
            </p>
          ) : null}
          {hasResults
            ? visibleGroups.map((group) => {
                const start = cursor;
                cursor += group.items.length;
                return (
                  <div key={group.title} className={styles.searchGroup}>
                    <span className={styles.searchGroupLabel}>{group.title}</span>
                    {group.items.map((item, index) => {
                      const active = start + index === activeIndex;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          role="option"
                          aria-selected={active}
                          data-active={active ? "true" : "false"}
                          className={`${styles.searchHit} ${active ? styles.searchHitActive : ""}`}
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setActiveIndex(start + index)}
                          onClick={() => go(item.href)}
                        >
                          <span className={styles.searchHitMain}>
                            <Icon size={16} aria-hidden />
                            <span className={styles.searchHitTitle}>{item.title}</span>
                          </span>
                          <span className={styles.searchHitMeta}>{item.meta}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })
            : null}
        </div>
        <div className={styles.searchFooter}>
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> naviguer
          </span>
          <span>
            <kbd>↵</kbd> ouvrir
          </span>
          <span>
            <kbd>esc</kbd> fermer
          </span>
        </div>
      </div>
    </Modal>
  );
}

type TriggerProps = {
  onOpen: () => void;
};

export function GlobalSearchTrigger({ onOpen }: TriggerProps) {
  return (
    <button type="button" className={styles.searchTrigger} onClick={onOpen} aria-label="Recherche">
      <Search size={16} aria-hidden />
      <span className={styles.searchLabel}>Rechercher…</span>
      <kbd className={styles.searchKbd}>{searchShortcut}</kbd>
    </button>
  );
}
