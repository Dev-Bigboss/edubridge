/**
 * Versions of the published legal documents (ONB-4). Bump the date when a document's text
 * changes; the backend then marks every user `consent_required` until they accept the new one.
 * The backend keeps the same values and rejects stale ones with 409 LEGAL_VERSION_OUTDATED.
 */
export const LEGAL_VERSIONS = { terms: "2026-11-01", privacy: "2026-11-01" } as const;
