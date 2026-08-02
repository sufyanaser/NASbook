const ALLOWED_EXTERNAL_PROTOCOLS = new Set(["http:", "https:"]);

export function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ALLOWED_EXTERNAL_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}
