from __future__ import annotations

import re
from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    Path(path).write_text(content, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise RuntimeError(
            f"Expected one match in {path}, found {count}: {old[:120]!r}",
        )
    write(path, text.replace(old, new, 1))


def replace_regex_once(path: str, pattern: str, replacement: str) -> None:
    text = read(path)
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.DOTALL)
    if count != 1:
        raise RuntimeError(
            f"Expected one regex match in {path}, found {count}: {pattern[:120]!r}",
        )
    write(path, updated)


replace_once(
    "src/shared/ipc.ts",
    "export interface MarkdownImportResult {",
    """export interface UpdateCategoryInput {
  readonly id: number;
  readonly name: string;
  readonly icon: string;
}

export interface MarkdownImportResult {""",
)
replace_once(
    "src/shared/ipc.ts",
    """  readonly categories: {
    readonly list: () => Promise<readonly CategoryRecord[]>;
  };""",
    """  readonly categories: {
    readonly list: () => Promise<readonly CategoryRecord[]>;
    readonly update: (input: UpdateCategoryInput) => Promise<CategoryRecord>;
  };""",
)

replace_once(
    "electron/preload/index.ts",
    """  UpdateNoteInput,
  NasbkSaveInput,""",
    """  UpdateNoteInput,
  UpdateCategoryInput,
  NasbkSaveInput,""",
)
replace_once(
    "electron/preload/index.ts",
    """  categories: Object.freeze({
    list: () => ipcRenderer.invoke(\"categories:list\"),
  }),""",
    """  categories: Object.freeze({
    list: () => ipcRenderer.invoke(\"categories:list\"),
    update: (input: UpdateCategoryInput) =>
      ipcRenderer.invoke(\"categories:update\", input),
  }),""",
)

replace_once(
    "electron/main/ipc.ts",
    """  UpdateNoteInput,
  NasbkSaveInput,""",
    """  UpdateNoteInput,
  UpdateCategoryInput,
  NasbkSaveInput,""",
)
replace_once(
    "electron/main/ipc.ts",
    """  ipcMain.handle(\"categories:list\", () => {
    return database.listCategories();
  });""",
    """  ipcMain.handle(\"categories:list\", () => {
    return database.listCategories();
  });

  ipcMain.handle(\"categories:update\", (_event, input: UpdateCategoryInput) => {
    return database.updateCategory(input);
  });""",
)

replace_once(
    "electron/main/db.ts",
    """  UpdateNoteInput,
} from \"../../src/shared/ipc\";""",
    """  UpdateNoteInput,
  UpdateCategoryInput,
} from \"../../src/shared/ipc\";
import {
  customizableCategorySlugs,
  isCategoryIconKey,
} from \"../../src/shared/categoryIcons\";""",
)
replace_once(
    "electron/main/db.ts",
    """  readonly listCategories: () => readonly CategoryRecord[];
  readonly listNotes:""",
    """  readonly listCategories: () => readonly CategoryRecord[];
  readonly updateCategory: (input: UpdateCategoryInput) => CategoryRecord;
  readonly listNotes:""",
)
replace_once(
    "electron/main/db.ts",
    "function requireNote(database: SqliteDatabase, id: number): NoteRecord {",
    """function requireCategory(database: SqliteDatabase, id: number): CategoryRecord {
  const row = database
    .prepare(
      `SELECT id, name, slug, icon, is_system
       FROM categories
       WHERE id = ?`,
    )
    .get(normalizeId(id)) as CategoryRow | undefined;

  if (!row) {
    throw new Error(\"Category not found.\");
  }

  return toCategoryRecord(row);
}

function normalizeCategoryName(name: string): string {
  const normalized = name.trim();
  if (normalized.length === 0 || normalized.length > 40) {
    throw new Error(\"Category name must contain 1 to 40 characters.\");
  }
  return normalized;
}

function requireNote(database: SqliteDatabase, id: number): NoteRecord {""",
)
replace_once(
    "electron/main/db.ts",
    """      return rows.map(toCategoryRecord);
    },
    listNotes:""",
    """      return rows.map(toCategoryRecord);
    },
    updateCategory: (input) => {
      const category = requireCategory(database, input.id);

      const customizable = customizableCategorySlugs.some(
        (slug) => slug === category.slug,
      );
      if (!customizable) {
        throw new Error(\"This system category cannot be customized.\");
      }

      if (!isCategoryIconKey(input.icon)) {
        throw new Error(\"Invalid category icon.\");
      }

      database
        .prepare(\"UPDATE categories SET name = ?, icon = ? WHERE id = ?\")
        .run(normalizeCategoryName(input.name), input.icon, category.id);

      return requireCategory(database, category.id);
    },
    listNotes:""",
)

replace_once(
    "src/shared/i18n.ts",
    "import type { CategorySlug } from \"./categories\";",
    "import { defaultCategories, type CategorySlug } from \"./categories\";",
)
replace_once(
    "src/shared/i18n.ts",
    """export function getCategoryDisplayName(
  slug: CategorySlug,
  defaultName: string,
  lang: AppLanguage,
): string {
  if (lang === \"ar\") {""",
    """export function getCategoryDisplayName(
  slug: CategorySlug,
  defaultName: string,
  lang: AppLanguage,
): string {
  const originalName = defaultCategories.find(
    (category) => category.slug === slug,
  )?.name;
  if (defaultName.trim() && originalName && defaultName !== originalName) {
    return defaultName;
  }

  if (lang === \"ar\") {""",
)

replace_once(
    "src/renderer/components/NavigationRail.tsx",
    "import type { CategoryDefinition, CategorySlug } from \"../../shared/categories\";",
    """import type { CategoryRecord, CategorySlug } from \"../../shared/categories\";
import {
  customizableCategorySlugs,
  resolveCategoryIconFile,
} from \"../../shared/categoryIcons\";
import type { UpdateCategoryInput } from \"../../shared/ipc\";
import { CategoryCustomizationDialog } from \"./CategoryCustomizationDialog\";""",
)
replace_regex_once(
    "src/renderer/components/NavigationRail.tsx",
    r"const getCategoryIcon = \(\n  mode: RailIconMode,\n  slug: CategorySlug \| \"settings\",\n  name: string,\n \): IconResolution => \{\n  const fileName = categoryIconFiles\[slug\];",
    """const getCategoryIcon = (
  mode: RailIconMode,
  slug: CategorySlug | \"settings\",
  name: string,
  icon?: string,
): IconResolution => {
  const fileName = slug === \"settings\"
    ? categoryIconFiles.settings
    : resolveCategoryIconFile(icon, slug);""",
)
replace_once(
    "src/renderer/components/NavigationRail.tsx",
    "  readonly categories: readonly CategoryDefinition[];",
    "  readonly categories: readonly CategoryRecord[];",
)
replace_once(
    "src/renderer/components/NavigationRail.tsx",
    """  readonly onSelectCategory: (category: CategorySlug) => void;
  readonly expanded:""",
    """  readonly onSelectCategory: (category: CategorySlug) => void;
  readonly onUpdateCategory: (input: UpdateCategoryInput) => Promise<void>;
  readonly expanded:""",
)
replace_once(
    "src/renderer/components/NavigationRail.tsx",
    """  onSelectCategory,
  expanded,""",
    """  onSelectCategory,
  onUpdateCategory,
  expanded,""",
)
replace_once(
    "src/renderer/components/NavigationRail.tsx",
    "  const [isThemeOpen, setIsThemeOpen] = useState(false);",
    """  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryRecord | null>(null);""",
)
replace_once(
    "src/renderer/components/NavigationRail.tsx",
    """  return (
    <aside className={`navigation-rail ${expanded ? \"navigation-rail--expanded\" : \"\"}`} aria-label=\"Categories\">""",
    """  const renderCategoryButton = (
    category: CategoryRecord,
    canCustomize: boolean,
  ): JSX.Element => {
    const iconRes = getCategoryIcon(
      railIconMode,
      category.slug,
      category.name,
      category.icon,
    );
    const displayName = getCategoryDisplayName(
      category.slug,
      category.name,
      language,
    );
    const customizable = canCustomize && customizableCategorySlugs.some(
      (slug) => slug === category.slug,
    );

    return (
      <div className=\"rail-category-row\" key={category.slug}>
        <button
          className=\"rail-button\"
          data-active={category.slug === activeCategory}
          data-trash={category.slug === \"trash\" ? \"true\" : \"false\"}
          data-tooltip={expanded ? \"\" : displayName}
          data-tooltip-placement={language === \"ar\" ? \"left\" : \"right\"}
          onClick={() => onSelectCategory(category.slug)}
          onContextMenu={(event) => {
            if (customizable) {
              event.preventDefault();
              setEditingCategory(category);
            }
          }}
          onDoubleClick={() => {
            if (customizable) {
              setEditingCategory(category);
            }
          }}
          type=\"button\"
        >
          <span aria-hidden=\"true\">{renderRailIcon(iconRes)}</span>
          {expanded && <span className=\"rail-button-label\">{displayName}</span>}
          <span className=\"sr-only\">{displayName}</span>
        </button>
        {expanded && customizable && (
          <button
            aria-label={language === \"ar\" ? `تخصيص ${displayName}` : `Customize ${displayName}`}
            className=\"rail-category-edit\"
            data-tooltip={language === \"ar\" ? \"إعادة التسمية وتغيير الأيقونة\" : \"Rename and change icon\"}
            data-tooltip-placement={language === \"ar\" ? \"left\" : \"right\"}
            onClick={() => setEditingCategory(category)}
            type=\"button\"
          >
            <svg aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth=\"2\" viewBox=\"0 0 24 24\">
              <path d=\"M12 20h9\" />
              <path d=\"M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z\" />
            </svg>
          </button>
        )}
      </div>
    );
  };

  return (
    <aside className={`navigation-rail ${expanded ? \"navigation-rail--expanded\" : \"\"}`} aria-label=\"Categories\">""",
)
replace_regex_once(
    "src/renderer/components/NavigationRail.tsx",
    r"        \{primaryCategories\.map\(\(category\) => \{.*?\n        \}\)\}",
    "        {primaryCategories.map((category) => renderCategoryButton(category, true))}",
)
replace_regex_once(
    "src/renderer/components/NavigationRail.tsx",
    r"        \{secondaryCategories\.map\(\(category\) => \{.*?\n        \}\)\}",
    "        {secondaryCategories.map((category) => renderCategoryButton(category, false))}",
)
replace_once(
    "src/renderer/components/NavigationRail.tsx",
    """      </nav>
    </aside>""",
    """      </nav>
      <CategoryCustomizationDialog
        category={editingCategory}
        language={language}
        railIconMode={railIconMode}
        onClose={() => setEditingCategory(null)}
        onSave={onUpdateCategory}
      />
    </aside>""",
)

replace_once(
    "src/renderer/App.tsx",
    "import type { AppInfo, NoteRecord, NoteListItem, NasbkImportResult } from \"../shared/ipc\";",
    """import type {
  AppInfo,
  NoteRecord,
  NoteListItem,
  NasbkImportResult,
  UpdateCategoryInput,
} from \"../shared/ipc\";""",
)
replace_once(
    "src/renderer/App.tsx",
    "  const handleOpenDataFolder = (): void => {",
    """  const handleUpdateCategory = useCallback(
    async (input: UpdateCategoryInput): Promise<void> => {
      const api = window.nasNotesbook;
      if (!api) {
        return;
      }

      const updated = await api.categories.update(input);
      setCategories((current) =>
        current.map((category) =>
          category.id === updated.id ? updated : category,
        ),
      );
    },
    [],
  );

  const handleOpenDataFolder = (): void => {""",
)
replace_once(
    "src/renderer/App.tsx",
    """        onSelectCategory={handleSelectCategory}
        expanded={navRailExpanded}""",
    """        onSelectCategory={handleSelectCategory}
        onUpdateCategory={handleUpdateCategory}
        expanded={navRailExpanded}""",
)

path = Path("tests/scaffold.test.mjs")
text = path.read_text(encoding="utf-8")
marker = 'test("category customization persists names and built-in icons", async () => {'
if marker not in text:
    text += """

test("category customization persists names and built-in icons", async () => {
  const dbSource = await readFile(join(projectRoot, "electron/main/db.ts"), "utf8");
  const ipcSource = await readFile(join(projectRoot, "electron/main/ipc.ts"), "utf8");
  const preloadSource = await readFile(join(projectRoot, "electron/preload/index.ts"), "utf8");
  const railSource = await readFile(join(projectRoot, "src/renderer/components/NavigationRail.tsx"), "utf8");
  const dialogSource = await readFile(join(projectRoot, "src/renderer/components/CategoryCustomizationDialog.tsx"), "utf8");

  assert.match(dbSource, /updateCategory:/);
  assert.match(dbSource, /UPDATE categories SET name = \\?, icon = \\?/);
  assert.match(ipcSource, /categories:update/);
  assert.match(preloadSource, /categories:update/);
  assert.match(railSource, /CategoryCustomizationDialog/);
  assert.match(railSource, /rail-category-edit/);
  assert.match(dialogSource, /categoryIconChoices/);
});
"""
    path.write_text(text, encoding="utf-8")

print("Category customization patch applied successfully.")
