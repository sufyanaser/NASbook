export interface DirtyStateSource {
  readonly title: string;
  readonly contentMarkdown: string;
}

export function hasUnsavedNoteChanges(
  source: DirtyStateSource | null,
  draftTitle: string,
  draftContent: string,
): boolean {
  if (!source) {
    return false;
  }

  return (
    draftTitle !== source.title || draftContent !== source.contentMarkdown
  );
}
