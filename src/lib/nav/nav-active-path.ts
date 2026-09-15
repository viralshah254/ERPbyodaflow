export type NavPathNode = {
  href?: string;
  children?: NavPathNode[];
};

export function navHrefMatchesPath(href: string | undefined, pathname: string | null | undefined): boolean {
  if (!href || !pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function navTreeContainsPath(nodes: NavPathNode[] | undefined, pathname: string | null | undefined): boolean {
  if (!nodes?.length || !pathname) return false;
  for (const node of nodes) {
    if (navHrefMatchesPath(node.href, pathname)) return true;
    if (navTreeContainsPath(node.children, pathname)) return true;
  }
  return false;
}
