interface NoteEditorAreaProps {
  readonly activeCategoryName: string;
}

export function NoteEditorArea({
  activeCategoryName,
}: NoteEditorAreaProps): JSX.Element {
  return (
    <section className="editor-area" aria-label="Editor placeholder">
      <header className="editor-header">
        <div>
          <span className="editor-eyebrow">{activeCategoryName}</span>
          <h1>مساحة التحرير الأولية</h1>
        </div>
        <div className="direction-chip" title="RTL-first scaffold">
          RTL
        </div>
      </header>

      <div className="editor-toolbar" aria-label="Editor toolbar placeholder">
        <button disabled type="button">
          B
        </button>
        <button disabled type="button">
          I
        </button>
        <button disabled type="button">
          Code
        </button>
        <button disabled type="button">
          Copy Context
        </button>
      </div>

      <div className="editor-placeholder" dir="rtl">
        <p>
          هذا موضع محرر NAS Notesbook في مرحلة التهيئة فقط. لا توجد قاعدة
          بيانات، ولا CRUD، ولا بحث، ولا محرر Tiptap في هذه المرحلة.
        </p>
        <pre>
          <code>{`Get-Process | Sort-Object CPU -Descending | Select-Object -First 5`}</code>
        </pre>
      </div>
    </section>
  );
}
