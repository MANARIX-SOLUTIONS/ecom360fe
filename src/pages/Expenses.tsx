import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Typography,
  Tag,
  Drawer,
  Skeleton,
  message,
  DatePicker,
  Modal,
  Space,
  Pagination,
  Tooltip,
} from "antd";
import dayjs from "dayjs";
import { CurrencyInput } from "@/components/CurrencyInput";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Wallet, Tags, Pencil, Trash2 } from "lucide-react";
import { t } from "@/i18n";
import styles from "./Expenses.module.css";
import { useStore } from "@/hooks/useStore";
import { useMatrixCan } from "@/hooks/useMatrixCan";
import {
  listExpenses,
  listExpenseCategoriesWithDefaults,
  listExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  createExpense,
  updateExpense,
  deleteExpense,
} from "@/api";
import type { ExpenseResponse, ExpenseCategoryResponse } from "@/api";

function formatFCFA(n: number) {
  return n.toLocaleString("fr-FR") + " F";
}

function formatExpenseDate(iso: string) {
  const parsed = dayjs(iso);
  return parsed.isValid() ? parsed.format("DD/MM/YYYY") : iso;
}

function expensesCountLabel(count: number) {
  if (count === 1) return t.expenses.countOne;
  return t.expenses.countOther.replace("{count}", String(count));
}

const CATEGORY_COLOR_OPTIONS = [
  { value: "blue", label: "Bleu" },
  { value: "green", label: "Vert" },
  { value: "orange", label: "Orange" },
  { value: "purple", label: "Violet" },
  { value: "red", label: "Rouge" },
  { value: "cyan", label: "Cyan" },
  { value: "default", label: "Gris" },
];

export default function Expenses() {
  const { activeStore } = useStore();
  const { matrixCan } = useMatrixCan();
  const [form] = Form.useForm();
  const [categoryForm] = Form.useForm();
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState<number>(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number>(now.getFullYear());
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseResponse | null>(null);
  const [categoriesDrawerOpen, setCategoriesDrawerOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([]);
  const [summaryExpenses, setSummaryExpenses] = useState<ExpenseResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [categories, setCategories] = useState<ExpenseCategoryResponse[]>([]);

  const canCreate = matrixCan("EXPENSES_CREATE", "expenses");
  const canUpdate = matrixCan("EXPENSES_UPDATE", "expenses");
  const canDelete = matrixCan("EXPENSES_DELETE", "expenses");

  useEffect(() => {
    setPage(0);
  }, [activeStore?.id, filterMonth, filterYear, categoryFilter]);

  const fetchData = useCallback(
    async (isCancelled?: () => boolean) => {
      if (!localStorage.getItem("ecom360_access_token")) {
        if (!isCancelled?.()) setLoading(false);
        return;
      }
      if (!isCancelled?.()) setLoading(true);
      const filters = {
        storeId: activeStore?.id,
        month: filterMonth,
        year: filterYear,
        categoryId: categoryFilter !== "all" ? categoryFilter : undefined,
      };
      try {
        const [expRes, summaryRes, catRes] = await Promise.all([
          listExpenses({ ...filters, page, size: pageSize }),
          listExpenses({ ...filters, page: 0, size: 100 }),
          listExpenseCategoriesWithDefaults(),
        ]);
        if (isCancelled?.()) return;
        setExpenses(expRes.content);
        setTotal(expRes.totalElements ?? 0);
        setSummaryExpenses(summaryRes.content);
        setCategories(catRes);
      } catch (e) {
        if (isCancelled?.()) return;
        message.error(e instanceof Error ? e.message : t.common.msgLoadError);
        setExpenses([]);
        setSummaryExpenses([]);
        setTotal(0);
      } finally {
        if (!isCancelled?.()) setLoading(false);
      }
    },
    [activeStore?.id, filterMonth, filterYear, categoryFilter, page, pageSize]
  );

  useEffect(() => {
    let cancelled = false;
    void fetchData(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));

  const monthTotal = summaryExpenses.reduce((s, e) => s + (e.amount ?? 0), 0);

  const topCategory = summaryExpenses.length
    ? [...summaryExpenses].reduce(
        (acc, e) => {
          const cat = categoryById[e.categoryId];
          const name = cat?.name ?? t.expenses.noCategory;
          acc[name] = (acc[name] || 0) + (e.amount ?? 0);
          return acc;
        },
        {} as Record<string, number>
      )
    : {};
  const topCatName = Object.entries(topCategory).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

  const openAddCategory = () => {
    setEditingCategory(null);
    categoryForm.resetFields();
    setCategoryModalOpen(true);
  };

  const openEditCategory = (c: ExpenseCategoryResponse) => {
    setEditingCategory(c);
    categoryForm.setFieldsValue({
      name: c.name,
      color: c.color || "default",
      sortOrder: c.sortOrder ?? 0,
    });
    setCategoryModalOpen(true);
  };

  const onCategorySave = () => {
    categoryForm.validateFields().then(async (values) => {
      try {
        let createdId: string | null = null;
        if (editingCategory) {
          await updateExpenseCategory(editingCategory.id, {
            name: values.name,
            color: values.color,
            sortOrder: values.sortOrder ?? 0,
          });
          message.success(t.common.categoryUpdated);
        } else {
          const created = await createExpenseCategory({
            name: values.name,
            color: values.color,
            sortOrder: values.sortOrder ?? 0,
          });
          createdId = created.id;
          message.success(t.common.categoryAdded);
        }
        setCategoryModalOpen(false);
        categoryForm.resetFields();
        const refreshed = await listExpenseCategories();
        setCategories(refreshed);
        if (createdId && drawerOpen) {
          form.setFieldValue("categoryId", createdId);
        }
      } catch (e) {
        message.error(e instanceof Error ? e.message : t.common.errorGeneric);
      }
    });
  };

  const onCategoryDelete = (c: ExpenseCategoryResponse) => {
    Modal.confirm({
      title: t.expenses.deleteCategoryConfirm.replace("{name}", c.name),
      okText: t.list.deleteOk,
      okButtonProps: { danger: true },
      cancelText: t.common.cancel,
      onOk: async () => {
        try {
          await deleteExpenseCategory(c.id);
          message.success(t.common.categoryDeleted);
          const refreshed = await listExpenseCategories();
          setCategories(refreshed);
          fetchData();
        } catch (e) {
          message.error(e instanceof Error ? e.message : t.common.errorGeneric);
        }
      },
    });
  };

  const onExpenseDelete = (exp: ExpenseResponse) => {
    Modal.confirm({
      title: t.expenses.deleteConfirm,
      content: `${exp.description?.trim() || categoryById[exp.categoryId]?.name || t.expenses.noCategory} — ${formatFCFA(exp.amount)}`,
      okText: t.list.deleteOk,
      okButtonProps: { danger: true },
      cancelText: t.common.cancel,
      onOk: async () => {
        try {
          await deleteExpense(exp.id);
          message.success(t.expenses.msgDeleted);
          fetchData();
        } catch (e) {
          message.error(e instanceof Error ? e.message : t.common.errorGeneric);
        }
      },
    });
  };

  const openAddExpense = () => {
    setEditingExpense(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEditExpense = (exp: ExpenseResponse) => {
    setEditingExpense(exp);
    form.setFieldsValue({
      categoryId: exp.categoryId,
      amount: exp.amount,
      description: exp.description ?? "",
      expenseDate: exp.expenseDate ? dayjs(exp.expenseDate) : undefined,
    });
    setDrawerOpen(true);
  };

  const onFinish = async (values: Record<string, unknown>) => {
    const categoryId = values.categoryId as string;
    if (!categoryId) return;
    const payload = {
      storeId: activeStore?.id ?? null,
      categoryId,
      amount: Number(values.amount) || 0,
      description: (values.description as string) || undefined,
      expenseDate: values.expenseDate
        ? (values.expenseDate as { format: (f: string) => string }).format("YYYY-MM-DD")
        : new Date().toISOString().slice(0, 10),
    };
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, payload);
        message.success(t.expenses.msgUpdated);
      } else {
        await createExpense(payload);
        message.success(t.expenses.msgAdded);
      }
      form.resetFields();
      setDrawerOpen(false);
      setEditingExpense(null);
      fetchData();
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.common.errorGeneric);
    }
  };

  if (loading && expenses.length === 0) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <div className={styles.header}>
          <Skeleton.Input active style={{ width: 140, height: 32 }} />
          <Skeleton.Button active style={{ width: 160, height: 40 }} />
        </div>
        <Card variant="borderless" className={`${styles.card} contentCard`}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      </div>
    );
  }

  const isUnfilteredEmpty = expenses.length === 0 && categoryFilter === "all";

  return (
    <div className={`${styles.page} pageWrapper`}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <Typography.Title level={4} className="pageTitle">
            {t.expenses.title}
          </Typography.Title>
          <Typography.Text type="secondary" className="pageSubtitle">
            {expensesCountLabel(total)}
          </Typography.Text>
        </div>
        <div className={styles.headerActions}>
          {canUpdate && (
            <Button icon={<Tags size={16} />} onClick={() => setCategoriesDrawerOpen(true)}>
              {t.expenses.manageCategories}
            </Button>
          )}
          {canCreate && (
            <Button type="primary" icon={<Plus size={16} />} onClick={openAddExpense}>
              {t.expenses.addExpense}
            </Button>
          )}
        </div>
      </header>

      <Card variant="borderless" className={`${styles.card} contentCard`}>
        <div className={styles.toolbar}>
          <Select
            value={filterMonth}
            onChange={setFilterMonth}
            options={Array.from({ length: 12 }, (_, i) => ({
              value: i + 1,
              label: new Date(2000, i, 1).toLocaleString("fr-FR", { month: "long" }),
            }))}
            style={{ width: 140 }}
          />
          <Select
            value={filterYear}
            onChange={setFilterYear}
            options={Array.from({ length: 5 }, (_, i) => {
              const y = new Date().getFullYear() - 2 + i;
              return { value: y, label: String(y) };
            })}
            style={{ width: 100 }}
          />
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { value: "all", label: t.expenses.allCategories },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
            style={{ width: 180 }}
          />
        </div>

        {expenses.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={isUnfilteredEmpty ? t.expenses.emptyTitle : t.expenses.emptyFilteredTitle}
            description={isUnfilteredEmpty ? t.expenses.emptyDesc : t.expenses.emptyFilteredDesc}
            action={
              isUnfilteredEmpty && canCreate ? (
                <Button
                  type="primary"
                  size="large"
                  icon={<Plus size={16} />}
                  onClick={openAddExpense}
                  style={{ height: 48 }}
                >
                  {t.expenses.addExpense}
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <div className={styles.stats} aria-label={t.list.summaryPageHint}>
              <div className={`${styles.stat} ${monthTotal > 0 ? styles.statWarn : ""}`}>
                <span className={styles.statValue}>{formatFCFA(monthTotal)}</span>
                <span className={styles.statLabel}>{t.expenses.monthTotal}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{topCatName}</span>
                <span className={styles.statLabel}>{t.expenses.topCategory}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{expensesCountLabel(total)}</span>
                <span className={styles.statLabel}>{t.list.summaryPageHint}</span>
              </div>
            </div>
            <ul className={styles.list} aria-busy={loading}>
              {expenses.map((exp) => {
                const categoryName =
                  categoryById[exp.categoryId]?.name ?? t.expenses.noCategory;
                const name = exp.description?.trim() || categoryName;
                return (
                  <li key={exp.id} className={styles.row}>
                    <div className={`${styles.identity} ${styles.identityStatic}`}>
                      <span className={styles.identityText}>
                        <span className={styles.name}>{name}</span>
                        <span className={styles.meta}>
                          {formatExpenseDate(exp.expenseDate)} · {categoryName}
                        </span>
                      </span>
                    </div>
                    <div className={styles.statusCol}>
                      <span className={`${styles.pill} ${styles.pillWarn}`}>
                        {formatFCFA(exp.amount ?? 0)}
                      </span>
                    </div>
                    <div className={styles.actions}>
                      {canUpdate ? (
                        <Tooltip title={t.common.edit}>
                          <Button
                            type="text"
                            size="small"
                            icon={<Pencil size={16} />}
                            onClick={() => openEditExpense(exp)}
                            aria-label={t.common.edit}
                          />
                        </Tooltip>
                      ) : null}
                      {canDelete ? (
                        <Tooltip title={t.common.delete}>
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<Trash2 size={16} />}
                            onClick={() => onExpenseDelete(exp)}
                            aria-label={t.common.delete}
                          />
                        </Tooltip>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            {total > pageSize ? (
              <div className={styles.pager}>
                <Pagination
                  current={page + 1}
                  pageSize={pageSize}
                  total={total}
                  showSizeChanger
                  pageSizeOptions={["10", "20", "50"]}
                  showTotal={(count) => expensesCountLabel(count)}
                  onChange={(nextPage, size) => {
                    setPage(nextPage - 1);
                    setPageSize(size);
                  }}
                />
              </div>
            ) : null}
          </>
        )}
      </Card>

      <Drawer
        title={editingExpense ? t.expenses.editExpense : t.expenses.addExpense}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingExpense(null);
          form.resetFields();
        }}
        width={400}
        placement="right"
        footer={
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <Button
              onClick={() => {
                setDrawerOpen(false);
                form.resetFields();
              }}
            >
              {t.common.cancel}
            </Button>
            <Button type="primary" onClick={() => form.submit()}>
              {t.common.save}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={onFinish} size="large">
          <Form.Item
            name="categoryId"
            label={t.expenses.category}
            rules={[{ required: true, message: t.validation.categoryRequired }]}
          >
            <Select
              placeholder={t.expenses.category}
              showSearch
              optionFilterProp="label"
              options={categories.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  {canCreate && (
                    <div style={{ padding: "8px 12px", borderTop: "1px solid #f0f0f0" }}>
                      <Button
                        type="text"
                        block
                        icon={<Plus size={14} />}
                        onClick={() => {
                          setEditingCategory(null);
                          categoryForm.resetFields();
                          setCategoryModalOpen(true);
                        }}
                      >
                        {t.expenses.addCategory}
                      </Button>
                    </div>
                  )}
                </>
              )}
            />
          </Form.Item>
          <Form.Item
            name="expenseDate"
            label={t.common.date}
            rules={[{ required: true, message: t.validation.requiredField }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item
            name="amount"
            label={t.expenses.amount}
            rules={[
              { required: true, message: t.validation.amountRequired },
              { type: "number", min: 1, message: t.validation.amountMin },
            ]}
          >
            <CurrencyInput
              min={1}
              style={{ width: "100%" }}
              placeholder={t.expenses.placeholderAmountZero}
            />
          </Form.Item>
          <Form.Item name="description" label={t.expenses.description}>
            <Input.TextArea rows={3} placeholder={t.expenses.descriptionOptionalPlaceholder} />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title={t.expenses.manageCategories}
        placement="right"
        width={400}
        onClose={() => setCategoriesDrawerOpen(false)}
        open={categoriesDrawerOpen}
        extra={
          canCreate ? (
            <Button type="primary" icon={<Plus size={16} />} onClick={openAddCategory}>
              {t.expenses.addCategory}
            </Button>
          ) : null
        }
      >
        {categories.length === 0 ? (
          <Typography.Text type="secondary">
            {t.products.emptyCategoriesDesc}
          </Typography.Text>
        ) : (
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            {categories.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "var(--color-bg-secondary)",
                  borderRadius: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Tag color={c.color || "default"}>{c.name}</Tag>
                </div>
                <Space>
                  {canUpdate && (
                    <Button
                      type="text"
                      size="small"
                      icon={<Pencil size={14} />}
                      onClick={() => openEditCategory(c)}
                      aria-label={t.common.edit}
                    />
                  )}
                  {canDelete && (
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<Trash2 size={14} />}
                      onClick={() => onCategoryDelete(c)}
                      aria-label={t.common.delete}
                    />
                  )}
                </Space>
              </div>
            ))}
          </Space>
        )}
      </Drawer>

      <Modal
        title={editingCategory ? t.expenses.editCategory : t.expenses.addCategory}
        open={categoryModalOpen}
        onOk={onCategorySave}
        onCancel={() => {
          setCategoryModalOpen(false);
          setEditingCategory(null);
          categoryForm.resetFields();
        }}
        okText={t.common.save}
        width={380}
        destroyOnHidden
      >
        <Form form={categoryForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t.expenses.categoryName}
            rules={[{ required: true, message: t.validation.nameRequired }]}
          >
            <Input placeholder={t.expenses.placeholderCategoryExamplesLong} />
          </Form.Item>
          <Form.Item name="color" label={t.expenses.categoryColor} initialValue="default">
            <Select options={CATEGORY_COLOR_OPTIONS} />
          </Form.Item>
          <Form.Item name="sortOrder" label={t.products.categorySortOrder} initialValue={0}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
