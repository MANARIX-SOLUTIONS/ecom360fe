/**
 * 360 PME Commerce — Design tokens V2 (ecom360V2)
 * Primary navy profond | Accent cyan | Sémantique calibrée premium
 */
import { buildAntdTheme } from "./theme/businessTheme";

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

export const antdTheme = buildAntdTheme();
