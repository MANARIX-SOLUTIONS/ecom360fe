import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, Card, ColorPicker, Space, Typography, message } from "antd";
import { t } from "@/i18n";
import { updateBusinessTheme } from "@/api";
import { useBusinessTheme } from "@/contexts/BusinessThemeContext";
import {
  DEFAULT_ACCENT,
  DEFAULT_PRIMARY,
  THEME_PALETTES,
  isPlatformDefaultTheme,
  matchingPaletteId,
} from "@/theme/businessTheme";
import { MIN_PRIMARY_CONTRAST_WHITE, contrastAgainstWhite, parseHex } from "@/theme/colorUtils";
import styles from "./Settings.module.css";

type SettingsThemeCardProps = {
  canEdit: boolean;
  canCustomBranding: boolean;
  savedPrimary: string | null;
  savedAccent: string | null;
  onSaved: (primary: string | null, accent: string | null) => void;
};

function toHex7(value: string): string {
  const hex = value.startsWith("#") ? value : `#${value}`;
  return hex.slice(0, 7).toLowerCase();
}

export function SettingsThemeCard({
  canEdit,
  canCustomBranding,
  savedPrimary,
  savedAccent,
  onSaved,
}: SettingsThemeCardProps) {
  const { previewTheme, clearPreview } = useBusinessTheme();
  const [draftPrimary, setDraftPrimary] = useState(savedPrimary?.trim() || DEFAULT_PRIMARY);
  const [draftAccent, setDraftAccent] = useState(savedAccent?.trim() || DEFAULT_ACCENT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraftPrimary(savedPrimary?.trim() || DEFAULT_PRIMARY);
    setDraftAccent(savedAccent?.trim() || DEFAULT_ACCENT);
  }, [savedPrimary, savedAccent]);

  useEffect(() => {
    if (!canEdit || !canCustomBranding) {
      return;
    }
    previewTheme(draftPrimary, draftAccent);
    return () => {
      clearPreview();
    };
  }, [canEdit, canCustomBranding, draftPrimary, draftAccent, previewTheme, clearPreview]);

  const selectedPalette = matchingPaletteId(draftPrimary, draftAccent);
  const savedIsDefault = isPlatformDefaultTheme(savedPrimary, savedAccent);
  const draftIsDefault = isPlatformDefaultTheme(draftPrimary, draftAccent);
  const isDirty =
    draftPrimary.toLowerCase() !== (savedPrimary?.trim() || DEFAULT_PRIMARY).toLowerCase() ||
    draftAccent.toLowerCase() !== (savedAccent?.trim() || DEFAULT_ACCENT).toLowerCase();

  const persist = async (primary: string | null, accent: string | null, successMessage: string) => {
    setSaving(true);
    try {
      const updated = await updateBusinessTheme({
        themePrimaryColor: primary,
        themeAccentColor: accent,
      });
      onSaved(updated.themePrimaryColor ?? null, updated.themeAccentColor ?? null);
      clearPreview();
      message.success(successMessage);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t.common.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  const onSave = async () => {
    if (!parseHex(draftPrimary) || !parseHex(draftAccent)) {
      message.error(t.settings.themeInvalidHex);
      return;
    }
    const contrast = contrastAgainstWhite(draftPrimary);
    if (contrast !== null && contrast < MIN_PRIMARY_CONTRAST_WHITE) {
      message.error(t.settings.themeContrastError);
      return;
    }
    if (draftIsDefault) {
      await persist(null, null, t.settings.themeSaved);
      return;
    }
    await persist(draftPrimary.toLowerCase(), draftAccent.toLowerCase(), t.settings.themeSaved);
  };

  const onReset = async () => {
    setDraftPrimary(DEFAULT_PRIMARY);
    setDraftAccent(DEFAULT_ACCENT);
    await persist(null, null, t.settings.themeReset);
  };

  const paletteLabels = t.settings.themePalette;

  return (
    <Card variant="borderless" className={styles.settingsCard} style={{ marginTop: 16 }}>
      <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
        {t.settings.themeSection}
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16, fontSize: 13 }}>
        {t.settings.themeHint}
      </Typography.Paragraph>

      {canEdit && !canCustomBranding && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <span>
              {t.settings.themeUpgradeHint}{" "}
              <Link to="/settings/subscription">{t.settings.viewPlans}</Link>
            </span>
          }
        />
      )}

      {canEdit && canCustomBranding ? (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div
            className={styles.themePaletteGrid}
            role="radiogroup"
            aria-label={t.settings.themeSection}
          >
            {THEME_PALETTES.map((pal) => {
              const label = paletteLabels[pal.id as keyof typeof paletteLabels] ?? pal.id;
              const selected = selectedPalette === pal.id;
              return (
                <button
                  key={pal.id}
                  type="button"
                  role="radio"
                  className={
                    selected
                      ? `${styles.themePaletteBtn} ${styles.themePaletteBtnSelected}`
                      : styles.themePaletteBtn
                  }
                  aria-checked={selected}
                  aria-label={label}
                  disabled={saving}
                  onClick={() => {
                    setDraftPrimary(pal.primary);
                    setDraftAccent(pal.accent);
                  }}
                >
                  <span className={styles.themePaletteSwatches}>
                    <span
                      className={styles.themePaletteSwatch}
                      style={{ background: pal.primary }}
                    />
                    <span
                      className={styles.themePaletteSwatch}
                      style={{ background: pal.accent }}
                    />
                  </span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <div className={styles.themeColorRow}>
            <Typography.Text>{t.settings.themePrimary}</Typography.Text>
            <ColorPicker
              value={draftPrimary}
              disabledAlpha
              disabled={saving}
              onChange={(color) => setDraftPrimary(toHex7(color.toHexString()))}
              aria-label={t.settings.themePrimary}
            />
          </div>
          <div className={styles.themeColorRow}>
            <Typography.Text>{t.settings.themeAccent}</Typography.Text>
            <ColorPicker
              value={draftAccent}
              disabledAlpha
              disabled={saving}
              onChange={(color) => setDraftAccent(toHex7(color.toHexString()))}
              aria-label={t.settings.themeAccent}
            />
          </div>

          <Space wrap>
            <Button
              type="primary"
              loading={saving}
              disabled={!isDirty}
              onClick={() => void onSave()}
            >
              {t.common.save}
            </Button>
            <Button disabled={saving || savedIsDefault} onClick={() => void onReset()}>
              {t.settings.themeResetAction}
            </Button>
          </Space>
        </Space>
      ) : (
        <div className={styles.themePaletteSwatches} style={{ maxWidth: 160 }}>
          <span
            className={styles.themePaletteSwatch}
            style={{ background: savedPrimary?.trim() || DEFAULT_PRIMARY }}
          />
          <span
            className={styles.themePaletteSwatch}
            style={{ background: savedAccent?.trim() || DEFAULT_ACCENT }}
          />
        </div>
      )}
    </Card>
  );
}
