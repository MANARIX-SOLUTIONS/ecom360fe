import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { DatePicker, Form, Modal, Select, Switch, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { CurrencyInput } from "@/components/CurrencyInput";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { t } from "@/i18n";
import type { PurchaseOrderResponse } from "@/api";

const METHOD_LABELS: Record<string, string> = {
  cash: t.pos.cash,
  wave: t.pos.wave,
  orange_money: t.pos.orangeMoney,
};

type Props = {
  open: boolean;
  po: PurchaseOrderResponse | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    amountPaid: number;
    paymentMethod?: string;
    dueDate?: string | null;
  }) => void;
};

export function ReceivePurchaseOrderModal({
  open,
  po,
  submitting,
  onClose,
  onConfirm,
}: Props) {
  const { canMultiPayment } = usePlanFeatures();
  const total = po?.totalAmount ?? 0;
  const [partialEnabled, setPartialEnabled] = useState(false);
  const [amountPaid, setAmountPaid] = useState(0);
  const [method, setMethod] = useState("cash");
  const [dueDate, setDueDate] = useState<Dayjs | null>(null);

  const remaining = Math.max(0, total - (partialEnabled ? amountPaid : 0));

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

  const reset = () => {
    setPartialEnabled(false);
    setAmountPaid(0);
    setMethod("cash");
    setDueDate(null);
  };

  const handleOk = () => {
    const paid = partialEnabled ? Math.min(Math.max(amountPaid, 0), total) : 0;
    const left = Math.max(0, total - paid);
    onConfirm({
      amountPaid: paid,
      paymentMethod: paid > 0 ? method : undefined,
      dueDate: left > 0 && dueDate ? dueDate.format("YYYY-MM-DD") : null,
    });
  };

  return (
    <Modal
      title={t.purchaseOrders.receiveConfirmTitle}
      open={open}
      onOk={handleOk}
      onCancel={() => {
        reset();
        onClose();
      }}
      okText={t.purchaseOrders.actionReceive}
      cancelText={t.common.cancel}
      confirmLoading={submitting}
      afterOpenChange={(isOpen) => {
        if (isOpen) reset();
      }}
      destroyOnHidden
    >
      {po && (
        <div style={{ marginTop: 8 }}>
          <Typography.Paragraph type="secondary">
            {t.purchaseOrders.receiveConfirmDesc}
          </Typography.Paragraph>
          <Typography.Text strong style={{ display: "block", marginBottom: 12 }}>
            {po.reference} · {total.toLocaleString("fr-FR")} F
          </Typography.Text>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <Typography.Text strong>{t.purchaseOrders.partialPayment}</Typography.Text>
              <Typography.Text
                type="secondary"
                style={{ display: "block", fontSize: 12, marginTop: 2 }}
              >
                {t.purchaseOrders.partialPaymentHint}
              </Typography.Text>
            </div>
            <Switch
              checked={partialEnabled}
              onChange={(v) => {
                setPartialEnabled(v);
                if (!v) setAmountPaid(0);
              }}
              aria-label={t.purchaseOrders.partialPayment}
            />
          </div>

          {partialEnabled && (
            <Form layout="vertical">
              <Form.Item label={t.purchaseOrders.amountPaidNow}>
                <CurrencyInput
                  min={0}
                  max={total}
                  value={amountPaid}
                  onChange={(v) => setAmountPaid(Number(v) || 0)}
                  style={{ width: "100%" }}
                />
              </Form.Item>
              <div style={{ display: "flex", gap: 8, marginTop: -8, marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => setAmountPaid(Math.round(total / 2))}
                  style={chipStyle}
                >
                  {t.pos.payHalf}
                </button>
                <button type="button" onClick={() => setAmountPaid(total)} style={chipStyle}>
                  {t.pos.payInFull}
                </button>
              </div>
              {amountPaid > 0 && (
                <Form.Item label={t.receipt.paymentMethod}>
                  <Select
                    value={method}
                    onChange={setMethod}
                    options={methodOptions}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              )}
              {remaining > 0 && (
                <Form.Item label={t.purchaseOrders.dueDate} extra={t.pos.dueDateOptional}>
                  <DatePicker
                    value={dueDate}
                    onChange={setDueDate}
                    format="DD/MM/YYYY"
                    disabledDate={(d) => d.isBefore(dayjs().startOf("day"))}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              )}
            </Form>
          )}

          <Typography.Text type="secondary" style={{ display: "block" }}>
            {t.purchaseOrders.remainingToSupplier}:{" "}
            <strong>{remaining.toLocaleString("fr-FR")} F</strong>
          </Typography.Text>
        </div>
      )}
    </Modal>
  );
}

const chipStyle: CSSProperties = {
  flex: 1,
  height: 32,
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  background: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};
