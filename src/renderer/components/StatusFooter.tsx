interface StatusFooterProps {
  readonly activeCategoryName: string;
  readonly categoriesCount: number;
  readonly databaseStatus: "ready" | "unavailable";
  readonly notesCount: number;
}

export function StatusFooter({
  activeCategoryName,
  categoriesCount,
  databaseStatus,
  notesCount,
}: StatusFooterProps): JSX.Element {
  const databaseLabel =
    databaseStatus === "ready" ? "DB: Ready" : "DB: Unavailable";

  return (
    <footer className="status-footer" dir="ltr">
      <span>Phase 1 scaffold</span>
      <span>Category: {activeCategoryName}</span>
      <span>{databaseLabel}</span>
      <span>Categories: {categoriesCount}</span>
      <span>Notes: {notesCount}</span>
      <span>Saved Local: placeholder</span>
      <span>DIR: RTL foundation</span>
    </footer>
  );
}
