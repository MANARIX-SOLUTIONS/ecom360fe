import type { ReactNode } from "react";
import { Drawer } from "antd";

type Props = {
  title: ReactNode;
  open: boolean;
  onClose: () => void;
  extra?: ReactNode;
  children: ReactNode;
  width?: number | string;
};

export function DetailsDrawer({
  title,
  open,
  onClose,
  extra,
  children,
  width = "min(640px, 100vw)",
}: Props) {
  return (
    <Drawer
      title={title}
      open={open}
      onClose={onClose}
      extra={extra}
      width={width}
      destroyOnClose
      styles={{ body: { paddingBottom: 32 } }}
    >
      {children}
    </Drawer>
  );
}
