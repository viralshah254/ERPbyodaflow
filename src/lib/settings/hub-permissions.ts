/** Mirrors nav gating in `@/config/navigation/index.ts` for the settings hub page. */
export function hasRuntimePermission(permissions: string[], required: string): boolean {
  if (permissions.includes("*")) return true;
  if (permissions.includes(required)) return true;
  const wildcardPrefixes = permissions
    .filter((entry) => entry.endsWith(".*"))
    .map((entry) => entry.slice(0, -2));
  return wildcardPrefixes.some((prefix) => required.startsWith(`${prefix}.`));
}

/** User must have at least one listed permission. Empty / missing means always visible. */
export function canSeeHubItem(
  permissions: string[],
  requiresPermissions: string[] | undefined,
  options?: { isPlatformOperator?: boolean; requiresPlatformOperator?: boolean }
): boolean {
  if (options?.requiresPlatformOperator && !options.isPlatformOperator) return false;
  if (!requiresPermissions?.length) return true;
  return requiresPermissions.some((p) => hasRuntimePermission(permissions, p));
}
