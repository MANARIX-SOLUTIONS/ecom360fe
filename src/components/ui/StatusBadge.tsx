import { Tag } from "antd";

type Status = "success" | "warning" | "danger" | "default";

/**
 * 360 PME – Badge for stock, balance, status.
 * Success (green), Warning (orange), Danger (red).
 */
export function StatusBadge({ status, children }: { status: Status; children: React.ReactNode }) {
  return <Tag color={status === "default" ? undefined : status}>{children}</Tag>;
}
