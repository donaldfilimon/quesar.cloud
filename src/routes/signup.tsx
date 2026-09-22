import { createFileRoute, Navigate } from "@tanstack/react-router";
import { ServerOnlyNotice } from "@/components/site/server-only-notice";
import { staticSite } from "@/lib/static-site";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — Quesar" },
      { name: "description", content: "Create a Quesar console account for field notes." },
    ],
  }),
  component: function Signup() {
    if (staticSite) return <ServerOnlyNotice feature="Sign-up" className="my-24" />;
    return <Navigate to="/login" search={{ next: "/console" }} />;
  },
});
