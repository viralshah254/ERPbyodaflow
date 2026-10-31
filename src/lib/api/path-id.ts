/**
 * Ids such as `org-sfa-…:prd:FG-019` contain colons.
 * Next can hand the page an already encoded segment (`%3A`).
 * Encoding that again turns it into `%253A`, and the API looks up the wrong id.
 */
export function canonicalPathId(raw: string): string {
  let id = raw.trim();
  for (let i = 0; i < 2; i += 1) {
    if (!/%[0-9A-Fa-f]{2}/.test(id)) break;
    try {
      const next = decodeURIComponent(id);
      if (next === id) break;
      id = next;
    } catch {
      break;
    }
  }
  return id;
}

export function encodePathId(raw: string): string {
  return encodeURIComponent(canonicalPathId(raw));
}
