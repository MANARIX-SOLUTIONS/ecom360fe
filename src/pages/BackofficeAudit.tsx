import { useState, useEffect, useCallback } from "react";
import { Card, Typography, Table, Select, Space, Button, message, Tag } from "antd";
import { RefreshCw, Download } from "lucide-react";
import { listAdminAuditLogs, type AuditLogEntry } from "@/api/backoffice";
import styles from "./Backoffice.module.css";

const ENTITY_TYPES = ["Auth", "Product", "Sale", "Client", "Supplier", "Store", "Expense"];

function formatAuditAction(action: string): string {
  const labels: Record<string, string> = {
    LOGIN: "Connexion",
    REGISTER: "Inscription",
    PASSWORD_CHANGE: "Changement mot de passe",
    CREATE: "Création",
    UPDATE: "Modification",
    DELETE: "Suppression",
  };
  return labels[action] ?? action;
}

export default function BackofficeAudit() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [size] = useState(25);
  const [loading, setLoading] = useState(false);
  const [entityFilter, setEntityFilter] = useState<string | undefined>();
  const [businessFilter] = useState<string | undefined>();

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAdminAuditLogs({
        page,
        size,
        entityType: entityFilter,
        businessId: businessFilter,
      });
      setAuditLogs(res.content);
      setTotal(res.totalElements);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur chargement journal d'audit");
    } finally {
      setLoading(false);
    }
  }, [page, size, entityFilter, businessFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleExport = useCallback(async () => {
    try {
      const res = await listAdminAuditLogs({
        page: 0,
        size: 1000,
        entityType: entityFilter,
        businessId: businessFilter,
      });
      const lines = res.content.map(
        (l) =>
          `${l.createdAt}\t${l.action}\t${l.entityType}\t${l.entityId ?? ""}\t${l.businessId ?? ""}\t${l.userId ?? ""}\t${l.ipAddress ?? ""}\t${l.requestId ?? ""}`
      );
      const content = [
        "Date\tAction\tType\tEntityId\tBusinessId\tUserId\tIP\tRequestId",
        ...lines,
      ].join("\n");
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      message.success("Journal d'audit exporté");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur export");
    }
  }, [entityFilter, businessFilter]);

  return (
    <div className={`${styles.page} pageWrapper`}>
      <div className={styles.pageHeader}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <Typography.Title level={4} className={styles.pageTitle}>
              Journal d'audit
            </Typography.Title>
            <Typography.Text type="secondary" className={styles.pageSubtitle}>
              Historique des actions sur la plateforme
            </Typography.Text>
          </div>
          <Space>
            <Select
              placeholder="Type d'entité"
              allowClear
              style={{ width: 140 }}
              value={entityFilter}
              onChange={setEntityFilter}
              options={ENTITY_TYPES.map((t) => ({ label: t, value: t }))}
            />
            <Button icon={<RefreshCw size={16} />} onClick={loadLogs} loading={loading}>
              Actualiser
            </Button>
            <Button icon={<Download size={16} />} onClick={handleExport}>
              Export CSV
            </Button>
          </Space>
        </div>
      </div>

      <Card variant="borderless" className={styles.card}>
        <Table
          size="small"
          loading={loading}
          dataSource={auditLogs}
          rowKey="id"
          pagination={{
            current: page + 1,
            pageSize: size,
            total,
            showSizeChanger: false,
            showTotal: (t) => `${t} entrée(s)`,
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
              title: "Entité",
              dataIndex: "entityId",
              key: "entityId",
              ellipsis: true,
              render: (v: string | null) =>
                v ? (
                  <Typography.Text copyable style={{ fontFamily: "monospace", fontSize: 11 }}>
                    {v.slice(0, 8)}…
                  </Typography.Text>
                ) : (
                  "—"
                ),
            },
            {
              title: "Business",
              dataIndex: "businessId",
              key: "businessId",
              ellipsis: true,
              render: (v: string | null) =>
                v ? (
                  <Typography.Text copyable style={{ fontFamily: "monospace", fontSize: 11 }}>
                    {v.slice(0, 8)}…
                  </Typography.Text>
                ) : (
                  "—"
                ),
            },
            {
              title: "User",
              dataIndex: "userId",
              key: "userId",
              ellipsis: true,
              render: (v: string | null) =>
                v ? (
                  <Typography.Text copyable style={{ fontFamily: "monospace", fontSize: 11 }}>
                    {v.slice(0, 8)}…
                  </Typography.Text>
                ) : (
                  "—"
                ),
            },
            {
              title: "IP",
              dataIndex: "ipAddress",
              key: "ipAddress",
              width: 110,
              render: (v: string | null) => v ?? "—",
            },
            {
              title: "Request ID",
              dataIndex: "requestId",
              key: "requestId",
              width: 100,
              render: (v: string | null) =>
                v ? (
                  <Typography.Text copyable style={{ fontFamily: "monospace", fontSize: 10 }}>
                    {v}
                  </Typography.Text>
                ) : (
                  "—"
                ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
