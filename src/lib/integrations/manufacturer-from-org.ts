/** Manufacturer id encoded in org ids created for an Odaflow company (`org-sfa-<id>`). */
export function manufacturerIdFromErpOrg(orgId: string): string {
  const suffix = orgId.startsWith("org-sfa-") ? orgId.slice("org-sfa-".length) : "";
  return /^[a-f0-9]{24}$/i.test(suffix) ? suffix : "";
}
