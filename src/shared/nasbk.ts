export const NASBK_FORMAT_VERSION = 1;
export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;
const MAX_NASBK_TITLE_LENGTH = 500;

export interface ValidatedNasbkDocument {
  readonly title: string;
  readonly contentHtml: string;
  readonly contentText: string;
  readonly metadata: {
    readonly isRtl: boolean;
    readonly createdAt: string;
    readonly updatedAt: string;
  };
  readonly formatVersion: typeof NASBK_FORMAT_VERSION;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateNasbkDocument(
  value: unknown,
  now = new Date().toISOString(),
): ValidatedNasbkDocument {
  if (!isRecord(value) || value.format !== "NASBK") {
    throw new Error("Invalid format. File is not a NASBK document.");
  }
  if (value.formatVersion !== NASBK_FORMAT_VERSION) {
    throw new Error("Unsupported NASBK formatVersion.");
  }
  if (typeof value.title !== "string" || value.title.length > MAX_NASBK_TITLE_LENGTH) {
    throw new Error("Invalid NASBK title.");
  }
  if (typeof value.contentHtml !== "string") {
    throw new Error("Invalid NASBK contentHtml.");
  }

  const metadata = isRecord(value.metadata) ? value.metadata : {};
  return {
    title: value.title,
    contentHtml: value.contentHtml,
    contentText:
      typeof value.contentText === "string" ? value.contentText : "",
    metadata: {
      isRtl: metadata.isRtl === true,
      createdAt:
        typeof metadata.createdAt === "string" ? metadata.createdAt : now,
      updatedAt:
        typeof metadata.updatedAt === "string" ? metadata.updatedAt : now,
    },
    formatVersion: NASBK_FORMAT_VERSION,
  };
}
