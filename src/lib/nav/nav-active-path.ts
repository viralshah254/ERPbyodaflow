export type NavPathNode = {
  href?: string;
  children?: NavPathNode[];
};

export function navHrefMatchesPath(href: string | undefined, pathname: string | null | undefined): boolean {
  if (!href || !pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Current page among siblings. A longer sibling href wins, so a shared parent path
 *  like `/documents/hub` does not stay active on `/documents/hub/rules`.
 *  A list href still matches its detail route when no sibling owns that path.
 */
export function navHrefIsCurrent(
  href: string | undefined,
  pathname: string | null | undefined,
  siblingHrefs?: readonly string[],
): boolean {
  if (!href || !navHrefMatchesPath(href, pathname)) return false;
  if (!siblingHrefs?.length) return true;
  return !siblingHrefs.some(
    (other) => other.length > href.length && navHrefMatchesPath(other, pathname),
  );
}

export function navTreeContainsPath(nodes: NavPathNode[] | undefined, pathname: string | null | undefined): boolean {
  if (!nodes?.length || !pathname) return false;
  for (const node of nodes) {
    if (navHrefMatchesPath(node.href, pathname)) return true;
    if (navTreeContainsPath(node.children, pathname)) return true;
  }
  return false;
}
