/**
 * Role-based permissions. Routes declare the permission they need; the server checks it on every request.
 * The frontend mirrors this only to hide controls. It is never the security boundary.
 */
export const ROLES = ["ADMIN", "EDITOR"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "dashboard:read",
  "rfq:read",
  "rfq:update",
  "rfq:download",
  "product:read",
  "product:write",
  "category:write",
  "lookup:write",
  "content:read",
  "content:write",
  "contact:read",
  "contact:write",
  "media:write",
  "user:manage",
  "audit:read",
  "crm:read",
  "crm:write",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const EDITOR_PERMISSIONS: Permission[] = [
  "dashboard:read",
  "rfq:read",
  "rfq:update",
  "rfq:download",
  "product:read",
  "product:write",
  "category:write",
  "lookup:write",
  "content:read",
  "content:write",
  "contact:read",
  "contact:write",
  "media:write",
  "audit:read",
  "crm:read",
  "crm:write",
];

/** ADMIN has everything. EDITOR cannot manage users. Add roles here; routes need no change. */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  ADMIN: PERMISSIONS,
  EDITOR: EDITOR_PERMISSIONS,
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
