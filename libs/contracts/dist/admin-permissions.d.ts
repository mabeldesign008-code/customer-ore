/**
 * ADMIN PERMISSION MATRIX — the single source of truth for who may do what.
 *
 * Imported by BOTH sides:
 *   - backend:  `PermissionGuard` in libs/core resolves a route's required permission
 *               against the caller's adminRole
 *   - frontend: the admin console builds its navigation from the same object
 *
 * That shared import is the point. The console used to carry its own `ROUTE_ROLES`
 * map plus a "View As Role" dropdown in localStorage, so what the UI showed and
 * what the API allowed were two unrelated fictions.
 *
 * MODEL
 *   Roles grant permissions. Endpoints require permissions. Nothing requires a role.
 *   A role is a label on the door; a permission is the intent. This keeps the matrix
 *   reviewable by a non-engineer and stops "role explosion".
 *
 * ACCESS CODES — one character per AdminRole, in ADMIN_ROLE_ORDER:
 *   'R' read
 *   'W' write / act
 *   'D' write WITH dual control (maker-checker: the maker may never be the checker)
 *   '-' no access
 *
 * Adding a permission: append the key and an 8-character access string.
 * `validatePermissionMatrix()` runs at module load and throws on a malformed row,
 * so a typo is a boot failure, not a silent hole.
 */
export declare const ADMIN_ROLE_ORDER: readonly ["super_admin", "operations", "support", "finance", "accounting", "marketing", "brand", "compliance"];
export type AdminRoleKey = (typeof ADMIN_ROLE_ORDER)[number];
/**
 * AdminRole — derived from ADMIN_ROLE_ORDER so the two can never drift again
 * (the old enum in enums.ts had only 5 of the 8 roles). Same string values, so
 * stored rows and JWT claims are untouched.
 */
export declare const AdminRole: Record<Uppercase<AdminRoleKey>, AdminRoleKey>;
export type AdminRole = AdminRoleKey;
export type Access = 'R' | 'W' | 'D' | '-';
/** Access string, 8 characters, ordered by ADMIN_ROLE_ORDER. */
export type AccessString = string;
/**
 * The matrix. 167 permissions across 20 domains.
 * Order of characters: super_admin, operations, support, finance, accounting, marketing, brand, compliance
 */
export declare const PERMISSION_MATRIX: Record<string, AccessString>;
/** Throws on any malformed row. Called at module load — a typo is a boot failure. */
export declare function validatePermissionMatrix(matrix?: Record<string, AccessString>): void;
export type Permission = keyof typeof PERMISSION_MATRIX;
export declare const ALL_PERMISSIONS: Permission[];
/** Permissions that require maker-checker. Derived, so it can never drift from the matrix. */
export declare const DUAL_CONTROLLED_PERMISSIONS: Permission[];
export declare function accessFor(permission: string, role: string | null | undefined): Access;
/**
 * May this admin role perform this permission?
 * 'R', 'W' and 'D' all authorise the call — 'D' additionally means the action must
 * go through the approval queue, which the service layer enforces, not the guard.
 */
export declare function roleHasPermission(role: string | null | undefined, permission: string): boolean;
/** Every permission a role holds. Drives the console's navigation. */
export declare function permissionsForRole(role: string | null | undefined): Permission[];
/** Read/write/dual/no-access counts per role — asserted in tests so the docs cannot drift. */
export declare function permissionCensus(): Record<AdminRoleKey, {
    read: number;
    write: number;
    dual: number;
    total: number;
}>;
//# sourceMappingURL=admin-permissions.d.ts.map