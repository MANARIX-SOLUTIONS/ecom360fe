/**
 * Ecom360 PME V2 — merchant design tokens.
 * Navy-and-neutral system for African commerce SaaS.
 */
export const tokens = {
  color: {
    primary: "#1D3557",
    primaryHover: "#315B91",
    deep: "#142640",
    accent: "#315B91",
    info: "#4389C5",
    success: "#23865B",
    warning: "#C9852D",
    danger: "#D14343",
    background: "#F5F7FA",
    surface: "#FFFFFF",
    text: "#182230",
    textSecondary: "#687588",
    textMuted: "#8B95A5",
    border: "#E4E9F0",
    borderSubtle: "#E4E9F0",
    borderStrong: "#D5DCE6",
  },
  spacing: 8,
  borderRadius: 14,
  borderRadiusSM: 10,
  borderRadiusLG: 16,
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  fontFamilyDisplay: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  shadowSm: "0 1px 2px rgba(24, 34, 48, 0.04), 0 6px 16px rgba(24, 34, 48, 0.05)",
  shadowMd: "0 4px 8px rgba(24, 34, 48, 0.04), 0 16px 32px rgba(24, 34, 48, 0.07)",
} as const;

export const antdTheme = {
  token: {
    colorPrimary: tokens.color.primary,
    colorInfo: tokens.color.info,
    colorSuccess: tokens.color.success,
    colorWarning: tokens.color.warning,
    colorError: tokens.color.danger,
    colorLink: tokens.color.accent,
    borderRadius: tokens.borderRadius,
    fontFamily: tokens.fontFamily,
    colorText: tokens.color.text,
    colorTextSecondary: tokens.color.textSecondary,
    colorTextTertiary: tokens.color.textMuted,
    colorBgContainer: tokens.color.surface,
    colorBgLayout: tokens.color.background,
    colorBorder: tokens.color.border,
    colorBorderSecondary: tokens.color.borderSubtle,
    controlHeight: 42,
    fontSize: 14,
    lineHeight: 1.55,
    boxShadow: tokens.shadowSm,
    boxShadowSecondary: tokens.shadowMd,
    motionEaseOut: "cubic-bezier(0.22, 1, 0.36, 1)",
    motionDurationMid: "0.2s",
    motionDurationFast: "0.14s",
  },
  components: {
    Button: {
      controlHeight: 42,
      fontWeight: 500,
      borderRadius: tokens.borderRadiusSM,
      primaryShadow: "0 1px 3px rgba(29, 53, 87, 0.22)",
    },
    Input: {
      controlHeight: 42,
      borderRadius: tokens.borderRadiusSM,
      activeShadow: "0 0 0 3px rgba(49, 91, 145, 0.12)",
    },
    Select: {
      controlHeight: 42,
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
      rowHoverBg: "rgba(29, 53, 87, 0.04)",
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
      itemSelectedBg: "rgba(29, 53, 87, 0.08)",
      itemHoverBg: "rgba(29, 53, 87, 0.045)",
      itemSelectedColor: tokens.color.primary,
      itemColor: tokens.color.text,
      groupTitleColor: tokens.color.textMuted,
    },
  },
};

/** Console d'administration — jetons distincts du thème marchand. */
export const adminTokens = {
  color: {
    primary: "#183153",
    primaryHover: "#1f3f68",
    accent: "#429BD1",
    success: "#23865B",
    warning: "#C9852D",
    danger: "#D14343",
    background: "#F5F7FA",
    surface: "#FFFFFF",
    text: "#172033",
    textSecondary: "#5b6578",
    textMuted: "#8993A5",
    border: "#E4E8EF",
  },
} as const;

export const adminAntdTheme = {
  ...antdTheme,
  token: {
    ...antdTheme.token,
    colorPrimary: adminTokens.color.primary,
    colorLink: adminTokens.color.accent,
    colorText: adminTokens.color.text,
    colorTextSecondary: adminTokens.color.textSecondary,
    colorTextTertiary: adminTokens.color.textMuted,
    colorBgLayout: adminTokens.color.background,
    colorBorder: adminTokens.color.border,
    colorBorderSecondary: adminTokens.color.border,
    controlHeight: 40,
    borderRadius: 10,
  },
  components: {
    ...antdTheme.components,
    Button: {
      ...antdTheme.components.Button,
      controlHeight: 40,
      borderRadius: 10,
      primaryShadow: "0 1px 3px rgba(24, 49, 83, 0.22)",
    },
    Input: {
      ...antdTheme.components.Input,
      controlHeight: 40,
      borderRadius: 10,
      activeShadow: "0 0 0 3px rgba(66, 155, 209, 0.16)",
    },
    Select: {
      ...antdTheme.components.Select,
      controlHeight: 40,
      borderRadius: 10,
    },
    Table: {
      ...antdTheme.components.Table,
      headerBg: adminTokens.color.background,
      headerColor: adminTokens.color.textSecondary,
      rowHoverBg: "rgba(24, 49, 83, 0.04)",
      borderColor: adminTokens.color.border,
      cellPaddingBlock: 12,
      cellPaddingInline: 14,
    },
    Menu: {
      itemBorderRadius: 10,
      itemSelectedBg: "rgba(220, 38, 38, 0.06)",
      itemHoverBg: "rgba(24, 49, 83, 0.04)",
    },
  },
};
