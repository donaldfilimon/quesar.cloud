import { useHydrated } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { readStore, writeStore } from "@/lib/local-store";

type Note = { id: string; title: string; body: string; updated: number };

const KEY = "mlai-vault-notes";

export function VaultApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // Notes live in localStorage, which the server can't read: the server render
  // and the hydration pass show the empty list, then the first client render
  // after hydration loads the stored notes (once, adjusted during render).
  const hydrated = useHydrated();
  const [loaded, setLoaded] = useState(false);
  if (hydrated && !loaded) {
    setLoaded(true);
    const stored = readStore<Note[]>(KEY, []);
    setNotes(stored);
    const first = stored[0];
    if (first) {
      setActive(first.id);
      setTitle(first.title);
      setBody(first.body);
    }
  }

  useEffect(() => {
    // Never write before the stored notes are loaded, or the empty initial list
    // would overwrite them.
    if (loaded) writeStore(KEY, notes);
  }, [loaded, notes]);

  const current = useMemo(() => notes.find((n) => n.id === active) ?? null, [notes, active]);

  function persist(nextTitle: string, nextBody: string) {
    if (!active) return;
    setNotes((rows) =>
      rows.map((row) =>
        row.id === active ? { ...row, title: nextTitle, body: nextBody, updated: Date.now() } : row,
      ),
    );
  }

  function createNote() {
    const note: Note = {
      id: crypto.randomUUID(),
      title: "Untitled",
      body: "",
      updated: Date.now(),
    };
    setNotes((rows) => [note, ...rows]);
    setActive(note.id);
    setTitle(note.title);
    setBody("");
  }

  return (
    <div className="overflow-hidden rounded-18 bg-bg-elevated shadow-border lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="border-b border-border lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-xs text-accent">Vault</p>
          <Button type="button" size="sm" onClick={createNote}>
            New
          </Button>
        </div>
        <ul className="max-h-64 overflow-y-auto lg:max-h-[28rem]">
          {notes.length === 0 ? (
            <li className="px-4 py-6 text-sm text-fg-muted">Empty. Notes stay in this browser.</li>
          ) : (
            notes.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActive(note.id);
                    setTitle(note.title);
                    setBody(note.body);
                  }}
                  className={`block w-full px-4 py-3 text-left ${note.id === active ? "bg-bg-subtle" : "hover:bg-bg-subtle"}`}
                >
                  <p className="truncate text-sm font-medium">{note.title || "Untitled"}</p>
                  <p className="truncate text-xs text-fg-subtle">
                    {new Date(note.updated).toLocaleString()}
                  </p>
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>
      <div className="p-4 sm:p-6">
        {current ? (
          <>
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                persist(event.target.value, body);
              }}
              className="w-full bg-transparent font-display text-2xl outline-none"
            />
            <textarea
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                persist(title, event.target.value);
              }}
              className="mt-4 min-h-64 w-full resize-y bg-transparent text-sm leading-relaxed text-fg-muted outline-none"
              placeholder="Private note. Encrypted-local fallback on device builds; this web vault is localStorage only."
            />
          </>
        ) : (
          <p className="text-sm text-fg-muted">Create a note to start the vault.</p>
        )}
      </div>
    </div>
  );
}
