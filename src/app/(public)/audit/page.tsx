"use client";

import { AppProvider } from "@/components/providers";
import { AuditPageView } from "@/components/audit/audit-page";

export default function PublicAuditPage() {
  return (
    <AppProvider>
      <AuditPageView />
    </AppProvider>
  );
}
