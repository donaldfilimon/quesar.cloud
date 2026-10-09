import { test, expect } from "bun:test";
import type { GenerationEvent } from "../shared/index";
import { JobEvents, EventBus } from "./events";

function textEvent(text: string): GenerationEvent {
  return { type: "text", text };
}

test("emit buffers events in order", () => {
  const job = new JobEvents();
  job.emit(textEvent("one"));
  job.emit(textEvent("two"));
  expect(job.events).toEqual([textEvent("one"), textEvent("two")]);
});

test("since(0) returns all buffered events and next equals count", () => {
  const job = new JobEvents();
  job.emit(textEvent("one"));
  job.emit(textEvent("two"));
  const result = job.since(0);
  expect(result.events).toEqual([textEvent("one"), textEvent("two")]);
  expect(result.next).toBe(2);
});

test("since(next) after catching up returns empty", () => {
  const job = new JobEvents();
  job.emit(textEvent("one"));
  const first = job.since(0);
  const second = job.since(first.next);
  expect(second.events).toEqual([]);
  expect(second.next).toBe(first.next);
});

test("subscribe receives subsequent emits; unsubscribe stops delivery", () => {
  const job = new JobEvents();
  const received: GenerationEvent[] = [];
  const unsubscribe = job.subscribe((ev) => received.push(ev));

  job.emit(textEvent("one"));
  expect(received).toEqual([textEvent("one")]);

  unsubscribe();
  job.emit(textEvent("two"));
  expect(received).toEqual([textEvent("one")]);
  expect(job.events).toEqual([textEvent("one"), textEvent("two")]);
});

test("EventBus.get returns the same JobEvents instance for a given siteId", () => {
  const bus = new EventBus();
  const a = bus.get("site-1");
  const b = bus.get("site-1");
  expect(a).toBe(b);
});

test("EventBus.get returns distinct JobEvents per siteId", () => {
  const bus = new EventBus();
  const a = bus.get("site-1");
  const b = bus.get("site-2");
  expect(a).not.toBe(b);
});

test("EventBus.reset replaces the epoch and isolates stale producers", () => {
  const bus = new EventBus();
  const job = bus.get("site-1");
  job.emit(textEvent("one"));
  expect(job.events.length).toBe(1);

  bus.reset("site-1");
  expect(bus.get("site-1")).not.toBe(job);
  expect(bus.get("site-1").events).toEqual([]);
  expect(bus.get("site-1").epoch).not.toBe(job.epoch);
});

test("inactive retention evicts oldest feeds without extending retention on polls", () => {
  const bus = new EventBus(2);
  const first = bus.get("first");
  const second = bus.get("second");
  expect(bus.get("first")).toBe(first);
  bus.get("third");
  expect(bus.get("second")).toBe(second);
  expect(bus.get("first").epoch).not.toBe(first.epoch);
});

test("running feeds survive retention pressure and become eligible after finish", () => {
  const bus = new EventBus(1);
  bus.reset("running");
  const running = bus.get("running");
  bus.get("idle-1");
  bus.get("idle-2");
  expect(bus.get("running")).toBe(running);
  bus.finish("running", running);
  bus.get("idle-3");
  expect(bus.get("running").epoch).not.toBe(running.epoch);
});

test("delete removes the retained feed and obsolete finish cannot affect replacements", () => {
  const bus = new EventBus(0);
  bus.reset("site");
  const old = bus.get("site");
  bus.reset("site");
  const replacement = bus.get("site");
  bus.finish("site", old);
  bus.get("idle");
  expect(bus.get("site")).toBe(replacement);
  old.emit(textEvent("obsolete"));
  expect(replacement.events).toEqual([]);
  bus.delete("site");
  expect(bus.get("site").epoch).not.toBe(replacement.epoch);
});
