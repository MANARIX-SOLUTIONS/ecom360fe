import { BackofficePreferencesProvider } from "@/backoffice/preferences";
import { BackofficeShell } from "@/backoffice/shell/BackofficeShell";

export default function BackofficeLayout() {
  return (
    <BackofficePreferencesProvider>
      <BackofficeShell />
    </BackofficePreferencesProvider>
  );
}
