import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ConfigProvider } from "antd";
import { useBusinessProfile } from "@/contexts/BusinessProfileContext";
import {
  applyThemeCssVars,
  buildAntdTheme,
  clearThemeCssVars,
  resolveThemeColors,
} from "@/theme/businessTheme";

type Preview = { primary: string | null; accent: string | null };

type BusinessThemeContextValue = {
  previewTheme: (primary: string | null, accent: string | null) => void;
  clearPreview: () => void;
};

const BusinessThemeContext = createContext<BusinessThemeContextValue | null>(null);

export function BusinessThemeProvider({ children }: { children: ReactNode }) {
  const { profile } = useBusinessProfile();
  const [preview, setPreview] = useState<Preview | null>(null);

  const colors = useMemo(
    () =>
      resolveThemeColors(
        preview ? preview.primary : profile?.themePrimaryColor,
        preview ? preview.accent : profile?.themeAccentColor
      ),
    [preview, profile?.themePrimaryColor, profile?.themeAccentColor]
  );

  const antdTheme = useMemo(
    () => buildAntdTheme(colors.primary, colors.accent),
    [colors.primary, colors.accent]
  );

  useEffect(() => {
    applyThemeCssVars(colors);
    return () => {
      clearThemeCssVars();
    };
  }, [colors]);

  const previewTheme = useCallback((primary: string | null, accent: string | null) => {
    setPreview({ primary, accent });
  }, []);

  const clearPreview = useCallback(() => {
    setPreview(null);
  }, []);

  const value = useMemo(() => ({ previewTheme, clearPreview }), [previewTheme, clearPreview]);

  return (
    <BusinessThemeContext.Provider value={value}>
      <ConfigProvider theme={antdTheme}>{children}</ConfigProvider>
    </BusinessThemeContext.Provider>
  );
}

export function useBusinessTheme() {
  const ctx = useContext(BusinessThemeContext);
  if (!ctx) {
    throw new Error("useBusinessTheme must be used within BusinessThemeProvider");
  }
  return ctx;
}
