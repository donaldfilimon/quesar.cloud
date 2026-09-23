import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Surface } from "@/components/site";
import { StatusBadge } from "@/components/site/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { architectureNodes } from "@/lib/content";
import { addNote, deleteNote, listNotes } from "@/lib/workspace";

/** Field notes on architecture nodes: the console's original behaviour, unchanged. */

type Note = {
  id: number;
  node_id: string;
  body: string;
  created_at: string;
};

function noteWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
}

export function NotesPanel({ initialNode }: { initialNode?: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [nodeId, setNodeId] = useState(initialNode ?? architectureNodes[1]?.id ?? "quesar");
  const [body, setBody] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "error">("loading");
  const [filter, setFilter] = useState<string>(initialNode ?? "all");

  const node = useMemo(
    () => architectureNodes.find((item) => item.id === nodeId) ?? architectureNodes[1],
    [nodeId],
  );

  // Follow a changed `initialNode` prop (adjusted during render; the initial
  // values above already cover the first render).
  const [prevInitialNode, setPrevInitialNode] = useState(initialNode);
  if (initialNode !== prevInitialNode) {
    setPrevInitialNode(initialNode);
    if (initialNode) {
      setNodeId(initialNode);
      setFilter(initialNode);
    }
  }

  // State is only set from the settled promise, so the mount effect below
  // never updates state synchronously.
  function refresh(): Promise<void> {
    return listNotes().then(
      (rows) => {
        setNotes(rows);
        setStatus("idle");
      },
      () => {
        setStatus("error");
      },
    );
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");
    try {
      await addNote({ data: { nodeId, body } });
      setBody("");
      setFilter(nodeId);
      await refresh();
      toast.success("Note saved to your account.");
    } catch {
      setStatus("error");
      toast.error("Could not save. Sign in again if the session expired.");
    }
  }

  async function onDelete(id: number) {
    const previous = notes;
    setNotes((rows) => rows.filter((note) => note.id !== id));
    try {
      await deleteNote({ data: id });
      toast.success("Note deleted.");
    } catch {
      setNotes(previous);
      toast.error("Could not delete that note.");
    }
  }

  const needle = query.trim().toLowerCase();
  const visible = notes.filter((note) => {
    if (filter !== "all" && note.node_id !== filter) return false;
    if (!needle) return true;
    const named = architectureNodes.find((item) => item.id === note.node_id)?.name ?? note.node_id;
    return `${named} ${note.body}`.toLowerCase().includes(needle);
  });

  return (
    <div>
      {initialNode ? (
        <p className="mb-6 rounded-lg bg-card px-4 py-3 text-sm text-fg-muted shadow-[var(--shadow-border)]">
          From architecture: this form is attached to <span className="text-fg">{node?.name}</span>.
          Current versus not claimed is listed beside it.
        </p>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(16rem,0.7fr)]">
        <form
          onSubmit={onSubmit}
          className="grid gap-3 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]"
        >
          <div>
            <Label htmlFor="note-node">Architecture node</Label>
            <Select value={nodeId} onValueChange={setNodeId}>
              <SelectTrigger id="note-node" className="mt-1" aria-label="Architecture node">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {architectureNodes.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="note-body">Note</Label>
            <Textarea
              id="note-body"
              className="mt-1"
              required
              maxLength={2000}
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                if (status === "error") setStatus("idle");
              }}
              placeholder={`What is current on ${node?.name}, and what is not claimed?`}
            />
            <p className="mt-1 font-mono text-[10px] text-fg-subtle">{body.length}/2000</p>
          </div>
          <Button type="submit" disabled={status === "saving" || body.trim().length === 0}>
            {status === "saving" ? "Saving…" : "Save note"}
          </Button>
          {status === "error" ? (
            <p className="text-sm text-status-partial" role="alert">
              Could not reach your notes.{" "}
              <button type="button" className="underline" onClick={() => void refresh()}>
                Retry
              </button>
            </p>
          ) : null}
        </form>

        {node ? (
          <Surface>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-accent">{node.name}</p>
              <StatusBadge status={node.status} />
            </div>
            <p className="mt-3 text-sm text-fg-muted">{node.detail}</p>
            <p className="mt-4 text-xs text-status-current">Current</p>
            <ul className="mt-1 space-y-1 text-sm text-fg-muted">
              {node.implemented.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Separator />
            <p className="text-xs text-fg-subtle">Not claimed</p>
            <ul className="mt-1 space-y-1 text-sm text-fg-muted">
              {node.notClaimed.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link
              to="/architecture"
              search={{ node: node.id }}
              className="mt-4 inline-flex min-h-11 items-center text-sm text-accent"
            >
              Open in architecture
            </Link>
          </Surface>
        ) : null}
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <Select
          value={filter}
          onValueChange={(value) => {
            setFilter(value);
            if (value !== "all") setNodeId(value);
          }}
        >
          <SelectTrigger aria-label="Filter notes by node">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All nodes ({notes.length})</SelectItem>
            {architectureNodes.map((item) => {
              const count = notes.filter((note) => note.node_id === item.id).length;
              return (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                  {count ? ` (${count})` : ""}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your notes"
          aria-label="Search notes"
        />
      </div>

      <ul className="mt-6 space-y-3">
        {status === "loading" ? (
          <li className="text-sm text-fg-muted">Loading your notes…</li>
        ) : null}
        {visible.length === 0 && status !== "loading" ? (
          <li className="text-sm text-fg-muted">
            {notes.length === 0
              ? "No notes yet. Inspect the architecture, then write what you observed on this node."
              : "No notes match that filter."}
          </li>
        ) : null}
        {visible.map((note) => {
          const named = architectureNodes.find((item) => item.id === note.node_id);
          const when = noteWhen(note.created_at);
          return (
            <li key={note.id} className="rounded-lg bg-card p-4 shadow-[var(--shadow-border)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-accent">{named?.name ?? note.node_id}</p>
                  {when ? <p className="mt-1 text-xs text-fg-subtle">{when}</p> : null}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="text-xs text-fg-subtle hover:text-fg"
                    onClick={() => {
                      void navigator.clipboard.writeText(note.body).then(
                        () => toast.success("Copied."),
                        () => toast.error("Could not copy."),
                      );
                    }}
                  >
                    Copy
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button type="button" className="text-xs text-fg-subtle hover:text-fg">
                        Delete
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                        <AlertDialogDescription>
                          The note is removed from your account. This site cannot restore it.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void onDelete(note.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-fg-muted">{note.body}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
