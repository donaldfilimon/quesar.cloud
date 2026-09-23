import { createFileRoute } from "@tanstack/react-router";
import { AdminPanels } from "@/components/console/admin/admin-panels";
import { PageClose, PageHero, RouteFrame, Section } from "@/components/site";
import { RequireSession } from "@/lib/auth/gates";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Quesar" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content:
          "Reason-logged conversation audit review, telemetry summary and contact inquiries for administrators.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <RouteFrame>
      <RequireSession feature="Admin review">
        {() => (
          <>
            <PageHero
              eyebrow="Admin"
              title="Administrator review."
              lede="Conversation audits across accounts, anonymous usage counts and contact inquiries. Every audit list, read and delete requires a reason and is written to the access log."
              compact
            />
            <Section>
              <AdminPanels />
            </Section>
            <PageClose primary={{ to: "/console", label: "Console" }} />
          </>
        )}
      </RequireSession>
    </RouteFrame>
  );
}
