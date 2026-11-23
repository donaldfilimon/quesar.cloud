import type { DefaultTreeAdapterMap } from "parse5";

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];

export function walkElements(
  node: Node,
  includeTemplates: boolean,
  visit: (element: Element) => void,
): void {
  if ("tagName" in node) visit(node);
  if ("childNodes" in node) {
    for (const child of node.childNodes) walkElements(child, includeTemplates, visit);
  }
  if (includeTemplates && "content" in node && node.content) {
    for (const child of node.content.childNodes) walkElements(child, includeTemplates, visit);
  }
}
