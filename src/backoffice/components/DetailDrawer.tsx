import type { ReactNode } from "react";
import { Drawer } from "antd";

export function DetailDrawer({
  open,
  title,
  onClose,
  children,
  extra,
}: {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <Drawer
      open={open}
      title={title}
      onClose={onClose}
      width={560}
      extra={extra}
      destroyOnHidden
      styles={{ body: { background: "var(--surface)" } }}
    >
      {children}
    </Drawer>
  );
}
