export type CategorySlug =
  | "all-notes"
  | "prompts"
  | "chatgpt-instructions"
  | "nas-projects"
  | "powershell-commands"
  | "development-notes"
  | "errors-fixes"
  | "templates"
  | "archive"
  | "trash";

export interface CategoryDefinition {
  readonly name: string;
  readonly slug: CategorySlug;
  readonly placement: "primary" | "secondary";
}

export const defaultCategories: readonly CategoryDefinition[] = [
  { name: "All Notes", slug: "all-notes", placement: "primary" },
  { name: "Prompts", slug: "prompts", placement: "primary" },
  {
    name: "ChatGPT Instructions",
    slug: "chatgpt-instructions",
    placement: "primary",
  },
  { name: "NAS Projects", slug: "nas-projects", placement: "primary" },
  {
    name: "PowerShell Commands",
    slug: "powershell-commands",
    placement: "primary",
  },
  {
    name: "Development Notes",
    slug: "development-notes",
    placement: "primary",
  },
  { name: "Errors & Fixes", slug: "errors-fixes", placement: "primary" },
  { name: "Templates", slug: "templates", placement: "primary" },
  { name: "Archive", slug: "archive", placement: "secondary" },
  { name: "Trash", slug: "trash", placement: "secondary" },
];
