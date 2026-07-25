from __future__ import annotations

import re
from pathlib import Path

path = Path("src/shared/i18n.ts")
text = path.read_text(encoding="utf-8")
text = text.replace(
    'import { defaultCategories, type CategorySlug } from "./categories";',
    'import type { CategorySlug } from "./categories";',
    1,
)

pattern = re.compile(
    r"\s*const originalName = defaultCategories\.find\(\s*"
    r"\(category\) => category\.slug === slug,\s*"
    r"\)\?\.name;\s*"
    r"if \(defaultName\.trim\(\) && originalName && defaultName !== originalName\) \{\s*"
    r"return defaultName;\s*"
    r"\}\s*"
    r"if \(lang === \"ar\"\) \{",
    re.DOTALL,
)

replacement = '''
  const defaultAliases: Readonly<Partial<Record<CategorySlug, readonly string[]>>> = {
    "all-notes": ["All Notes", "كل الملاحظات"],
    prompts: ["Prompts", "Projects", "المشاريع"],
    "chatgpt-instructions": ["ChatGPT Instructions", "Channels", "القنوات"],
    "nas-projects": ["NAS Projects", "NAS"],
    "powershell-commands": ["PowerShell Commands", "Personal", "شخصي"],
    "development-notes": ["Development Notes", "Development", "التطوير"],
    "errors-fixes": ["Errors & Fixes", "Errors", "الأخطاء"],
    templates: ["Templates", "القوالب"],
    archive: ["Archive", "الأرشيف"],
    trash: ["Trash", "سلة المهملات"],
  };
  const aliases = defaultAliases[slug];
  if (defaultName.trim() && (!aliases || !aliases.includes(defaultName))) {
    return defaultName;
  }

  if (lang === "ar") {'''

updated, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise RuntimeError(f"Expected one generated display-name block, found {count}.")

path.write_text(updated, encoding="utf-8")
print("Localized default category aliases preserved.")
