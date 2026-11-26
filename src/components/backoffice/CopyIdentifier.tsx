import { Button, Tooltip, Typography, message } from "antd";
import { Copy } from "lucide-react";
import styles from "./backofficeUi.module.css";

type Props = {
  value: string | null | undefined;
  label?: string;
  /** Short label shown in the cell. The full value is copied and shown in the tooltip. */
  preview?: string;
};

export function CopyIdentifier({ value, label, preview }: Props) {
  if (!value) {
    return <Typography.Text type="secondary">—</Typography.Text>;
  }
  const shown = preview ?? value;
  return (
    <span className={styles.copyId}>
      <Tooltip title={value}>
        <Typography.Text code className={styles.copyIdValue}>
          {shown}
        </Typography.Text>
      </Tooltip>
      <Button
        type="text"
        size="small"
        aria-label={label ? `Copier ${label}` : "Copier l'identifiant"}
        icon={<Copy size={14} />}
        onClick={async (event) => {
          event.stopPropagation();
          await navigator.clipboard.writeText(value);
          message.success("Identifiant copié.");
        }}
      />
    </span>
  );
}
