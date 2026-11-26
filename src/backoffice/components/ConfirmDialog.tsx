import { useEffect, useState } from "react";
import { Button, Input, Modal } from "antd";
import { useBackofficeI18n } from "../useBackofficePreferences";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  expectedName,
  requireReason = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  expectedName?: string;
  requireReason?: boolean;
  loading?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const { t } = useBackofficeI18n();
  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) {
      setTyped("");
      setReason("");
    }
  }, [open]);

  const nameOk = !expectedName || typed.trim() === expectedName.trim();
  const reasonOk = !requireReason || reason.trim().length > 0;
  return (
    <Modal
      open={open}
      title={title}
      onCancel={onCancel}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {t.confirm.cancel}
        </Button>,
        <Button
          key="ok"
          type="primary"
          danger={destructive}
          loading={loading}
          disabled={!nameOk || !reasonOk}
          onClick={() => onConfirm(reason.trim())}
        >
          {confirmLabel}
        </Button>,
      ]}
    >
      {description ? (
        <p style={{ marginTop: 0, color: "var(--text-muted)" }}>{description}</p>
      ) : null}
      {expectedName ? (
        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ display: "block", marginBottom: 6 }}>
            {t.confirm.typeName.replace("{name}", expectedName)}
          </span>
          <Input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
          />
        </label>
      ) : null}
      {requireReason ? (
        <label style={{ display: "block" }}>
          <span style={{ display: "block", marginBottom: 6 }}>{t.confirm.reason}</span>
          <Input.TextArea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t.confirm.reasonPlaceholder}
            rows={3}
          />
        </label>
      ) : null}
    </Modal>
  );
}
