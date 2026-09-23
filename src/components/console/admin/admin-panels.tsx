import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Surface } from "@/components/site";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAdminStatus, type AdminStatus } from "@/lib/console";
import { unexpected } from "../format";
import { AuditReview } from "./audit-review";
import { InquiriesList } from "./inquiries-list";
import { TelemetrySummaryPanel } from "./telemetry-summary";

const REFUSAL: Record<Extract<AdminStatus, { admin: false }>["reason"], string> = {
  no_allowlist:
    "No administrators are configured in this environment (ADMIN_EMAILS is empty), so nobody can open /admin.",
  not_admin:
    "This account is not an administrator. Email/password sign-up sends no verification mail, so an allowlisted address alone proves nothing.",
};

/** Admin gate: shows the panels only when the server says this user is an admin. */
export function AdminPanels() {
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminStatus().then(setStatus, (cause) =>
      setError(unexpected("Administrator access could not be checked right now.", cause)),
    );
  }, []);

  if (error) {
    return (
      <p role="alert" className="text-sm text-status-partial">
        {error}
      </p>
    );
  }
  if (!status) return <p className="text-sm text-fg-muted">Checking administrator access…</p>;

  if (!status.admin) {
    return (
      <Surface className="max-w-2xl">
        <p className="text-xs text-accent">
          Not an admin
        </p>
        <p className="mt-3 text-sm text-fg">{REFUSAL[status.reason]}</p>
        <p className="mt-3 text-sm text-fg-muted">
          Administrator access needs both: an email on the{" "}
          <code className="font-mono text-xs">ADMIN_EMAILS</code> allowlist, and a Google or X
          linked Google or Apple account. Every admin read and delete is reason-logged.
        </p>
        <Link to="/console" className="mt-4 inline-flex min-h-11 items-center text-sm text-accent">
          Back to the console
        </Link>
      </Surface>
    );
  }

  return (
    <Tabs defaultValue="audits">
      <TabsList aria-label="Admin sections" className="mb-8 px-0">
        <TabsTrigger value="audits">Audit review</TabsTrigger>
        <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
        <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
      </TabsList>
      <TabsContent value="audits">
        <AuditReview />
      </TabsContent>
      <TabsContent value="telemetry">
        <TelemetrySummaryPanel />
      </TabsContent>
      <TabsContent value="inquiries">
        <InquiriesList />
      </TabsContent>
    </Tabs>
  );
}
