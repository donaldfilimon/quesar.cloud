import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — Quesar" },
      { name: "description", content: "Create a Quesar console account for field notes." },
    ],
  }),
  component: function Signup() {
    return <Navigate to="/login" search={{ next: "/console" }} />;
  },
});
