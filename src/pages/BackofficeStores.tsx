import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, Input, Select, Table } from "antd";
import { Store } from "lucide-react";
import { listAdminStores, type AdminStoreListItem } from "@/api/backoffice";
import { PageHeader } from "@/components/backoffice/PageHeader";
import { FilterBar } from "@/components/backoffice/FilterBar";
import { StatusTag } from "@/components/backoffice/StatusTag";
import { ErrorState } from "@/components/backoffice/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { formatAdminDate } from "@/utils/adminPeriod";
import styles from "./Backoffice.module.css";

export default function BackofficeStores() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [rows, setRows] = useState<AdminStoreListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [searchDebounced, setSearchDebounced] = useState(search);
  const activeParam = searchParams.get("active");
  const [active, setActive] = useState<boolean | undefined>(
    activeParam === "true" ? true : activeParam === "false" ? false : undefined
  );

  useEffect(() => {
    const id = window.setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (searchDebounced) next.set("search", searchDebounced);
    if (active != null) next.set("active", String(active));
    setSearchParams(next, { replace: true });
  }, [searchDebounced, active, setSearchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setHasError(false);
    try {
      const res = await listAdminStores({
        page,
        size: pageSize,
        search: searchDebounced || undefined,
        active,
      });
      setRows(res.content ?? []);
      setTotal(res.totalElements ?? 0);
    } catch {
      setHasError(true);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchDebounced, active]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className={`${styles.page} pageWrapper`}>
      <PageHeader title="Boutiques" subtitle="Tous les points de vente de la plateforme." />
      <Card variant="borderless" className={styles.card}>
        <FilterBar
          extra={
            <Button onClick={() => void load()} loading={loading}>
              Actualiser
            </Button>
          }
        >
          <Input.Search
            allowClear
            placeholder="Nom de boutique"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            style={{ width: 240 }}
          />
          <Select
            allowClear
            placeholder="Statut"
            style={{ width: 160 }}
            value={active}
            onChange={(value) => {
              setActive(value);
              setPage(0);
            }}
            options={[
              { value: true, label: "Actives" },
              { value: false, label: "Inactives" },
            ]}
          />
        </FilterBar>
        {hasError ? (
          <ErrorState
            compact
            title="Impossible de charger les boutiques"
            onRetry={() => void load()}
          />
        ) : (
          <Table
            rowKey="id"
            loading={loading}
            dataSource={rows}
            scroll={{ x: 800 }}
            rowClassName={(row) =>
              row.id === searchParams.get("highlight") ? styles.highlightRow : ""
            }
            locale={{
              emptyText: <EmptyState compact icon={Store} title="Aucune boutique trouvée" />,
            }}
            columns={[
              { title: "Boutique", dataIndex: "name" },
              {
                title: "Entreprise",
                dataIndex: "businessName",
                render: (name: string, row) => (
                  <Button
                    type="link"
                    onClick={() => navigate(`/backoffice/businesses?highlight=${row.businessId}`)}
                  >
                    {name}
                  </Button>
                ),
              },
              {
                title: "Adresse",
                dataIndex: "address",
                render: (value: string | null) => value || "—",
              },
              {
                title: "Téléphone",
                dataIndex: "phone",
                render: (value: string | null) => value || "—",
              },
              {
                title: "Statut",
                dataIndex: "active",
                render: (value: boolean) => <StatusTag status={value ? "active" : "inactive"} />,
              },
              { title: "Créée", dataIndex: "createdAt", render: formatAdminDate },
            ]}
            pagination={{
              current: page + 1,
              pageSize,
              total,
              showSizeChanger: true,
              onChange: (next, size) => {
                setPage(next - 1);
                setPageSize(size);
              },
            }}
          />
        )}
      </Card>
    </div>
  );
}
