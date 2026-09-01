import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export function PageShell({ children, className }: Props) {
  const classes = className ? `pageWrapper ${className}` : "pageWrapper";
  return <div className={classes}>{children}</div>;
}
