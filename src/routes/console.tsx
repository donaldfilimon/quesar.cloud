import { createFileRoute, Outlet, useChildMatches, useNavigate } from "@tanstack/react-router";
import { JourneyRail, PageClose, PageHero, RouteFrame, Section } from "@/components/site";
import { AuditsPanel } from "@/components/console/audits-panel";
import { ChatPanel } from "@/components/console/chat-panel";
import { NotesPanel } from "@/components/console/notes-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequireSession } from "@/lib/auth/gates";
import { architectureNodes } from "@/lib/content";

const TABS = ["notes", "chat", "audits"] as const;
type ConsoleTab = (typeof TABS)[number];

function parseNode(value: unknown) {
  return typeof value === "string" && architectureNodes.some((node) => node.id === value)
    ? value
    : undefined;
}

function parseTab(value: unknown): ConsoleTab | undefined {
  return typeof value === "string" && (TABS as readonly string[]).includes(value)
    ? (value as ConsoleTab)
    : undefined;
}

type ConsoleSearch = { node?: string; tab?: ConsoleTab };

export const Route = createFileRoute("/console")({
  validateSearch: (search: Record<string, unknown>): ConsoleSearch => {
    const node = parseNode(search.node);
    const tab = parseTab(search.tab);
    return { ...(node ? { node } : {}), ...(tab && tab !== "notes" ? { tab } : {}) };
  },
  head: () => ({
    meta: [
      { title: "Console — Quesar" },
      {
        name: "description",
        content:
          "Private field notes, audited model chat and your encrypted conversation audits, scoped to your account.",
      },
    ],
  }),
  component: ConsolePage,
});

function ConsolePage() {
  // `/console/workspace` is a child route: render it instead of the tabs.
  const children = useChildMatches();
  if (children.length > 0) return <Outlet />;
  return <ConsoleTabs />;
}

function ConsoleTabs() {
  const { node, tab = "notes" } = Route.useSearch();
  const navigate = useNavigate({ from: "/console" });
  const selectTab = (next: ConsoleTab) =>
    void navigate({ search: (prev) => ({ ...prev, tab: next === "notes" ? undefined : next }) });
  return (
    <RouteFrame>
      <RequireSession>
        {(user) => (
          <>
            <PageHero
              eyebrow="Console"
              title={`Console for ${user.displayName ?? user.primaryEmail ?? "operator"}.`}
              lede="Field notes, audited model chat and your encrypted conversation audits, all scoped to your account server-side. This is not Abbey memory and not a hosted WDBX store."
            />
            <JourneyRail current="console" />
            <Section>
              <Tabs value={tab} onValueChange={(value) => selectTab(parseTab(value) ?? "notes")}>
                <TabsList aria-label="Console sections" className="mb-8 px-0">
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                  <TabsTrigger value="chat">Chat</TabsTrigger>
                  <TabsTrigger value="audits">My audits</TabsTrigger>
                </TabsList>
                <TabsContent value="notes">
                  <NotesPanel initialNode={node} />
                </TabsContent>
                <TabsContent value="chat">
                  <ChatPanel onOpenAudits={() => selectTab("audits")} />
                </TabsContent>
                <TabsContent value="audits">
                  <AuditsPanel />
                </TabsContent>
              </Tabs>
            </Section>
            <PageClose
              primary={{ to: "/architecture", label: "Architecture" }}
              secondary={[
                { to: "/console/workspace", label: "Workspace" },
                { to: "/admin", label: "Admin" },
              ]}
              next={[
                {
                  to: "/profile",
                  label: "Profile",
                  body: "Account, sign-out, and where notes live.",
                },
              ]}
            />
          </>
        )}
      </RequireSession>
    </RouteFrame>
  );
}
