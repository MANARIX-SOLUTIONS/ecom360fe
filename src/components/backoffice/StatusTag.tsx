import { Tag } from "antd";
import { adminStatusLabel, adminStatusTone } from "@/utils/adminStatus";

type Props = {
  status: string | null | undefined;
  label?: string;
};

export function StatusTag({ status, label }: Props) {
  return <Tag color={adminStatusTone(status)}>{label ?? adminStatusLabel(status)}</Tag>;
}
