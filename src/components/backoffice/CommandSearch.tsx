import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Empty, Input, Modal, Typography } from "antd";
import { Search } from "lucide-react";
import { searchAdmin, type AdminSearchResponse } from "@/api/backoffice";
import { filterAdminSearchPages } from "@/utils/adminSearch";
import styles from "./backofficeUi.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

type SearchHit = {
  key: string;
  title: string;
  meta: string;
  href: string;
};

const EMPTY: AdminSearchResponse = {
  companies: [],
  users: [],
  invoices: [],
  payments: [],
  audit: [],
  stores: [],
};

export function CommandSearch({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AdminSearchResponse>(EMPTY);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(EMPTY);
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(EMPTY);
      return;
    }
    const handle = window.setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await searchAdmin(trimmed));
      } catch {
        setResults(EMPTY);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [open, query]);

  const groups = useMemo(() => {
    const pages = filterAdminSearchPages(query).map((page) => ({
      key: `page-${page.href}`,
      title: page.title,
      meta: page.meta,
      href: page.href,
    }));
    return [
      { title: "Pages", items: pages },
      {
        title: "Entreprises",
        items: results.companies.map((item) => ({
          key: `c-${item.id}`,
          title: item.name,
          meta: item.email,
          href: `/backoffice/businesses?highlight=${item.id}`,
        })),
      },
      {
        title: "Boutiques",
        items: (results.stores ?? []).map((item) => ({
          key: `s-${item.id}`,
          title: item.name,
          meta: item.businessName,
          href: `/backoffice/stores?highlight=${item.id}`,
        })),
      },
      {
        title: "Utilisateurs",
        items: results.users.map((item) => ({
          key: `u-${item.id}`,
          title: item.name,
          meta: item.email,
          href: `/backoffice/users?highlight=${item.id}`,
        })),
      },
      {
        title: "Factures",
        items: results.invoices.map((item) => ({
          key: `i-${item.id}`,
          title: item.number,
          meta: item.status,
          href: `/backoffice/invoices?search=${encodeURIComponent(item.number)}`,
        })),
      },
      {
        title: "Paiements",
        items: results.payments.map((item) => ({
          key: `p-${item.intentId}`,
          title: item.externalRef ?? item.intentId,
          meta: item.status,
          href: `/backoffice/payments?businessId=${item.businessId}&highlight=${item.intentId}`,
        })),
      },
      {
        title: "Audit",
        items: results.audit.map((item) => ({
          key: `a-${item.id}`,
          title: item.action,
          meta: item.requestId ?? item.id,
          href: `/backoffice/audit?requestId=${encodeURIComponent(item.requestId ?? item.id)}`,
        })),
      },
    ];
  }, [query, results]);

  const visibleGroups = groups.filter((group) => group.items.length > 0);
  const flatHits = visibleGroups.flatMap((group) => group.items);
  const hasResults = flatHits.length > 0;

  useEffect(() => {
    setActiveIndex(0);
  }, [query, results]);

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

  return (
    <Modal open={open} onCancel={onClose} footer={null} title="Recherche plateforme" destroyOnClose>
      <Input
        autoFocus
        allowClear
        prefix={<Search size={16} />}
        placeholder="Pages, entreprises, boutiques, factures…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            move(1);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            move(-1);
          } else if (event.key === "Enter") {
            const hit = flatHits[activeIndex] ?? flatHits[0];
            if (hit) go(hit.href);
          }
        }}
        aria-label="Recherche globale"
      />
      <div style={{ marginTop: 16, minHeight: 80 }}>
        {!hasResults && query.trim().length >= 2 && !loading ? (
          <Empty description="Aucun résultat correspondant" />
        ) : (
          visibleGroups.map((group) => (
            <SearchGroup
              key={group.title}
              title={group.title}
              items={group.items}
              activeKey={flatHits[activeIndex]?.key}
              onSelect={go}
            />
          ))
        )}
      </div>
    </Modal>
  );
}

function SearchGroup({
  title,
  items,
  activeKey,
  onSelect,
}: {
  title: string;
  items: SearchHit[];
  activeKey?: string;
  onSelect: (href: string) => void;
}) {
  return (
    <div className={styles.searchGroup}>
      <Typography.Text type="secondary">{title}</Typography.Text>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`${styles.searchHit} ${item.key === activeKey ? styles.searchHitActive : ""}`}
          onClick={() => onSelect(item.href)}
        >
          <span className={styles.searchHitTitle}>{item.title}</span>
          <span className={styles.searchHitMeta}>{item.meta}</span>
        </button>
      ))}
    </div>
  );
}
