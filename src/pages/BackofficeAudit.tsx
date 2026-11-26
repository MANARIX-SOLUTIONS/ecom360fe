import { useState, useEffect, useCallback } from "react";
import { Card, Table, Select, Button, message, Tag, Input, Descriptions, DatePicker } from "antd";
import { RefreshCw, Download, FileText } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { listAdminAuditLogs, type AuditLogEntry } from "@/api/backoffice";
import { labelFromChanges, resolveAuditNames, type AuditNameIndex } from "@/backoffice/auditLabels";
import { PageHeader } from "@/components/backoffice/PageHeader";
import { FilterBar } from "@/components/backoffice/FilterBar";
import { CopyIdentifier } from "@/components/backoffice/CopyIdentifier";
import { DetailsDrawer } from "@/components/backoffice/DetailsDrawer";
import { ErrorState } from "@/components/backoffice/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { formatAuditAction } from "@/utils/auditAction";
import { buildAuditCsv } from "@/utils/auditExport";
import { downloadCsv } from "@/utils/adminCsv";
import { t } from "@/i18n";
import styles from "./Backoffice.module.css";
import dayjs from "dayjs";

const ENTITY_TYPES = [
  "Auth",
  "DemoRequest",
  "Business",
  "User",
  "FeatureFlag",
  "SubscriptionPaymentIntent",
  "Product",
  "Sale",
  "Client",
  "Supplier",
  "Store",
  "Expense",
];

export default function BackofficeAudit() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [size] = useState(25);
  const [loading, setLoading] = useState(false);
  const [entityFilter, setEntityFilter] = useState<string | undefined>(
    searchParams.get("entity") ?? undefined
  );
  const [businessFilter] = useState<string | undefined>(
    searchParams.get("businessId") ?? undefined
  );
  const [actionFilter, setActionFilter] = useState<string | undefined>(
    searchParams.get("action") ?? undefined
  );
  const [requestIdFilter, setRequestIdFilter] = useState(searchParams.get("requestId") ?? "");
  const [from, setFrom] = useState<string | undefined>(searchParams.get("from") ?? undefined);
  const [to, setTo] = useState<string | undefined>(searchParams.get("to") ?? undefined);
  const [detail, setDetail] = useState<AuditLogEntry | null>(null);
  const [names, setNames] = useState<AuditNameIndex>({ users: {}, businesses: {} });
  const [hasError, setHasError] = useState(false);

  const loadLogs = useCallback(
    async (isCancelled?: () => boolean) => {
      if (!isCancelled?.()) setLoading(true);
      setHasError(false);
      try {
        const res = await listAdminAuditLogs({
          page,
          size,
          entityType: entityFilter,
          businessId: businessFilter,
          action: actionFilter,
          requestId: requestIdFilter || undefined,
          from,
          to,
        });
        if (isCancelled?.()) return;
        const labels = await resolveAuditNames(res.content).catch(() => ({
          users: {},
          businesses: {},
        }));
        if (isCancelled?.()) return;
        setAuditLogs(res.content);
        setTotal(res.totalElements);
        setNames(labels);
      } catch (e) {
        if (isCancelled?.()) return;
        setHasError(true);
        message.error(e instanceof Error ? e.message : t.backoffice.auditLogLoadError);
      } finally {
        if (!isCancelled?.()) setLoading(false);
      }
    },
    [page, size, entityFilter, businessFilter, actionFilter, requestIdFilter, from, to]
  );

  useEffect(() => {
    let cancelled = false;
    void loadLogs(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [loadLogs]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (actionFilter) next.set("action", actionFilter);
    if (entityFilter) next.set("entity", entityFilter);
    if (requestIdFilter) next.set("requestId", requestIdFilter);
    if (from) next.set("from", from);
    if (to) next.set("to", to);
    if (businessFilter) next.set("businessId", businessFilter);
    setSearchParams(next, { replace: true });
  }, [actionFilter, entityFilter, requestIdFilter, from, to, businessFilter, setSearchParams]);

  const handleExport = useCallback(async () => {
    try {
      const res = await listAdminAuditLogs({
        page: 0,
        size: 1000,
        entityType: entityFilter,
        businessId: businessFilter,
        action: actionFilter,
        requestId: requestIdFilter || undefined,
        from,
        to,
      });
      downloadCsv(
        `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`,
        buildAuditCsv(res.content)
      );
      message.success(t.backoffice.auditExportSuccess);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.backoffice.auditExportError);
    }
  }, [entityFilter, businessFilter, actionFilter, requestIdFilter, from, to]);

  return (
    <div className={`${styles.page} pageWrapper`}>
      <PageHeader
        title="Journal d'audit"
        subtitle="Historique des actions sensibles. Les enregistrements ne sont pas éditables."
        extra={
          <>
            <Button
              icon={<RefreshCw size={16} />}
              onClick={() => void loadLogs()}
              loading={loading}
            >
              Actualiser
            </Button>
            <Button icon={<Download size={16} />} onClick={handleExport}>
              Export CSV
            </Button>
          </>
        }
      />
      <FilterBar>
        <Input
          allowClear
          placeholder="Action"
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value || undefined)}
          style={{ width: 160 }}
        />
        <Input
          allowClear
          placeholder="Request ID"
          value={requestIdFilter}
          onChange={(event) => setRequestIdFilter(event.target.value)}
          style={{ width: 200 }}
        />
        <Select
          placeholder="Type d'entité"
          allowClear
          style={{ minWidth: 140, maxWidth: "100%" }}
          value={entityFilter}
          onChange={setEntityFilter}
          options={ENTITY_TYPES.map((item) => ({ label: item, value: item }))}
        />
        <DatePicker.RangePicker
          value={from && to ? [dayjs(from), dayjs(to)] : null}
          onChange={(dates) => {
            setFrom(dates?.[0] ? dates[0].toISOString() : undefined);
            setTo(dates?.[1] ? dates[1].endOf("day").toISOString() : undefined);
            setPage(0);
          }}
        />
      </FilterBar>

      <Card variant="borderless" className={styles.card}>
        {hasError ? (
          <ErrorState
            compact
            title="Impossible de charger le journal"
            onRetry={() => void loadLogs()}
          />
        ) : (
          <div className="tableResponsive">
            <Table
              className="dataTable"
              size="small"
              loading={loading}
              dataSource={auditLogs}
              rowKey="id"
              scroll={{ x: "max-content" }}
              locale={{
                emptyText: (
                  <EmptyState
                    compact
                    icon={FileText}
                    title="Aucun événement correspondant aux filtres"
                  />
                ),
              }}
              onRow={(record) => ({
                onClick: () => setDetail(record),
                style: { cursor: "pointer" },
              })}
              pagination={{
                current: page + 1,
                pageSize: size,
                total,
                showSizeChanger: false,
                showTotal: (totalCount) => `${totalCount} entrée(s)`,
                onChange: (p) => setPage(p - 1),
              }}
              columns={[
                {
                  title: "Date",
                  dataIndex: "createdAt",
                  key: "createdAt",
                  width: 180,
                  render: (v: string) =>
                    v
                      ? new Date(v).toLocaleString("fr-FR", {
                          dateStyle: "short",
                          timeStyle: "medium",
                        })
                      : "—",
                },
                {
                  title: "Action",
                  dataIndex: "action",
                  key: "action",
                  width: 130,
                  render: (v: string) => (
                    <Tag color={v === "DELETE" ? "error" : v === "CREATE" ? "success" : "default"}>
                      {formatAuditAction(v)}
                    </Tag>
                  ),
                },
                {
                  title: "Type",
                  dataIndex: "entityType",
                  key: "entityType",
                  width: 100,
                },
                {
                  title: "Cible",
                  key: "entityId",
                  ellipsis: true,
                  render: (_value: unknown, row: AuditLogEntry) => {
                    const label =
                      labelFromChanges(row.changes) ??
                      (row.entityType === "Business" && row.entityId
                        ? names.businesses[row.entityId]
                        : null) ??
                      (row.entityType === "User" && row.entityId
                        ? names.users[row.entityId]
                        : null);
                    return (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span>{label ?? row.entityType}</span>
                        <CopyIdentifier value={row.entityId} preview={row.entityId?.slice(0, 8)} />
                      </span>
                    );
                  },
                },
                {
                  title: "Entreprise",
                  key: "businessId",
                  ellipsis: true,
                  render: (_value: unknown, row: AuditLogEntry) =>
                    row.businessId ? (
                      <Button
                        type="link"
                        style={{ padding: 0 }}
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/backoffice/businesses?highlight=${row.businessId}`);
                        }}
                      >
                        {names.businesses[row.businessId] ?? "Entreprise"}
                      </Button>
                    ) : (
                      "—"
                    ),
                },
                {
                  title: "Acteur",
                  key: "userId",
                  ellipsis: true,
                  render: (_value: unknown, row: AuditLogEntry) =>
                    row.userId ? (
                      <Button
                        type="link"
                        style={{ padding: 0 }}
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/backoffice/users?highlight=${row.userId}`);
                        }}
                      >
                        {names.users[row.userId] ?? "Compte"}
                      </Button>
                    ) : (
                      "Système"
                    ),
                },
                {
                  title: "IP",
                  dataIndex: "ipAddress",
                  key: "ipAddress",
                  width: 140,
                  render: (v: string | null) =>
                    v ? <CopyIdentifier value={v} preview={v} /> : "—",
                },
                {
                  title: "Request ID",
                  dataIndex: "requestId",
                  key: "requestId",
                  width: 160,
                  render: (v: string | null) => (
                    <CopyIdentifier value={v} preview={v ? v.slice(0, 8) : undefined} />
                  ),
                },
              ]}
            />
          </div>
        )}
      </Card>
      <DetailsDrawer
        title="Événement d'audit"
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
      >
        {detail ? (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Identifiant">
              <CopyIdentifier value={detail.id} />
            </Descriptions.Item>
            <Descriptions.Item label="Action">{formatAuditAction(detail.action)}</Descriptions.Item>
            <Descriptions.Item label="Entité">{detail.entityType}</Descriptions.Item>
            <Descriptions.Item label="Cible">
              {labelFromChanges(detail.changes) ?? detail.entityType}
              {detail.entityId ? (
                <div>
                  <CopyIdentifier value={detail.entityId} />
                </div>
              ) : null}
            </Descriptions.Item>
            <Descriptions.Item label="Entreprise">
              {detail.businessId ? (
                <Button
                  type="link"
                  style={{ padding: 0 }}
                  onClick={() => navigate(`/backoffice/businesses?highlight=${detail.businessId}`)}
                >
                  {names.businesses[detail.businessId] ?? "Entreprise"}
                </Button>
              ) : (
                "—"
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Acteur">
              {detail.userId ? (
                <Button
                  type="link"
                  style={{ padding: 0 }}
                  onClick={() => navigate(`/backoffice/users?highlight=${detail.userId}`)}
                >
                  {names.users[detail.userId] ?? "Compte"}
                </Button>
              ) : (
                "Système"
              )}
            </Descriptions.Item>
            <Descriptions.Item label="IP">{detail.ipAddress ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Request ID">{detail.requestId ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Date">
              {detail.createdAt ? new Date(detail.createdAt).toLocaleString("fr-FR") : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Métadonnées">
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
                {detail.changes ? JSON.stringify(detail.changes, null, 2) : "—"}
              </pre>
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </DetailsDrawer>
    </div>
  );
}
