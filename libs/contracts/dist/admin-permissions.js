"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DUAL_CONTROLLED_PERMISSIONS = exports.ALL_PERMISSIONS = exports.PERMISSION_MATRIX = exports.AdminRole = exports.ADMIN_ROLE_ORDER = void 0;
exports.validatePermissionMatrix = validatePermissionMatrix;
exports.accessFor = accessFor;
exports.roleHasPermission = roleHasPermission;
exports.permissionsForRole = permissionsForRole;
exports.permissionCensus = permissionCensus;
exports.ADMIN_ROLE_ORDER = [
    'super_admin',
    'operations',
    'support',
    'finance',
    'accounting',
    'marketing',
    'brand',
    'compliance',
];
/**
 * AdminRole — derived from ADMIN_ROLE_ORDER so the two can never drift again
 * (the old enum in enums.ts had only 5 of the 8 roles). Same string values, so
 * stored rows and JWT claims are untouched.
 */
exports.AdminRole = Object.fromEntries(exports.ADMIN_ROLE_ORDER.map((key) => [key.toUpperCase(), key]));
/**
 * The matrix. 167 permissions across 20 domains.
 * Order of characters: super_admin, operations, support, finance, accounting, marketing, brand, compliance
 */
exports.PERMISSION_MATRIX = {
    // ── 1. admin & platform ──────────────────────────────────────────────
    'admin.user.read': 'R-----R-',
    'admin.user.create': 'D-------',
    'admin.user.suspend': 'D-------',
    'admin.user.role.change': 'D-------',
    'admin.grant.manage': 'D-------',
    'admin.user.totp.reset': 'D-------',
    'admin.role.matrix.read': 'RRRRRRRR',
    'admin.audit.read': 'R------R',
    'admin.audit.read_own': 'RRRRRRRR',
    'admin.approval.queue.read': 'R--R----',
    'admin.approval.check': 'D--D----',
    'platform.flag.read': 'RR-----R',
    'platform.flag.set': 'D-------',
    'platform.health.read': 'RR-R---R',
    'platform.webhook.read': 'R--R---R',
    // ── 2. onboarding / KYC ──────────────────────────────────────────────
    'onboarding.application.read': 'RRRR---R',
    'onboarding.stats.read': 'RR-----R',
    'onboarding.document.read': 'RR-----R',
    'onboarding.application.approve': 'WW-----W',
    'onboarding.application.reject': 'WW-----W',
    'onboarding.application.requires_action': 'WR----W-',
    'onboarding.audit_log.read': 'RR-----R',
    'onboarding.kyc.override': 'D------D',
    // ── 3. customer ──────────────────────────────────────────────────────
    'customer.list': 'RRRR-R-R',
    'customer.profile.read': 'RRRR---R',
    'customer.address.read': 'RRR----R',
    'customer.address.correct': 'WWR----R',
    'customer.orders.read': 'RRRR---R',
    'customer.wallet.read': 'RRRRR---',
    'customer.credit.grant': 'D--D----',
    'customer.credit.freeze': 'D--D---D',
    'customer.suspend': 'WW-----W',
    'customer.ban': 'DD-----D',
    'customer.session.revoke': 'WW-----W',
    'customer.pii.export': 'D------D',
    'customer.marketing_consent.read': 'R----R-R',
    'customer.cod.manage': 'WWR----R',
    // Recording a consent the customer gave is a write, so it gets its own key. Gating a
    // mutation on a `.read` permission would hand it to every role that can merely see it.
    'customer.marketing_consent.set': 'W----W-W',
    // ── 4. vendor + catalogue ────────────────────────────────────────────
    'vendor.list': 'RRRR---R',
    'vendor.profile.read': 'RRRRR---',
    'vendor.approval.set': 'WW-----W',
    'vendor.suspend': 'WW-----W',
    'vendor.plan.set': 'DD------',
    'vendor.commission.override': 'D--D----',
    'vendor.payout_account.read': 'R--R----',
    'vendor.payout_account.change': 'D--D----',
    'vendor.sla.violations.read': 'RRR----R',
    'vendor.performance.read': 'RRR---RR',
    'vendor.performance.manage': 'WW----WW',
    'vendor.performance.config': 'WW----W-',
    'vendor.penalty.apply': 'DD------',
    'vendor.penalty.lift': 'DD------',
    'vendor.staff.manage': 'WW------',
    'catalog.vendor.manage': 'WW------',
    'catalog.item.manage': 'WW------',
    'catalog.promotion.platform': 'D----D--',
    'catalog.review.moderate': 'WW------',
    'catalog.story.moderate': 'WW----W-',
    'catalog.pos.manage': 'WW------',
    // ── 5. rider ─────────────────────────────────────────────────────────
    'rider.list': 'RRRR---R',
    'rider.profile.read': 'RRRR---R',
    'rider.approve': 'WW-----W',
    'rider.identifier.correct': 'WW-----W',
    'rider.status.set': 'DD-----D',
    'rider.cod.manage': 'WW------',
    'rider.tier.set': 'WW------',
    'rider.errand_tier.set': 'WW------',
    'rider.block.impose': 'WW------',
    'rider.vehicle.edit': 'WW------',
    'rider.incident.read': 'RRR----R',
    'rider.incident.manage': 'WW------',
    'rider.location.history': 'RR-----R',
    'rider.performance.read': 'RRR-----',
    'rider.performance.manage': 'WW-----W',
    'rider.performance.config': 'WW-----W',
    'rider.wallet.read': 'RRRRR---',
    // ── 6. order + live operations ───────────────────────────────────────
    'order.list': 'RRRRR--R',
    'order.detail.read': 'RRRRR--R',
    'order.cancel': 'WW------',
    'order.address.correct': 'WWR----R',
    'order.force_state': 'DD------',
    'order.issue.resolve': 'WWR-----',
    'order.prescription.decide': 'W-------',
    'order.delivery_proof.read': 'RRRR---R',
    'order.otp.reveal': 'RR------',
    'order.export': 'RR-RR---',
    'ops.map.live': 'RR------',
    'ops.dispatch.manual': 'WW------',
    'ops.anomaly.read': 'RR-R---R',
    'ops.anomaly.resolve': 'WW------',
    'ops.incident.manage': 'WW------',
    // ── 7. money — finance and super only. Nobody else writes. ───────────
    'finance.withdrawal.read': 'RR-RR---',
    'finance.withdrawal.approve': 'D--D----',
    'finance.withdrawal.reject': 'W--W----',
    'finance.wallet.read': 'RR-RR---',
    'finance.wallet.adjust': 'D--D----',
    'finance.remit.verify': 'D--D----',
    'finance.settlement.read': 'RR-R----',
    'finance.settlement.run': 'W--W----',
    'finance.settlement.pay': 'D--D----',
    'finance.settlement.reverse': 'D--D----',
    'finance.reserve.release': 'D--D----',
    'finance.refund.initiate': 'W--W----',
    'finance.refund.approve': 'D--D----',
    'finance.dispute.read': 'RR-R---R',
    'finance.dispute.resolve': 'D--D----',
    'finance.chargeback.read': 'R--R---R',
    'finance.chargeback.open': 'W--W----',
    'finance.chargeback.resolve': 'D--D----',
    'finance.hold.place': 'W--W---W',
    'finance.hold.lift': 'D--D---D',
    'finance.fee_policy.read': 'RR-R----',
    'finance.fee_policy.set': 'D--D----',
    // ── 8. ledger / books ────────────────────────────────────────────────
    'ledger.analytics.read': 'RR-R----',
    'ledger.breakdown.read': 'RR-RR---',
    'ledger.journal.read': 'R--RR---',
    'ledger.trial_balance.read': 'R--RR---',
    'ledger.reconcile.read': 'R--RR---',
    'ledger.reconcile.run': 'W--WR---',
    'ledger.export': 'R--RR---',
    'accounting.chart.manage': 'W--WW---',
    'accounting.period.lock': 'D--DW---',
    'accounting.adjustment.propose': 'W--WW---',
    'accounting.statement.export': 'R--RR---',
    'tax.rule.read': 'R--RR---',
    'tax.rule.manage': 'D--D----',
    'tax.classification.create': 'D--D----',
    'tax.profile.manage': 'D--D----',
    'tax.ledger.read': 'R--RR---',
    'tax.wht.read': 'R--RR---',
    'tax.review.read': 'R--RR---',
    'tax.review.resolve': 'D--D----',
    // ── 9. support / comms ───────────────────────────────────────────────
    'support.queue.read': 'R-R----R',
    'support.thread.read_all': 'R-R-----',
    'support.thread.read_flagged': 'R-RR---R',
    'support.thread.read_ai_live': 'R-R-----',
    'support.claim': 'W-W-----',
    'support.reply.customer': 'W-WW---W',
    'support.reply.internal': 'W-WW---W',
    'support.invite': 'W-W-----',
    'support.participant.remove': 'W-W-----',
    'support.reassign': 'W-------',
    'support.resolve': 'W-W-----',
    'support.return_to_ai': 'W-W-----',
    'support.tool_audit.read': 'R-R----R',
    // AI quality + SLA dashboards. Support and super admin: the people accountable for
    // whether the AI is actually helping. Finance/ops can see individual tickets but the
    // aggregate quality numbers are a support-management concern.
    'support.metrics.read': 'R-R-----',
    // Voice: who may answer in-app support calls (agent softphone) and who may read the
    // call-detail records. Answering is an act (W); CDRs are oversight (R).
    'support.voice.answer': 'WWW-----',
    'support.voice.cdr.read': 'RRR----R',
    // Telegram/broadcast alerting configuration. Super admin and support leads only — it
    // decides who gets paged, so it is not something every rep should be able to change.
    'support.alerting.manage': 'W-W-----',
    'support.macro.manage': 'W-W-----',
    'support.sla.configure': 'W-W-----',
    'support.telegram.link_self': 'WWWWWWWW',
    'support.broadcast_alert.send': 'W-W-----',
    // ── 10. marketing ────────────────────────────────────────────────────
    // The marketing campaign/segment/voucher subsystem was removed (nothing called it —
    // discount codes are catalog promotions). Consent rows live under customer.*.
    // Referral administration still lives under the marketing domain.
    'marketing.referral.manage': 'WW---W--',
    // ── 11. content / brand ──────────────────────────────────────────────
    'content.article.draft': 'W-----WW',
    'content.article.publish': 'W-----WW',
    'content.article.archive': 'W-----WW',
    'content.article.propose': 'W-W-WWWW',
    'content.revision.read': 'R-R---R-',
    'content.revision.revert': 'W-----WW',
    'content.media.upload': 'W----WW-',
    'content.category.manage': 'W-----WW',
    'content.help.manage': 'W-W--W-W',
    'content.legal.manage': 'D-----DD',
    'content.banner.manage': 'WW--WWW-',
    'content.seo.manage': 'W----WW-',
    // ── 12. compliance ───────────────────────────────────────────────────
    'compliance.kyc.read': 'RR-----R',
    'compliance.kyc.decide': 'WW-----W',
    'compliance.document.read': 'RR-----R',
    'compliance.fraud.flag': 'WW-W---W',
    'compliance.hold.place': 'W--W---W',
    'compliance.dsar.handle': 'D------D',
    'compliance.erasure.execute': 'D------D',
    'compliance.breach.register': 'W------W',
    'compliance.breach.notify': 'D------D',
    'compliance.retention.configure': 'D------D',
    'compliance.access_log.review': 'R------R',
    'compliance.complaint.manage': 'W-RR---W',
    // ── 9. marketing campaigns ───────────────────────────────────────────
    'marketing.campaign.read': 'R----R--',
    'marketing.campaign.create': 'W----W--',
    'marketing.campaign.approve': 'D----D--',
    'marketing.campaign.send': 'D----D--',
};
/* ─────────────────────────── helpers ─────────────────────────── */
const CODES = ['R', 'W', 'D', '-'];
/** Throws on any malformed row. Called at module load — a typo is a boot failure. */
function validatePermissionMatrix(matrix = exports.PERMISSION_MATRIX) {
    const width = exports.ADMIN_ROLE_ORDER.length;
    for (const [permission, access] of Object.entries(matrix)) {
        if (!/^[a-z_]+\.[a-z_.]+$/.test(permission)) {
            throw new Error(`Bad permission key "${permission}" — expected <domain>.<resource>.<action>`);
        }
        if (access.length !== width) {
            throw new Error(`Permission "${permission}" has ${access.length} access characters, expected ${width}`);
        }
        for (const ch of access) {
            if (!CODES.includes(ch)) {
                throw new Error(`Permission "${permission}" has an unknown access code "${ch}"`);
            }
        }
    }
}
validatePermissionMatrix();
exports.ALL_PERMISSIONS = Object.keys(exports.PERMISSION_MATRIX);
/** Permissions that require maker-checker. Derived, so it can never drift from the matrix. */
exports.DUAL_CONTROLLED_PERMISSIONS = exports.ALL_PERMISSIONS.filter((p) => exports.PERMISSION_MATRIX[p].includes('D'));
function accessFor(permission, role) {
    const row = exports.PERMISSION_MATRIX[permission];
    if (!row)
        return '-';
    const idx = role ? exports.ADMIN_ROLE_ORDER.indexOf(role) : -1;
    if (idx < 0)
        return '-';
    return row[idx];
}
/**
 * May this admin role perform this permission?
 * 'R', 'W' and 'D' all authorise the call — 'D' additionally means the action must
 * go through the approval queue, which the service layer enforces, not the guard.
 */
function roleHasPermission(role, permission) {
    return accessFor(permission, role) !== '-';
}
/** Every permission a role holds. Drives the console's navigation. */
function permissionsForRole(role) {
    return exports.ALL_PERMISSIONS.filter((p) => roleHasPermission(role, p));
}
/** Read/write/dual/no-access counts per role — asserted in tests so the docs cannot drift. */
function permissionCensus() {
    const out = {};
    for (const role of exports.ADMIN_ROLE_ORDER) {
        let read = 0, write = 0, dual = 0;
        for (const permission of exports.ALL_PERMISSIONS) {
            const a = accessFor(permission, role);
            if (a === 'R')
                read += 1;
            else if (a === 'W')
                write += 1;
            else if (a === 'D')
                dual += 1;
        }
        out[role] = { read, write, dual, total: read + write + dual };
    }
    return out;
}
//# sourceMappingURL=admin-permissions.js.map