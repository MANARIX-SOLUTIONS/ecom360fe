import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Tour } from "antd";
import type { TourStepProps } from "antd/es/tour/interface";
import { useBusinessProfile } from "@/contexts/BusinessProfileContext";
import { t } from "@/i18n";
import {
  getOnboardingStatus,
  isWithinOnboardingWindow,
  setOnboardingStatus,
} from "@/utils/onboardingStorage";

function useDesktopBreakpoint(): boolean {
  const [wide, setWide] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 992px)").matches : true
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 992px)");
    const onChange = () => setWide(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return wide;
}

function queryTarget(selector: string): HTMLElement {
  return (document.querySelector(selector) as HTMLElement | null) ?? document.body;
}

/**
 * Guide in-app pour les entreprises récentes (fenêtre alignée sur l’essai 14 j).
 * Ant Design Tour : masque, focus, navigation clavier.
 */
export function OnboardingTour() {
  const { profile, loading } = useBusinessProfile();
  const location = useLocation();
  const isDesktop = useDesktopBreakpoint();
  const [open, setOpen] = useState(false);
  const completedRef = useRef(false);

  const eligible = useMemo(() => {
    if (loading || !profile?.id || !profile.createdAt) return false;
    if (!isWithinOnboardingWindow(profile.createdAt)) return false;
    if (getOnboardingStatus(profile.id)) return false;
    return true;
  }, [loading, profile?.id, profile?.createdAt]);

  const steps: TourStepProps[] = useMemo(() => {
    const navStep: TourStepProps = isDesktop
      ? {
          title: t.onboarding.stepNavDesktopTitle,
          description: t.onboarding.stepNavDesktopDesc,
          placement: "right",
          target: () => queryTarget('[data-onboarding="sidebar"]'),
        }
      : {
          title: t.onboarding.stepNavMobileTitle,
          description: t.onboarding.stepNavMobileDesc,
          placement: "top",
          target: () => queryTarget('[data-onboarding="bottom-nav"]'),
        };

    return [
      {
        title: t.onboarding.stepWelcomeTitle,
        description: t.onboarding.stepWelcomeDesc,
        placement: "center",
        target: null,
      },
      {
        title: t.onboarding.stepStoreTitle,
        description: t.onboarding.stepStoreDesc,
        placement: "bottom",
        target: () => queryTarget('[data-onboarding="store-switcher"]'),
      },
      navStep,
      {
        title: t.onboarding.stepNotificationsTitle,
        description: t.onboarding.stepNotificationsDesc,
        placement: "bottomLeft",
        target: () => queryTarget('[data-onboarding="notifications"]'),
      },
      {
        title: t.onboarding.stepFinishTitle,
        description: t.onboarding.stepFinishDesc,
        placement: "center",
        target: null,
      },
    ];
  }, [isDesktop]);

  useEffect(() => {
    if (!eligible || location.pathname !== "/dashboard") return;
    const timer = window.setTimeout(() => setOpen(true), 480);
    return () => window.clearTimeout(timer);
  }, [eligible, location.pathname]);

  const businessId = profile?.id;

  const handleFinish = useCallback(() => {
    completedRef.current = true;
    if (businessId) setOnboardingStatus(businessId, "done");
  }, [businessId]);

  /** `onClose` est aussi appelé avant `onFinish` lors du dernier clic — éviter d’écraser « done » avec « skipped ». */
  const handleClose = useCallback(() => {
    setOpen(false);
    queueMicrotask(() => {
      if (businessId && !completedRef.current) {
        setOnboardingStatus(businessId, "skipped");
      }
    });
  }, [businessId]);

  if (!eligible) return null;

  return (
    <Tour
      open={open}
      onClose={handleClose}
      onFinish={handleFinish}
      steps={steps}
      zIndex={1100}
      type="primary"
      mask={{
        color: "rgba(15, 23, 42, 0.45)",
      }}
    />
  );
}
