export interface DirtyStateSource {
  readonly title: string;
  readonly contentMarkdown: string;
}

function normalizeContent(content: string): string {
  let text = content.trim();
  if (text === "") {
    return "";
  }
  // Convert standard paragraph wraps to newlines to check semantic equivalency
  // e.g. <p>Line 1</p><p>Line 2</p> -> Line 1\nLine 2
  text = text.replace(/<\/p>\s*<p>/g, "\n");
  text = text.replace(/<p>/g, "").replace(/<\/p>/g, "");
  // Replace standard break tags with newlines
  text = text.replace(/<br\s*\/?>/g, "\n");
  // Normalize HTML entity spaces
  text = text.replace(/&nbsp;/g, " ");
  // Normalize excessive whitespaces and duplicate newlines
  text = text.replace(/[^\S\r\n]+/g, " ");
  text = text.replace(/\r?\n/g, "\n");
  
  return text.trim();
}

export function hasUnsavedNoteChanges(
  source: DirtyStateSource | null,
  draftTitle: string,
  draftContent: string,
): boolean {
  if (!source) {
    return false;
  }

  const normalizedDraft = normalizeContent(draftContent);
  const normalizedSource = normalizeContent(source.contentMarkdown);

  return (
    draftTitle !== source.title || normalizedDraft !== normalizedSource
  );
}
