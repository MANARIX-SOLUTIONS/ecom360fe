import { useEffect, useRef, useState } from "react";
import { Alert, Button, Modal, Popconfirm, Space, Spin, Typography, message } from "antd";
import { t } from "@/i18n";
import {
  DIGITAL_CHECKOUT_CLOSED,
  DIGITAL_CHECKOUT_SETTLED,
  cancelDigitalCheckout,
  confirmManualDigitalCheckout,
  getDigitalCheckout,
} from "@/api/sales";
import type { DigitalCheckoutResponse } from "@/api/sales";
import { resolveGeneratedQr, resolvePaymentQr } from "@/utils/paymentQr";
import { PaymentQr } from "@/components/PaymentQrModal";

const POLL_INTERVAL_MS = 2500;
const PENDING_HINT_AFTER_ATTEMPTS = 72; // ~3 min

type PosPaymentModalProps = {
  checkout: DigitalCheckoutResponse;
  /** Paid by Bictorys or confirmed by hand: `res.sale` is set. */
  onSettled: (res: DigitalCheckoutResponse) => void;
  /** Failed, expired or cancelled: the sale is released server-side. */
  onClosed: (res: DigitalCheckoutResponse) => void;
};

function formatAmount(amount: number, currency: string): string {
  const unit = currency === "XOF" ? "F" : currency;
  return `${new Intl.NumberFormat("fr-FR").format(amount)} ${unit}`;
}

export default function PosPaymentModal({ checkout, onSettled, onClosed }: PosPaymentModalProps) {
  const [isStillPending, setIsStillPending] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);
  const [busyAction, setBusyAction] = useState<"cancel" | "manual" | null>(null);
  const isDoneRef = useRef(false);
  const handlersRef = useRef({ onSettled, onClosed });
  handlersRef.current = { onSettled, onClosed };

  const intentId = checkout.intentId;

  const settle = (res: DigitalCheckoutResponse): boolean => {
    if (isDoneRef.current) return true;
    if (DIGITAL_CHECKOUT_SETTLED.includes(res.status)) {
      isDoneRef.current = true;
      handlersRef.current.onSettled(res);
      return true;
    }
    if (DIGITAL_CHECKOUT_CLOSED.includes(res.status)) {
      isDoneRef.current = true;
      handlersRef.current.onClosed(res);
      return true;
    }
    return false;
  };

  useEffect(() => {
    isDoneRef.current = false;
    setIsStillPending(false);
    setHasImageError(false);
    let attempts = 0;
    let isActive = true;
    let inFlight = false;
    const timer = setInterval(() => {
      if (inFlight) return;
      inFlight = true;
      attempts += 1;
      if (attempts >= PENDING_HINT_AFTER_ATTEMPTS) setIsStillPending(true);
      getDigitalCheckout(intentId)
        .then((res) => {
          if (isActive && settle(res)) clearInterval(timer);
        })
        .catch(() => undefined)
        .finally(() => {
          inFlight = false;
        });
    }, POLL_INTERVAL_MS);
    return () => {
      isActive = false;
      clearInterval(timer);
    };
  }, [intentId]);

  const runAction = async (
    action: "cancel" | "manual",
    call: (id: string) => Promise<DigitalCheckoutResponse>
  ) => {
    setBusyAction(action);
    try {
      settle(await call(intentId));
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.common.errorGeneric);
    } finally {
      setBusyAction(null);
    }
  };

  const isWave = checkout.channel === "wave";
  const operatorName = isWave ? t.pos.wave : t.pos.orangeMoney;
  const operatorLogo = isWave ? "/images/payments/wave.png" : "/images/payments/orange-money.png";
  const openLink = checkout.paymentLink ?? checkout.checkoutUrl;
  const qrSource = hasImageError ? resolveGeneratedQr(checkout) : resolvePaymentQr(checkout);
  const scanHint =
    qrSource?.kind === "payload" && qrSource.isWebPage
      ? t.pos.onlinePayWebScanHint
      : t.pos.onlinePayScanHint.replace("{operator}", operatorName);

  return (
    <Modal
      open
      centered
      width={420}
      closable={false}
      maskClosable={false}
      keyboard={false}
      footer={null}
      title={
        <Space align="center">
          <img src={operatorLogo} alt="" width={28} height={28} />
          {t.pos.onlinePayModalTitle.replace("{operator}", operatorName)}
        </Space>
      }
    >
      <div style={{ textAlign: "center" }}>
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>
          {formatAmount(checkout.amount, checkout.currency)}
        </Typography.Title>
        {checkout.receiptNumber && (
          <Typography.Text type="secondary">{checkout.receiptNumber}</Typography.Text>
        )}

        {qrSource && (
          <>
            <div style={{ display: "flex", justifyContent: "center", margin: "16px 0" }}>
              <PaymentQr source={qrSource} onImageError={() => setHasImageError(true)} />
            </div>
            <Typography.Paragraph type="secondary">{scanHint}</Typography.Paragraph>
          </>
        )}

        {checkout.ussdMessage && (
          <Alert
            type="info"
            showIcon
            message={checkout.ussdMessage}
            style={{ textAlign: "left", marginBottom: 12 }}
          />
        )}

        {openLink && (
          <Button type="link" href={openLink} target="_blank" rel="noopener noreferrer">
            {t.pos.onlinePayOpenLink}
          </Button>
        )}

        <div style={{ margin: "8px 0 16px" }}>
          {isStillPending ? (
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {t.pos.onlinePayStillPending}
            </Typography.Paragraph>
          ) : (
            <Space>
              <Spin size="small" />
              <Typography.Text type="secondary">{t.pos.onlinePayWaiting}</Typography.Text>
            </Space>
          )}
        </div>

        <Space direction="vertical" style={{ width: "100%" }}>
          <Popconfirm
            title={t.pos.onlinePayManualConfirm}
            okText={t.common.confirm}
            cancelText={t.common.cancel}
            onConfirm={() => runAction("manual", confirmManualDigitalCheckout)}
          >
            <Button block loading={busyAction === "manual"} disabled={busyAction === "cancel"}>
              {t.pos.onlinePayManual}
            </Button>
          </Popconfirm>
          <Popconfirm
            title={t.pos.onlinePayCancelConfirm}
            okText={t.common.confirm}
            cancelText={t.common.cancel}
            okButtonProps={{ danger: true }}
            onConfirm={() => runAction("cancel", cancelDigitalCheckout)}
          >
            <Button
              block
              danger
              type="text"
              loading={busyAction === "cancel"}
              disabled={busyAction === "manual"}
            >
              {t.pos.onlinePayCancel}
            </Button>
          </Popconfirm>
        </Space>
      </div>
    </Modal>
  );
}
