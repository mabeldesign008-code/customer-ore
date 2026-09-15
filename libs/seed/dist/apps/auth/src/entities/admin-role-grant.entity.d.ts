/**
 * A single permission granted to, or taken away from, one admin on top of their role.
 *
 * `deny` exists so you can subtract one permission without forking a whole new role —
 * the usual real case is "everyone in finance except Kwame can release reserves".
 *
 * Denials win over grants, and both win over the role matrix. `PermissionGuard.holds()`
 * applies them in that order.
 */
export declare class AdminRoleGrant {
    id: string;
    adminUserId: string;
    permission: string;
    /** grant | deny */
    mode: string;
    grantedBy: string | null;
    reason: string | null;
    createdAt: Date;
}
//# sourceMappingURL=admin-role-grant.entity.d.ts.map