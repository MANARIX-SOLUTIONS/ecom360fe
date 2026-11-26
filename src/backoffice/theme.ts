import { theme as antdTheme, type ThemeConfig } from "antd";

const fontFamily = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';

const shared: ThemeConfig = {
  token: {
    colorSuccess: "#059669",
    colorWarning: "#D97706",
    colorError: "#DC2626",
    colorInfo: "#0284C7",
    fontFamily,
    fontSize: 14,
    borderRadius: 8,
    borderRadiusLG: 10,
    controlHeight: 36,
    lineHeight: 1.45,
    motionDurationMid: "0.18s",
    motionDurationFast: "0.15s",
    motionEaseOut: "cubic-bezier(0.16, 1, 0.3, 1)",
    boxShadow: "0 1px 2px rgba(15, 23, 41, 0.04)",
    boxShadowSecondary: "0 12px 32px -8px rgba(15, 23, 41, 0.18)",
  },
  components: {
    Button: {
      primaryShadow: "none",
      defaultShadow: "none",
      dangerShadow: "none",
      borderRadius: 8,
      fontWeight: 550,
    },
    Input: { borderRadius: 8, activeShadow: "0 0 0 3px rgba(79, 70, 229, 0.18)" },
    Select: { borderRadius: 8 },
    DatePicker: { borderRadius: 8 },
    Card: { borderRadiusLG: 10 },
    Modal: { borderRadiusLG: 12 },
    Drawer: { borderRadiusLG: 12 },
    Table: {
      headerBorderRadius: 0,
      cellFontSize: 13,
      cellPaddingBlock: 16,
      cellPaddingInline: 12,
    },
  },
};

export const backofficeLightTheme: ThemeConfig = {
  ...shared,
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    ...shared.token,
    colorPrimary: "#4F46E5",
    colorPrimaryHover: "#4338CA",
    colorLink: "#4F46E5",
    colorText: "#0F1729",
    colorTextSecondary: "#475266",
    colorTextTertiary: "#8590A6",
    colorBgLayout: "#F7F8FA",
    colorBgContainer: "#FFFFFF",
    colorBgElevated: "#FFFFFF",
    colorBorder: "#E4E7EE",
    colorBorderSecondary: "#E4E7EE",
  },
  components: {
    ...shared.components,
    Table: {
      ...shared.components?.Table,
      headerBg: "#F1F3F7",
      headerColor: "#475266",
      rowHoverBg: "#F4F5FB",
      borderColor: "#E4E7EE",
    },
    Menu: {
      itemSelectedColor: "#4F46E5",
      itemSelectedBg: "#EEF0FF",
      itemHoverBg: "#F4F5FB",
    },
  },
};

export const backofficeDarkTheme: ThemeConfig = {
  ...shared,
  algorithm: antdTheme.darkAlgorithm,
  token: {
    ...shared.token,
    colorPrimary: "#7C83FF",
    colorPrimaryHover: "#959BFF",
    colorLink: "#959BFF",
    colorText: "#EEF1F7",
    colorTextSecondary: "#B4BDD0",
    colorTextTertiary: "#7A859C",
    colorBgLayout: "#0A0F1C",
    colorBgContainer: "#111827",
    colorBgElevated: "#162033",
    colorBorder: "#232E44",
    colorBorderSecondary: "#232E44",
    colorSuccess: "#34D399",
    colorWarning: "#FBBF24",
    colorError: "#F87171",
    colorInfo: "#38BDF8",
  },
  components: {
    ...shared.components,
    Button: {
      ...shared.components?.Button,
      primaryColor: "#0A0F1C",
    },
    Table: {
      ...shared.components?.Table,
      headerBg: "#162033",
      headerColor: "#B4BDD0",
      rowHoverBg: "#1A2438",
      borderColor: "#232E44",
    },
    Menu: {
      itemSelectedColor: "#959BFF",
      itemSelectedBg: "#1E2347",
      itemHoverBg: "#1A2438",
    },
  },
};

export function backofficeTheme(
  mode: "light" | "dark",
  density: "comfortable" | "compact"
): ThemeConfig {
  const base = mode === "dark" ? backofficeDarkTheme : backofficeLightTheme;
  return {
    ...base,
    components: {
      ...base.components,
      Table: {
        ...base.components?.Table,
        cellPaddingBlock: density === "compact" ? 10 : 16,
      },
    },
  };
}
