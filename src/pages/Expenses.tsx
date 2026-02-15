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
} from "antd";
import { Plus, Wallet, TrendingUp, BarChart3 } from "lucide-react";
import { t } from "@/i18n";
import styles from "./Expenses.module.css";
import { useStore } from "@/contexts/StoreContext";
import {
  listExpenses,
  listExpenseCategories,
  createExpense,
} from "@/api";
import type { ExpenseResponse, ExpenseCategoryResponse } from "@/api";

function formatFCFA(n: number) {
  return n.toLocaleString("fr-FR") + " F";
}

const DEFAULT_CATEGORIES = [
  { name: "Achats marchandises", color: "blue" },
  { name: "Transport", color: "orange" },
  { name: "Loyer", color: "purple" },
  { name: "Salaires", color: "green" },
  { name: "Divers", color: "default" },
];

export default function Expenses() {
  const { activeStore } = useStore();
  const [form] = Form.useForm();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
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
        listExpenses({ page: 0, size: 200, storeId: activeStore?.id }),
        listExpenseCategories(),
      ]);
      setExpenses(expRes.content);
      if (catRes.length === 0) {
        try {
          const { createExpenseCategory } = await import("@/api");
          for (const c of DEFAULT_CATEGORIES) {
            await createExpenseCategory({ name: c.name, color: c.color });
          }
          const refreshed = await listExpenseCategories();
          setCategories(refreshed);
        } catch {
          setCategories([]);
        }
      } else {
        setCategories(catRes);
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Erreur chargement");
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [activeStore?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered =
    categoryFilter === "all"
      ? expenses
      : expenses.filter((e) => e.categoryId === categoryFilter);

  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const categoryColorMap: Record<string, string> = Object.fromEntries(
    categories.map((c) => [c.id, c.color || "default"]),
  );

  const monthTotal = expenses
    .filter((e) => {
      const d = e.expenseDate;
      const now = new Date();
      return d && d.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    })
    .reduce((s, e) => s + (e.amount ?? 0), 0);

  const topCategory = expenses.length
    ? [...expenses].reduce(
        (acc, e) => {
          const cat = categoryById[e.categoryId];
          const name = cat?.name ?? "Autre";
          acc[name] = (acc[name] || 0) + (e.amount ?? 0);
          return acc;
        },
        {} as Record<string, number>,
      )
    : {};
  const topCatName = Object.entries(topCategory).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

  const summaryStats = [
    { label: "Total ce mois", value: formatFCFA(monthTotal), icon: Wallet, color: "var(--color-primary)", bg: "rgba(31,58,95,0.08)" },
    { label: "Top catégorie", value: topCatName, icon: TrendingUp, color: "var(--color-warning)", bg: "rgba(243,156,18,0.08)" },
    { label: "Nb dépenses", value: String(expenses.length), icon: BarChart3, color: "var(--color-success)", bg: "rgba(46,204,113,0.08)" },
  ];

  const onFinish = async (values: Record<string, unknown>) => {
    const categoryId = values.categoryId as string;
    if (!categoryId) return;
    try {
      await createExpense({
        storeId: activeStore?.id ?? null,
        categoryId,
        amount: Number(values.amount) || 0,
        description: (values.description as string) || undefined,
        expenseDate: values.expenseDate
          ? (values.expenseDate as { format: (f: string) => string }).format("YYYY-MM-DD")
          : new Date().toISOString().slice(0, 10),
      });
      message.success("Dépense ajoutée");
      form.resetFields();
      setDrawerOpen(false);
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
        <Card bordered={false} className={`${styles.card} contentCard`}>
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
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { value: "all", label: t.expenses.allCategories },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
            style={{ width: 200 }}
          />
          <Button
            type="primary"
            icon={<Plus size={18} />}
            onClick={() => setDrawerOpen(true)}
          >
            {t.expenses.addExpense}
          </Button>
        </div>
      </header>

      {/* Summary stats */}
      <Row gutter={[12, 12]} className={styles.summaryRow}>
        {summaryStats.map(({ label, value, icon: Icon, color, bg }) => (
          <Col xs={8} key={label}>
            <Card bordered={false} className={styles.summaryCard}>
              <div className={styles.summaryInner}>
                <span
                  className={styles.summaryIcon}
                  style={{ background: bg, color }}
                >
                  <Icon size={18} />
                </span>
                <span className={styles.summaryValue}>{value}</span>
                <span className={styles.summaryLabel}>{label}</span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        title={t.expenses.list}
        bordered={false}
        className={`${styles.card} contentCard`}
      >
        {expenses.length === 0 ? (
          <div className={styles.emptyHero}>
            <div className={styles.emptyIconWrap}>
              <Wallet size={36} strokeWidth={1.5} />
            </div>
            <Typography.Title level={4} style={{ marginBottom: 8 }}>
              Aucune dépense
            </Typography.Title>
            <Typography.Text type="secondary" style={{ maxWidth: 340, textAlign: 'center', lineHeight: 1.6 }}>
              Enregistrez vos dépenses pour suivre vos charges et mieux comprendre votre rentabilité.
            </Typography.Text>
            <Button type="primary" size="large" icon={<Plus size={16} />} onClick={() => setDrawerOpen(true)} style={{ marginTop: 20, height: 48 }}>
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
                  sorter: (a: ExpenseResponse, b: ExpenseResponse) => (a.amount ?? 0) - (b.amount ?? 0),
                  render: (v: number) => (
                    <span className="amount">
                      {formatFCFA(v ?? 0)}
                    </span>
                  ),
                  width: 120,
                },
                {
                  title: t.expenses.description,
                  dataIndex: "description",
                  ellipsis: true,
                },
              ]}
            />
          </div>
        )}
      </Card>

      {/* Add expense drawer */}
      <Drawer
        title={t.expenses.addExpense}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
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
              {t.products.save}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={onFinish} size="large">
          <Form.Item
            name="categoryId"
            label={t.expenses.category}
            rules={[
              { required: true, message: t.validation.categoryRequired },
            ]}
          >
            <Select
              placeholder={t.expenses.category}
              options={categories.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
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
            <InputNumber
              min={1}
              addonAfter="F"
              style={{ width: "100%" }}
              placeholder="0"
            />
          </Form.Item>
          <Form.Item name="description" label={t.expenses.description}>
            <Input.TextArea rows={3} placeholder="Description (optionnel)" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
