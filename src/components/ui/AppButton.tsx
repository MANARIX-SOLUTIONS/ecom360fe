import { Button } from "antd";

/** 360 PME – Use Ant Design Button with type="primary" | default | danger for Primary / Secondary / Danger. Tap targets ≥44px via global CSS. */

export function AppButton(props: React.ComponentProps<typeof Button>) {
  return <Button {...props} />;
}
