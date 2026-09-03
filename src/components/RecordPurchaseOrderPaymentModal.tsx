import { useEffect, useMemo, useState } from "react";
import { Form, Modal, Select, Typography, message } from "antd";
import { CurrencyInput } from "@/components/CurrencyInput";
import { listPurchaseOrderPayments, recordPurchaseOrderPayment } from "@/api";
import type { PurchaseOrderPaymentResponse, PurchaseOrderResponse } from "@/api";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { t } from "@/i18n";

const METHOD_LABELS: Record<string, string> = {
  cash: t.pos.cash,
  wave: t.pos.wave,
  orange_money: t.pos.orangeMoney,
};

type Props = {
  open: boolean;
  po: PurchaseOrderResponse | null;
  onClose: () => void;
  onRecorded: () => void;
};

export function RecordPurchaseOrderPaymentModal({ open, po, onClose, onRecorded }: Props) {
  const { canMultiPayment } = usePlanFeatures();
  const remaining = po?.remainingAmount ?? 0;
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("cash");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<PurchaseOrderPaymentResponse[]>([]);

  const methodOptions = useMemo(() => {
    const options = [{ value: "cash", label: METHOD_LABELS.cash }];
    if (canMultiPayment) {
      options.push(
        { value: "wave", label: METHOD_LABELS.wave },
        { value: "orange_money", label: METHOD_LABELS.orange_money }
      );
    }
    return options;
  }, [canMultiPayment]);

  useEffect(() => {
    if (!open || !po) return;
    setAmount(po.remainingAmount);
    setMethod("cash");
    listPurchaseOrderPayments(po.id)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [open, po]);

  const handleOk = async () => {
    if (!po) return;
    if (amount <= 0) {
      message.error(t.validation.amountMin);
      return;
    }
    if (amount > remaining) {
      message.error(t.purchaseOrders.paymentExceedsRemaining);
      return;
    }
    setSubmitting(true);
    try {
      await recordPurchaseOrderPayment(po.id, {
        amount,
        paymentMethod: method,
      });
      message.success(t.purchaseOrders.paymentRecorded);
      onRecorded();
      onClose();
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.common.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={t.purchaseOrders.recordPaymentTitle}
      open={open}
      onOk={() => void handleOk()}
      onCancel={onClose}
      okText={t.purchaseOrders.recordPayment}
      confirmLoading={submitting}
      destroyOnHidden
    >
      {po && (
        <div style={{ marginTop: 16 }}>
          <Typography.Text strong style={{ display: "block" }}>
            {po.reference}
          </Typography.Text>
          <Typography.Text type="secondary">
            {t.purchaseOrders.remainingDue}:{" "}
            <strong>{remaining.toLocaleString("fr-FR")} F</strong>
          </Typography.Text>
          {po.dueDate && (
            <Typography.Text type="secondary" style={{ display: "block", marginTop: 4 }}>
              {t.purchaseOrders.dueDate}: {formatIsoDate(po.dueDate)}
            </Typography.Text>
          )}

          <Form layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item label={t.expenses.amount}>
              <CurrencyInput
                min={1}
                max={remaining}
                value={amount}
                onChange={(v) => setAmount(Number(v) || 0)}
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item label={t.receipt.paymentMethod}>
              <Select
                value={method}
                onChange={setMethod}
                options={methodOptions}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Form>

          {history.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                {t.purchaseOrders.paymentHistory}
              </Typography.Text>
              {history.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    marginBottom: 4,
                  }}
                >
                  <span>
                    {formatIsoDate(p.createdAt.slice(0, 10))} ·{" "}
                    {p.kind === "deposit"
                      ? t.purchaseOrders.paymentKindDeposit
                      : t.purchaseOrders.paymentKindInstallment}{" "}
                    ({METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod})
                  </span>
                  <span>{p.amount.toLocaleString("fr-FR")} F</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function formatIsoDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR");
}
