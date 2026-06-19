import { marked } from "marked";
import TurndownService from "turndown";

// One shared Turndown instance for HTML -> Markdown conversion.
const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*",
});

// Defense-in-depth: strip executable/style blocks before the HTML is stored.
// The content is only ever rendered through Tiptap (ProseMirror parses to its
// schema, dropping unknown nodes/attributes), so this is a belt-and-braces
// pass that avoids any innerHTML usage in our own code.
function stripUnsafeMarkup(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "");
}

export function markdownToHtml(markdown: string): string {
  const html = marked.parse(markdown ?? "", { gfm: true, async: false }) as string;
  return stripUnsafeMarkup(html);
}

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html ?? "");
}

// Title resolution order: first H1 -> filename without extension -> fallback.
export function extractMarkdownTitle(markdown: string, filename: string): string {
  const h1 = markdown.match(/^[ \t]*#[ \t]+(.+?)[ \t]*$/m);
  if (h1 && h1[1].trim()) {
    return h1[1].trim();
  }

  const base = filename.replace(/\.(md|markdown|txt)$/i, "").trim();
  if (base) {
    return base;
  }

  return "Untitled Note";
}

export function toSafeFilename(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned || "note";
}
