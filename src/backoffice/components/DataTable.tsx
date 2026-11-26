import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Checkbox, Dropdown, Input, Table } from "antd";
import type { TableProps } from "antd";
import { Columns3, Download, Rows3 } from "lucide-react";
import { useBackofficeI18n, useBackofficePreferences } from "../useBackofficePreferences";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { SkeletonRows } from "./Skeleton";
import {
  exportCsvFile,
  exportXlsxFile,
  readHiddenColumns,
  readSavedViews,
  writeHiddenColumns,
  writeSavedViews,
  type SavedView,
} from "./tableState";
import styles from "./ui.module.css";

export type DataColumn<T> = {
  key: string;
  title: string;
  width?: number;
  align?: "left" | "right";
  sortable?: boolean;
  defaultHidden?: boolean;
  render: (row: T) => ReactNode;
  exportValue?: (row: T) => string | number | null | undefined;
  sortValue?: (row: T) => string | number;
};

export type BulkAction = {
  key: string;
  label: string;
  danger?: boolean;
  onClick: (keys: string[]) => void;
};

type Props<T> = {
  tableId: string;
  rows: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number, pageSize: number) => void;
  onRowClick?: (row: T) => void;
  bulkActions?: BulkAction[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  urlKey?: string;
};

export function DataTable<T>({
  tableId,
  rows,
  columns,
  rowKey,
  loading = false,
  error,
  onRetry,
  total,
  page = 1,
  pageSize = 20,
  onPageChange,
  onRowClick,
  bulkActions,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  urlKey,
}: Props<T>) {
  const { t } = useBackofficeI18n();
  const { density, setDensity } = useBackofficePreferences();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = urlKey ? Number(searchParams.get(`${urlKey}_page`) || page) : page;
  const currentSize = urlKey ? Number(searchParams.get(`${urlKey}_size`) || pageSize) : pageSize;
  const [hidden, setHidden] = useState<string[]>(() => {
    const stored = readHiddenColumns(tableId);
    if (stored.length > 0) return stored;
    return columns.filter((column) => column.defaultHidden).map((column) => column.key);
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [views, setViews] = useState<SavedView[]>(() => readSavedViews(tableId));
  const [viewName, setViewName] = useState("");
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const apply = () => setNarrow(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const visible = columns.filter((column) => !hidden.includes(column.key));

  const tableColumns: TableProps<T>["columns"] = visible.map((column) => ({
    key: column.key,
    dataIndex: column.key,
    title: column.title,
    width: column.width,
    align: column.align,
    sorter: column.sortable
      ? (left: T, right: T) => {
          const a = column.sortValue?.(left);
          const b = column.sortValue?.(right);
          if (typeof a === "number" && typeof b === "number") return a - b;
          return String(a ?? "").localeCompare(String(b ?? ""));
        }
      : undefined,
    render: (_value: unknown, row: T) => column.render(row),
    onHeaderCell: () => ({ scope: "col" as const }),
  }));

  const exportRows = () =>
    rows.map((row) =>
      visible.map((column) => ({
        title: column.title,
        value: column.exportValue ? column.exportValue(row) : "",
      }))
    );

  const toggleColumn = (key: string, checked: boolean) => {
    const next = checked ? hidden.filter((item) => item !== key) : [...hidden, key];
    setHidden(next);
    writeHiddenColumns(tableId, next);
  };

  const saveView = () => {
    const name = viewName.trim();
    if (!name) return;
    const next = [...views, { id: crypto.randomUUID(), name, search: searchParams.toString() }];
    setViews(next);
    writeSavedViews(tableId, next);
    setViewName("");
  };

  const removeView = (id: string) => {
    const next = views.filter((view) => view.id !== id);
    setViews(next);
    writeSavedViews(tableId, next);
  };

  const selectedRows = useMemo(() => new Set(selected), [selected]);

  const changePage = (nextPage: number, nextSize: number) => {
    onPageChange?.(nextPage, nextSize);
    if (!urlKey) return;
    const next = new URLSearchParams(searchParams);
    next.set(`${urlKey}_page`, String(nextPage));
    next.set(`${urlKey}_size`, String(nextSize));
    setSearchParams(next, { replace: true });
  };

  if (error) return <ErrorState description={error} onRetry={onRetry} />;
  if (loading && rows.length === 0) return <SkeletonRows />;
  if (!loading && rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle ?? t.table.empty}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <div>
      <div className={styles.filterBar}>
        <Dropdown
          trigger={["click"]}
          menu={{
            items: columns.map((column) => ({
              key: column.key,
              label: (
                <Checkbox
                  checked={!hidden.includes(column.key)}
                  onChange={(event) => toggleColumn(column.key, event.target.checked)}
                >
                  {column.title}
                </Checkbox>
              ),
            })),
          }}
        >
          <Button icon={<Columns3 size={14} strokeWidth={1.75} aria-hidden />}>
            {t.table.columns}
          </Button>
        </Dropdown>
        <Button
          icon={<Rows3 size={14} strokeWidth={1.75} aria-hidden />}
          onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")}
        >
          {t.table.density}
        </Button>
        <Button
          icon={<Download size={14} strokeWidth={1.75} aria-hidden />}
          onClick={() =>
            exportCsvFile(
              `${tableId}.csv`,
              visible.map((column) => column.title),
              exportRows()
            )
          }
        >
          {t.table.exportCsv}
        </Button>
        <Button
          onClick={() =>
            void exportXlsxFile(
              `${tableId}.xlsx`,
              visible.map((column) => column.title),
              exportRows().map((row) => row.map((cell) => cell.value))
            )
          }
        >
          {t.table.exportXlsx}
        </Button>
        <Dropdown
          trigger={["click"]}
          popupRender={() => (
            <div
              style={{ padding: 12, width: 240, background: "var(--surface)", borderRadius: 12 }}
            >
              <div style={{ marginBottom: 8, color: "var(--text-muted)", fontSize: 12 }}>
                {t.table.views}
              </div>
              {views.map((view) => (
                <div key={view.id} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  <Button
                    type="link"
                    onClick={() =>
                      navigate({
                        pathname: window.location.pathname,
                        search: view.search ? `?${view.search}` : "",
                      })
                    }
                  >
                    {view.name}
                  </Button>
                  <Button
                    type="text"
                    aria-label={t.table.deleteView}
                    onClick={() => removeView(view.id)}
                  >
                    ×
                  </Button>
                </div>
              ))}
              <Input
                value={viewName}
                placeholder={t.table.viewName}
                onChange={(event) => setViewName(event.target.value)}
                onPressEnter={saveView}
              />
            </div>
          )}
        >
          <Button>{t.table.saveView}</Button>
        </Dropdown>
      </div>

      {narrow ? (
        <div className={styles.cards}>
          {rows.map((row) => {
            const key = rowKey(row);
            return (
              <div key={key} className={styles.card}>
                {bulkActions ? (
                  <Checkbox
                    checked={selectedRows.has(key)}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, key]
                          : current.filter((item) => item !== key)
                      )
                    }
                  />
                ) : null}
                <button type="button" className={styles.card} onClick={() => onRowClick?.(row)}>
                  {visible.map((column) => (
                    <div key={column.key} className={styles.cardRow}>
                      <span className={styles.cardLabel}>{column.title}</span>
                      <span>{column.render(row)}</span>
                    </div>
                  ))}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <Table<T>
          size={density === "compact" ? "small" : "middle"}
          rowKey={(row) => rowKey(row)}
          columns={tableColumns}
          dataSource={rows}
          loading={loading}
          sticky
          scroll={{ x: "max-content" }}
          pagination={{
            current: currentPage,
            pageSize: currentSize,
            total: total ?? rows.length,
            showSizeChanger: true,
            onChange: changePage,
          }}
          rowSelection={
            bulkActions
              ? {
                  selectedRowKeys: selected,
                  onChange: (keys) => setSelected(keys.map(String)),
                }
              : undefined
          }
          onRow={(row) => ({
            onClick: () => onRowClick?.(row),
            style: onRowClick ? { cursor: "pointer" } : undefined,
          })}
        />
      )}
      {bulkActions && selected.length > 0 ? (
        <div className={styles.bulk} role="toolbar" aria-label={t.table.selected}>
          <span className={styles.nums}>
            {selected.length} {t.table.selected}
          </span>
          {bulkActions.map((action) => (
            <Button
              key={action.key}
              size="small"
              danger={action.danger}
              onClick={() => action.onClick(selected)}
            >
              {action.label}
            </Button>
          ))}
          <Button
            size="small"
            type="text"
            onClick={() => setSelected([])}
            style={{ color: "inherit" }}
          >
            {t.table.clear}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
