/**
 * Request body size limits.
 *
 * Fastify's default bodyLimit is 1 MB. The edge already implements the real policy —
 * 1 MB for ordinary routes, 50 MB for the upload paths (see isMediaUploadPath in the
 * gateway) — but that policy was inert, because the framework rejected an oversized body
 * with FST_ERR_CTP_BODY_TOO_LARGE before the exemption could apply (audit F-BUG-11).
 * The product's own upload flows are base64 JSON: KYC selfies, errand receipts, delivery
 * proof photos, prescription scans and catalog media, all of which exceed 1 MB routinely.
 *
 * So the framework limit has to be raised to the highest value any route is allowed to
 * use, and the per-path policy at the edge does the actual narrowing. Only the processes
 * that legitimately receive uploads are widened; everything else keeps Fastify's default,
 * so a service that never takes a file cannot be made to buffer 50 MB.
 */
export declare const MAX_UPLOAD_BODY_BYTES = 50000000;
/** The cap the edge applies to every route that is not an upload path. */
export declare const DEFAULT_BODY_BYTES = 1048576;
//# sourceMappingURL=limits.d.ts.map