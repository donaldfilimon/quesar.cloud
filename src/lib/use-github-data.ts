import { useEffect, useSyncExternalStore } from "react";
import { loadGithubData, type GithubPayload } from "./github";

const initial: { data: GithubPayload | null; loading: boolean } = { data: null, loading: true };
let snapshot = initial;
let active: Promise<void> | undefined;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const publish = (next: typeof initial) => {
  snapshot = next;
  listeners.forEach((listener) => listener());
};

function refreshGithub(force = true): Promise<void> {
  if (active) return active;
  publish({ ...snapshot, loading: true });
  active = loadGithubData(force)
    .then((data) => publish({ data, loading: false }))
    .catch(() => {
      const previous = snapshot.data;
      const data: GithubPayload | null = previous
        ? {
            ...previous,
            sections: Object.fromEntries(
              Object.entries(previous.sections).map(([key, status]) => [
                key,
                { ...status, state: status.fetchedAt ? "stale" : "unavailable" },
              ]),
            ) as GithubPayload["sections"],
          }
        : null;
      publish({ data, loading: false });
    })
    .finally(() => {
      active = undefined;
    });
  return active;
}

export function useGithubData() {
  const state = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => initial,
  );
  useEffect(() => {
    void refreshGithub(false);
  }, []);
  return { ...state, retry: refreshGithub };
}
