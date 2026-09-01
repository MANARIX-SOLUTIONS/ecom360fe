import type { ThemeConfig } from "antd";
import { hexToRgba, hoverFromPrimary } from "./colorUtils";

export const DEFAULT_PRIMARY = "#0f3460";
export const DEFAULT_ACCENT = "#0ea5e9";

export type ThemePalette = {
  id: string;
  primary: string;
  accent: string;
};

export const THEME_PALETTES: readonly ThemePalette[] = [
  { id: "navy", primary: DEFAULT_PRIMARY, accent: DEFAULT_ACCENT },
  { id: "forest", primary: "#166534", accent: "#10b981" },
  { id: "wine", primary: "#7f1d1d", accent: "#f43f5e" },
  { id: "slate", primary: "#334155", accent: "#6366f1" },
  { id: "ocean", primary: "#0e7490", accent: "#22d3ee" },
  { id: "amber", primary: "#92400e", accent: "#f59e0b" },
];

export type ResolvedThemeColors = {
  primary: string;
  primaryHover: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
};

export function resolveThemeColors(
  primary?: string | null,
  accent?: string | null
): ResolvedThemeColors {
  const p = primary?.trim() || DEFAULT_PRIMARY;
  const a = accent?.trim() || DEFAULT_ACCENT;
  return {
    primary: p,
    primaryHover: hoverFromPrimary(p),
    primarySoft: hexToRgba(p, 0.08),
    accent: a,
    accentSoft: hexToRgba(a, 0.12),
  };
}

export function applyThemeCssVars(
  colors: ResolvedThemeColors,
  root: HTMLElement = document.documentElement
): void {
  root.style.setProperty("--v2-primary", colors.primary);
  root.style.setProperty("--v2-primary-hover", colors.primaryHover);
  root.style.setProperty("--v2-primary-soft", colors.primarySoft);
  root.style.setProperty("--v2-accent", colors.accent);
  root.style.setProperty("--v2-accent-soft", colors.accentSoft);
}

export function clearThemeCssVars(root: HTMLElement = document.documentElement): void {
  root.style.removeProperty("--v2-primary");
  root.style.removeProperty("--v2-primary-hover");
  root.style.removeProperty("--v2-primary-soft");
  root.style.removeProperty("--v2-accent");
  root.style.removeProperty("--v2-accent-soft");
}

export function matchingPaletteId(primary?: string | null, accent?: string | null): string | null {
  const p = (primary?.trim() || DEFAULT_PRIMARY).toLowerCase();
  const a = (accent?.trim() || DEFAULT_ACCENT).toLowerCase();
  const found = THEME_PALETTES.find(
    (pal) => pal.primary.toLowerCase() === p && pal.accent.toLowerCase() === a
  );
  return found?.id ?? null;
}

export function isPlatformDefaultTheme(primary?: string | null, accent?: string | null): boolean {
  return matchingPaletteId(primary, accent) === "navy";
}

const borderRadius = 14;
const borderRadiusSM = 10;
const borderRadiusLG = 20;
const fontFamily = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';
const colorText = "#0f172a";
const colorTextSecondary = "#475569";
const colorTextMuted = "#94a3b8";
const colorBackground = "#f1f5f9";
const borderSubtle = "rgba(15, 23, 42, 0.06)";
const borderStrong = "rgba(15, 23, 42, 0.12)";
const shadowSm = "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06)";
const shadowMd = "0 4px 8px rgba(15, 23, 42, 0.04), 0 24px 48px rgba(15, 23, 42, 0.08)";

/** Ant Design tokens from primary/accent (portals inherit CSS vars too). */
export function buildAntdTheme(
  primary: string = DEFAULT_PRIMARY,
  accent: string = DEFAULT_ACCENT
): ThemeConfig {
  return {
    inherit: false,
    token: {
      colorPrimary: primary,
      colorSuccess: "#059669",
      colorWarning: "#d97706",
      colorError: "#dc2626",
      colorLink: accent,
      borderRadius,
      fontFamily,
      colorText,
      colorTextSecondary,
      colorTextTertiary: colorTextMuted,
      colorBgContainer: "#ffffff",
      colorBgLayout: colorBackground,
      colorBorder: borderStrong,
      colorBorderSecondary: borderSubtle,
      controlHeight: 44,
      fontSize: 14,
      lineHeight: 1.6,
      boxShadow: shadowSm,
      boxShadowSecondary: shadowMd,
      motionEaseOut: "cubic-bezier(0.22, 1, 0.36, 1)",
      motionDurationMid: "0.24s",
      motionDurationFast: "0.16s",
    },
    components: {
      Button: {
        controlHeight: 44,
        fontWeight: 500,
        borderRadius: borderRadiusSM,
        primaryShadow: `0 1px 3px ${hexToRgba(primary, 0.28)}`,
      },
      Input: {
        controlHeight: 44,
        borderRadius: borderRadiusSM,
        activeShadow: `0 0 0 3px ${hexToRgba(primary, 0.08)}`,
      },
      Select: {
        controlHeight: 44,
        borderRadius: borderRadiusSM,
      },
      Card: {
        borderRadiusLG,
        headerFontSize: 16,
        headerFontSizeSM: 15,
      },
      Modal: {
        borderRadiusLG,
      },
      Drawer: {
        borderRadiusLG,
      },
      Table: {
        borderRadiusLG: borderRadius,
        headerBg: colorBackground,
        headerColor: colorTextSecondary,
        headerSplitColor: borderSubtle,
        rowHoverBg: hexToRgba(primary, 0.06),
        borderColor: borderSubtle,
        cellPaddingBlock: 11,
        cellPaddingInline: 12,
        cellPaddingBlockMD: 10,
        cellPaddingInlineMD: 10,
        cellPaddingBlockSM: 8,
        cellPaddingInlineSM: 8,
      },
      Tabs: {
        itemActiveColor: primary,
        itemSelectedColor: primary,
        inkBarColor: primary,
      },
      Tag: {
        borderRadiusSM: 8,
      },
      Menu: {
        itemBorderRadius: borderRadiusSM,
        itemSelectedBg: hexToRgba(primary, 0.08),
        itemHoverBg: hexToRgba(primary, 0.05),
      },
    },
  };
}
