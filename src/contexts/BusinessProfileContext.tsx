import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getBusinessProfile, type BusinessProfile } from "@/api/business";

type BusinessProfileContextValue = {
  profile: BusinessProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const BusinessProfileContext = createContext<BusinessProfileContextValue | null>(null);

export function BusinessProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!localStorage.getItem("ecom360_access_token")) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const p = await getBusinessProfile();
      setProfile(p);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      profile,
      loading,
      refresh,
    }),
    [profile, loading, refresh]
  );

  return (
    <BusinessProfileContext.Provider value={value}>{children}</BusinessProfileContext.Provider>
  );
}

export function useBusinessProfile() {
  const ctx = useContext(BusinessProfileContext);
  if (!ctx) {
    throw new Error("useBusinessProfile must be used within BusinessProfileProvider");
  }
  return ctx;
}
