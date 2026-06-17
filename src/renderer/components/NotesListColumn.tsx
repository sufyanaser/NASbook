interface NotesListColumnProps {
  readonly activeCategoryName: string;
}

const placeholderNotes = [
  {
    title: "مرحبا بك في NAS Notesbook",
    preview: "مساحة محلية منظمة لحفظ التعليمات والسياقات والأوامر التقنية.",
    updatedAt: "الآن",
  },
  {
    title: "PowerShell scaffold note",
    preview: "Code and command notes remain LTR when real editor support lands.",
    updatedAt: "Phase 1",
  },
];

export function NotesListColumn({
  activeCategoryName,
}: NotesListColumnProps): JSX.Element {
  return (
    <section className="notes-list-column" aria-label="Notes list" dir="rtl">
      <header className="notes-list-header">
        <input
          aria-label="Search notes"
          className="notes-search"
          disabled
          placeholder="Search notes..."
          type="search"
        />
        <button className="new-note-button" disabled type="button">
          +
        </button>
      </header>

      <div className="category-context">
        <span>الفئة الحالية</span>
        <strong>{activeCategoryName}</strong>
      </div>

      <div className="notes-stack">
        {placeholderNotes.map((note, index) => (
          <article
            className="note-list-card"
            data-selected={index === 0}
            key={note.title}
          >
            <div className="note-card-topline">
              <h2>{note.title}</h2>
              <time>{note.updatedAt}</time>
            </div>
            <p>{note.preview}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
