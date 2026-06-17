interface StatusFooterProps {
  readonly activeCategoryName: string;
}

export function StatusFooter({
  activeCategoryName,
}: StatusFooterProps): JSX.Element {
  return (
    <footer className="status-footer" dir="ltr">
      <span>Phase 1 scaffold</span>
      <span>Category: {activeCategoryName}</span>
      <span>Saved Local: placeholder</span>
      <span>DIR: RTL foundation</span>
    </footer>
  );
}
