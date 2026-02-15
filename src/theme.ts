/**
 * 360 PME Commerce – Design tokens
 * Primary: Vibrant Navy #1B4D7A | Accent: Teal #0891B2
 * Success: #10B981 | Warning: #F59E0B | Danger: #EF4444
 * Background: #F8FAFC | Text: #1E293B
 */
export const tokens = {
  color: {
    primary: '#1B4D7A',
    accent: '#0891B2',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    background: '#F8FAFC',
    text: '#1E293B',
    textSecondary: '#64748B',
  },
  spacing: 8,
  borderRadius: 12,
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
} as const

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
    colorBgContainer: '#FFFFFF',
    colorBgLayout: tokens.color.background,
    controlHeight: 44,
    fontSize: 14,
    lineHeight: 1.6,
    // Modern shadows
    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
    boxShadowSecondary: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
  },
  components: {
    Button: {
      controlHeight: 44,
      fontWeight: 500,
      borderRadius: 10,
    },
    Input: {
      controlHeight: 44,
      borderRadius: 10,
    },
    Select: {
      controlHeight: 44,
      borderRadius: 10,
    },
    Card: {
      borderRadiusLG: 14,
    },
    Modal: {
      borderRadiusLG: 16,
    },
    Table: {
      borderRadiusLG: 12,
    },
    Tabs: {
      itemActiveColor: tokens.color.primary,
      itemSelectedColor: tokens.color.primary,
    },
    Tag: {
      borderRadiusSM: 6,
    },
  },
}
