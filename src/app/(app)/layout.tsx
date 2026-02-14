import { AppProvider } from "@/components/providers";
import { AppShell } from "@/components/layout/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <AppShell>
        {children}
      </AppShell>
    </AppProvider>
  );
}
