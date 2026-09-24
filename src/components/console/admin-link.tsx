import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAdminStatus } from "@/lib/console";

/**
 * Entry point to /admin, shown only when the server says this user is an
 * admin (allowlist + a linked Google or Apple account). Renders nothing otherwise, so
 * the console never advertises who can administer it.
 */
export function AdminLink() {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    let live = true;
    getAdminStatus().then(
      (status) => {
        if (live) setAdmin(status.admin);
      },
      () => {
        if (live) setAdmin(false);
      },
    );
    return () => {
      live = false;
    };
  }, []);
  if (!admin) return null;
  return (
    <div className="mb-6 flex justify-end">
      <Link
        to="/admin"
        className="inline-flex h-9 items-center rounded-md bg-bg-elevated px-3 text-sm text-fg no-underline shadow-border hover:text-accent"
      >
        Admin review
      </Link>
    </div>
  );
}
