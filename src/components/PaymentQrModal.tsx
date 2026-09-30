import { useEffect, useRef, useState } from "react";
import { Alert, Button, Grid, Modal, QRCode, Result, Space, Spin, Typography } from "antd";
import { Smartphone } from "lucide-react";
import { t } from "@/i18n";
import { getCheckoutStatus } from "@/api";
import type { SubscriptionCheckoutResponse } from "@/api";
import { resolveGeneratedQr, resolvePaymentQr } from "@/utils/paymentQr";
import type { PaymentQrSource } from "@/utils/paymentQr";

const POLL_INTERVAL_MS = 4000;
const MAX_POLL_ATTEMPTS = 150; // ~10 min

type PaymentQrModalProps = {
  checkout: SubscriptionCheckoutResponse | null;
  onClose: (intentId: string, status: string) => void;
  onPaid: (planSlug: string) => void;
  onRetry: () => void;
};

type PollState = "waiting" | "paid" | "failed" | "timeout";

const FAILED_STATUSES = ["failed", "cancelled", "expired"];

function formatAmount(amount: number, currency: string): string {
  const unit = currency === "XOF" ? "F CFA" : currency;
  return `${new Intl.NumberFormat("fr-FR").format(amount)} ${unit}`;
}

const QR_SIZE = 220;

type PaymentQrProps = {
  source: PaymentQrSource;
  onImageError: () => void;
};

export function PaymentQr({ source, onImageError }: PaymentQrProps) {
  if (source.kind === "image") {
    return (
      <img
        src={source.src}
        alt={t.settings.planPayQrAlt}
        width={QR_SIZE}
        height={QR_SIZE}
        style={{ imageRendering: "pixelated", objectFit: "contain" }}
        onError={onImageError}
      />
    );
  }
  return (
    <QRCode
      value={source.value}
      size={QR_SIZE}
      type="svg"
      errorLevel="M"
      bordered={false}
      bgColor="#ffffff"
      color="#000000"
    />
  );
}

export default function PaymentQrModal({
  checkout,
  onClose,
  onPaid,
  onRetry,
}: PaymentQrModalProps) {
  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;
  const [pollState, setPollState] = useState<PollState>("waiting");
  const [failureReason, setFailureReason] = useState<string | undefined>();
  const [showQrOnMobile, setShowQrOnMobile] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);
  const statusRef = useRef<string>("pending");

  const intentId = checkout?.intentId;

  useEffect(() => {
    if (!intentId) return;
    setPollState("waiting");
    setFailureReason(undefined);
    setShowQrOnMobile(false);
    setHasImageError(false);
    statusRef.current = "pending";

    let attempts = 0;
    let isActive = true;
    const timer = setInterval(() => {
      attempts += 1;
      getCheckoutStatus(intentId)
        .then((res) => {
          if (!isActive) return;
          statusRef.current = res.status;
          if (res.status === "paid") {
            clearInterval(timer);
            setPollState("paid");
            onPaid(res.planSlug);
          } else if (FAILED_STATUSES.includes(res.status)) {
            clearInterval(timer);
            setFailureReason(res.failureReason);
            setPollState("failed");
          }
        })
        .catch(() => undefined)
        .finally(() => {
          if (isActive && attempts >= MAX_POLL_ATTEMPTS && statusRef.current === "pending") {
            clearInterval(timer);
            setPollState("timeout");
          }
        });
    }, POLL_INTERVAL_MS);

    return () => {
      isActive = false;
      clearInterval(timer);
    };
  }, [intentId, onPaid]);

  if (!checkout) return null;

  const isWave = checkout.channel === "wave";
  const operatorName = isWave ? t.settings.planPayWave : t.settings.planPayOrangeMoney;
  const operatorLogo = isWave ? "/images/payments/wave.png" : "/images/payments/orange-money.png";
  const openLink = checkout.paymentLink ?? checkout.checkoutUrl;
  const qrSource = hasImageError ? resolveGeneratedQr(checkout) : resolvePaymentQr(checkout);
  const hasQr = qrSource !== null;
  const shouldShowQr = !isMobile || showQrOnMobile;
  const scanHint =
    qrSource?.kind === "payload" && qrSource.isWebPage
      ? t.settings.planPayScanWebHint
      : t.settings.planPayScanHint.replace("{operator}", operatorName);

  const handleClose = () => onClose(checkout.intentId, statusRef.current);

  return (
    <Modal
      open
      centered
      width={420}
      footer={null}
      onCancel={handleClose}
      title={
        <Space align="center">
          <img src={operatorLogo} alt={operatorName} width={28} height={28} />
          {t.settings.planPayQrTitle.replace("{operator}", operatorName)}
        </Space>
      }
    >
      {pollState === "paid" && (
        <Result
          status="success"
          title={t.settings.planPaySuccess.replace("{plan}", checkout.planSlug)}
          extra={
            <Button type="primary" onClick={handleClose}>
              {t.common.close}
            </Button>
          }
        />
      )}

      {pollState === "failed" && (
        <Result
          status="error"
          title={t.settings.planPayFailed}
          subTitle={failureReason}
          extra={
            <Space>
              <Button onClick={handleClose}>{t.common.close}</Button>
              <Button type="primary" onClick={onRetry}>
                {t.settings.planPayRetry}
              </Button>
            </Space>
          }
        />
      )}

      {(pollState === "waiting" || pollState === "timeout") && (
        <div style={{ textAlign: "center" }}>
          <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>
            {formatAmount(checkout.amount, checkout.currency)}
          </Typography.Title>

          {isMobile && openLink && (
            <Button
              type="primary"
              size="large"
              block
              href={openLink}
              icon={<Smartphone size={18} />}
              style={{ margin: "16px 0 8px" }}
            >
              {t.settings.planPayOpenApp.replace("{operator}", operatorName)}
            </Button>
          )}

          {isMobile && hasQr && (
            <Button type="link" onClick={() => setShowQrOnMobile((v) => !v)}>
              {showQrOnMobile ? t.settings.planPayHideQr : t.settings.planPayShowQr}
            </Button>
          )}

          {shouldShowQr && qrSource && (
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

          {!isMobile && openLink && (
            <Button type="link" href={openLink} target="_blank" rel="noopener noreferrer">
              {t.settings.planPayOpenInBrowser}
            </Button>
          )}

          {pollState === "waiting" ? (
            <Space style={{ marginTop: 8 }}>
              <Spin size="small" />
              <Typography.Text type="secondary">{t.settings.planPayWaiting}</Typography.Text>
            </Space>
          ) : (
            <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
              {t.settings.planPayPending}
            </Typography.Paragraph>
          )}
        </div>
      )}
    </Modal>
  );
}
