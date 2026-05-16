/**
 * 360 PME Commerce — Design tokens V2 (ecom360V2)
 * Primary navy profond | Accent cyan | Sémantique calibrée premium
 */
export const tokens = {
  color: {
    primary: "#0f3460",
    primaryHover: "#143d72",
    accent: "#0ea5e9",
    success: "#059669",
    warning: "#d97706",
    danger: "#dc2626",
    background: "#f1f5f9",
    text: "#0f172a",
    textSecondary: "#475569",
    textMuted: "#94a3b8",
    borderSubtle: "rgba(15, 23, 42, 0.06)",
    borderStrong: "rgba(15, 23, 42, 0.12)",
  },
  spacing: 8,
  borderRadius: 14,
  borderRadiusSM: 10,
  borderRadiusLG: 20,
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  fontFamilyDisplay: '"Plus Jakarta Sans", "Inter", sans-serif',
  shadowSm: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06)",
  shadowMd: "0 4px 8px rgba(15, 23, 42, 0.04), 0 24px 48px rgba(15, 23, 42, 0.08)",
} as const;

export const antdTheme = {
  token: {
    colorPrimary: tokens.color.primary,
    colorSuccess: tokens.color.success,
    colorWarning: tokens.color.warning,
    colorError: tokens.color.danger,
    colorLink: tokens.color.accent,
    borderRadius: tokens.borderRadius,
    fontFamily: tokens.fontFamily,
    colorText: tokens.color.text,
    colorTextSecondary: tokens.color.textSecondary,
    colorTextTertiary: tokens.color.textMuted,
    colorBgContainer: "#ffffff",
    colorBgLayout: tokens.color.background,
    colorBorder: tokens.color.borderStrong,
    colorBorderSecondary: tokens.color.borderSubtle,
    controlHeight: 44,
    fontSize: 14,
    lineHeight: 1.6,
    boxShadow: tokens.shadowSm,
    boxShadowSecondary: tokens.shadowMd,
    motionEaseOut: "cubic-bezier(0.22, 1, 0.36, 1)",
    motionDurationMid: "0.24s",
    motionDurationFast: "0.16s",
  },
  components: {
    Button: {
      controlHeight: 44,
      fontWeight: 500,
      borderRadius: tokens.borderRadiusSM,
      primaryShadow: "0 1px 3px rgba(15, 52, 96, 0.28)",
    },
    Input: {
      controlHeight: 44,
      borderRadius: tokens.borderRadiusSM,
      activeShadow: "0 0 0 3px rgba(15, 52, 96, 0.08)",
    },
    Select: {
      controlHeight: 44,
      borderRadius: tokens.borderRadiusSM,
    },
    Card: {
      borderRadiusLG: tokens.borderRadiusLG,
      headerFontSize: 16,
      headerFontSizeSM: 15,
    },
    Modal: {
      borderRadiusLG: tokens.borderRadiusLG,
    },
    Drawer: {
      borderRadiusLG: tokens.borderRadiusLG,
    },
    Table: {
      borderRadiusLG: tokens.borderRadius,
      headerBg: tokens.color.background,
      headerColor: tokens.color.textSecondary,
      headerSplitColor: tokens.color.borderSubtle,
      rowHoverBg: "rgba(15, 52, 96, 0.06)",
      borderColor: tokens.color.borderSubtle,
      cellPaddingBlock: 11,
      cellPaddingInline: 12,
      cellPaddingBlockMD: 10,
      cellPaddingInlineMD: 10,
      cellPaddingBlockSM: 8,
      cellPaddingInlineSM: 8,
    },
    Tabs: {
      itemActiveColor: tokens.color.primary,
      itemSelectedColor: tokens.color.primary,
      inkBarColor: tokens.color.primary,
    },
    Tag: {
      borderRadiusSM: 8,
    },
    Menu: {
      itemBorderRadius: tokens.borderRadiusSM,
      itemSelectedBg: "rgba(15, 52, 96, 0.08)",
      itemHoverBg: "rgba(15, 52, 96, 0.05)",
    },
  },
};
