import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Typography,
  Table,
  Tag,
  Drawer,
  Row,
  Col,
  Skeleton,
  message,
  DatePicker,
  Modal,
  Space,
} from "antd";
import dayjs from "dayjs";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Plus, Wallet, TrendingUp, BarChart3, Tags, Pencil, Trash2 } from "lucide-react";
import { t } from "@/i18n";
import styles from "./Expenses.module.css";
import { useStore } from "@/hooks/useStore";
import {
  listExpenses,
  listExpenseCategoriesWithDefaults,
  listExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  createExpense,
  updateExpense,
} from "@/api";
import type { ExpenseResponse, ExpenseCategoryResponse } from "@/api";

function formatFCFA(n: number) {
  return n.toLocaleString("fr-FR") + " F";
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
  const [categories, setCategories] = useState<ExpenseCategoryResponse[]>([]);

  const fetchData = useCallback(async () => {
    if (!localStorage.getItem("ecom360_access_token")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [expRes, catRes] = await Promise.all([
        listExpenses({
          page: 0,
          size: 500,
          storeId: activeStore?.id,
          month: filterMonth,
          year: filterYear,
          categoryId: categoryFilter !== "all" ? categoryFilter : undefined,
        }),
        listExpenseCategoriesWithDefaults(),
      ]);
      setExpenses(expRes.content);
      setCategories(catRes);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur chargement");
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [activeStore?.id, filterMonth, filterYear, categoryFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered =
    categoryFilter === "all" ? expenses : expenses.filter((e) => e.categoryId === categoryFilter);

  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const categoryColorMap: Record<string, string> = Object.fromEntries(
    categories.map((c) => [c.id, c.color || "default"])
  );

  const monthTotal = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);

  const topCategory = expenses.length
    ? [...expenses].reduce(
        (acc, e) => {
          const cat = categoryById[e.categoryId];
          const name = cat?.name ?? "Autre";
          acc[name] = (acc[name] || 0) + (e.amount ?? 0);
          return acc;
        },
        {} as Record<string, number>
      )
    : {};
  const topCatName = Object.entries(topCategory).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

  const summaryStats = [
    {
      label: "Total ce mois",
      value: formatFCFA(monthTotal),
      icon: Wallet,
      color: "var(--color-primary)",
      bg: "rgba(31,58,95,0.08)",
    },
    {
      label: "Top catégorie",
      value: topCatName,
      icon: TrendingUp,
      color: "var(--color-warning)",
      bg: "rgba(243,156,18,0.08)",
    },
    {
      label: "Nb dépenses",
      value: String(expenses.length),
      icon: BarChart3,
      color: "var(--color-success)",
      bg: "rgba(46,204,113,0.08)",
    },
  ];

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
          message.success("Catégorie mise à jour");
        } else {
          const created = await createExpenseCategory({
            name: values.name,
            color: values.color,
            sortOrder: values.sortOrder ?? 0,
          });
          createdId = created.id;
          message.success("Catégorie ajoutée");
        }
        setCategoryModalOpen(false);
        categoryForm.resetFields();
        const refreshed = await listExpenseCategories();
        setCategories(refreshed);
        if (createdId && drawerOpen) {
          form.setFieldValue("categoryId", createdId);
        }
      } catch (e) {
        message.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const onCategoryDelete = async (c: ExpenseCategoryResponse) => {
    if (!window.confirm(`Supprimer la catégorie "${c.name}" ?`)) return;
    try {
      await deleteExpenseCategory(c.id);
      message.success("Catégorie supprimée");
      const refreshed = await listExpenseCategories();
      setCategories(refreshed);
      fetchData();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur");
    }
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
        message.success("Dépense mise à jour");
      } else {
        await createExpense(payload);
        message.success("Dépense ajoutée");
      }
      form.resetFields();
      setDrawerOpen(false);
      setEditingExpense(null);
      fetchData();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  if (loading) {
    return (
      <div className={`${styles.page} pageWrapper`}>
        <div className={styles.header}>
          <Skeleton.Input active style={{ width: 120, height: 28 }} />
          <div className={styles.toolbar}>
            <Skeleton.Input active style={{ width: 180, height: 44 }} />
            <Skeleton.Button active style={{ width: 180, height: 44 }} />
          </div>
        </div>
        <Card variant="borderless" className={`${styles.card} contentCard`}>
          <Skeleton active paragraph={{ rows: 5 }} />
        </Card>
      </div>
    );
  }

  return (
    <div className={`${styles.page} pageWrapper`}>
      <header className={styles.header}>
        <Typography.Title level={4} className="pageTitle">
          {t.expenses.title}
        </Typography.Title>
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
          <Button
            icon={<Tags size={18} />}
            onClick={() => setCategoriesDrawerOpen(true)}
            style={{ flexShrink: 0 }}
          >
            {t.expenses.manageCategories}
          </Button>
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { value: "all", label: t.expenses.allCategories },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
            style={{ width: 180 }}
          />
          <Button type="primary" icon={<Plus size={18} />} onClick={openAddExpense}>
            {t.expenses.addExpense}
          </Button>
        </div>
      </header>

      {/* Summary stats */}
      <Row gutter={[12, 12]} className={styles.summaryRow}>
        {summaryStats.map(({ label, value, icon: Icon, color, bg }) => (
          <Col xs={8} key={label}>
            <Card variant="borderless" className={styles.summaryCard}>
              <div className={styles.summaryInner}>
                <span className={styles.summaryIcon} style={{ background: bg, color }}>
                  <Icon size={18} />
                </span>
                <span className={styles.summaryValue}>{value}</span>
                <span className={styles.summaryLabel}>{label}</span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card title={t.expenses.list} variant="borderless" className={`${styles.card} contentCard`}>
        {expenses.length === 0 ? (
          <div className={styles.emptyHero}>
            <div className={styles.emptyIconWrap}>
              <Wallet size={36} strokeWidth={1.5} />
            </div>
            <Typography.Title level={4} style={{ marginBottom: 8 }}>
              Aucune dépense
            </Typography.Title>
            <Typography.Text
              type="secondary"
              style={{ maxWidth: 340, textAlign: "center", lineHeight: 1.6 }}
            >
              Enregistrez vos dépenses pour suivre vos charges et mieux comprendre votre
              rentabilité.
            </Typography.Text>
            <Button
              type="primary"
              size="large"
              icon={<Plus size={16} />}
              onClick={openAddExpense}
              style={{ marginTop: 20, height: 48 }}
            >
              Ajouter une dépense
            </Button>
          </div>
        ) : (
          <div className="tableResponsive">
            <Table
              dataSource={filtered}
              className="dataTable"
              rowKey="id"
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: "Aucune dépense trouvée" }}
              columns={[
                { title: t.common.date, dataIndex: "expenseDate", width: 120 },
                {
                  title: t.expenses.category,
                  dataIndex: "categoryId",
                  render: (_: string, r: ExpenseResponse) => (
                    <Tag color={categoryColorMap[r.categoryId] || "default"}>
                      {categoryById[r.categoryId]?.name ?? "-"}
                    </Tag>
                  ),
                },
                {
                  title: t.expenses.amount,
                  dataIndex: "amount",
                  sorter: (a: ExpenseResponse, b: ExpenseResponse) =>
                    (a.amount ?? 0) - (b.amount ?? 0),
                  render: (v: number) => <span className="amount">{formatFCFA(v ?? 0)}</span>,
                  width: 120,
                },
                {
                  title: t.expenses.description,
                  dataIndex: "description",
                  ellipsis: true,
                },
                {
                  title: "",
                  key: "actions",
                  width: 80,
                  render: (_: unknown, r: ExpenseResponse) => (
                    <Button
                      type="text"
                      size="small"
                      icon={<Pencil size={14} />}
                      onClick={() => openEditExpense(r)}
                      aria-label={t.common.edit}
                    />
                  ),
                },
              ]}
            />
          </div>
        )}
      </Card>

      {/* Add / Edit expense drawer */}
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
            <CurrencyInput min={1} style={{ width: "100%" }} placeholder="0" />
          </Form.Item>
          <Form.Item name="description" label={t.expenses.description}>
            <Input.TextArea rows={3} placeholder="Description (optionnel)" />
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
          <Button type="primary" icon={<Plus size={16} />} onClick={openAddCategory}>
            {t.expenses.addCategory}
          </Button>
        }
      >
        {categories.length === 0 ? (
          <Typography.Text type="secondary">
            Aucune catégorie. Cliquez sur &quot;Ajouter une catégorie&quot; pour commencer.
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
                  <Button
                    type="text"
                    size="small"
                    icon={<Pencil size={14} />}
                    onClick={() => openEditCategory(c)}
                    aria-label={t.common.edit}
                  />
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<Trash2 size={14} />}
                    onClick={() => onCategoryDelete(c)}
                    aria-label={t.common.delete}
                  />
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
            <Input placeholder="Ex: Achats, Transport, Loyer..." />
          </Form.Item>
          <Form.Item name="color" label={t.expenses.categoryColor} initialValue="default">
            <Select options={CATEGORY_COLOR_OPTIONS} />
          </Form.Item>
          <Form.Item name="sortOrder" label="Ordre" initialValue={0}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
