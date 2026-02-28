import { InputNumber, Space } from "antd";
import type { InputNumberProps } from "antd";

const addonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "0 11px",
  minHeight: 44,
  backgroundColor: "rgba(0,0,0,0.02)",
  border: "1px solid #d9d9d9",
  borderLeft: "none",
  borderRadius: "0 10px 10px 0",
  fontSize: 14,
  color: "rgba(0,0,0,0.65)",
};

export function CurrencyInput(props: InputNumberProps) {
  const { style, ...rest } = props;
  return (
    <Space.Compact block style={style}>
      <InputNumber {...rest} style={{ flex: 1 }} />
      <span style={addonStyle}>F</span>
    </Space.Compact>
  );
}
