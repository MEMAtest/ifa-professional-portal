/**
 * Cross-Tenant Isolation E2E Test - Type Definitions
 *
 * Defines the shape of per-firm context objects used throughout the
 * setup, teardown, and spec files. Each firm gets its own user,
 * auth token, and a full set of seeded entity IDs so tests can
 * assert that one firm's token cannot reach another firm's data.
 */

export interface FirmContext {
  /** Primary key in the `firms` table */
  firmId: string
  /** Primary key in `auth.users` / `profiles` */
  userId: string
  /** JWT access token obtained via signInWithPassword */
  token: string
  /** Email used for the test user */
  email: string
  /** ID of the seeded client row owned by this firm */
  clientId: string
  /** ID of the seeded document row owned by this firm */
  documentId: string
  /** ID of the seeded assessment row owned by this firm */
  assessmentId: string
  /** ID of the seeded task row owned by this firm */
  taskId: string
  /** ID of the seeded review row owned by this firm */
  reviewId: string
  /** ID of the seeded communication row owned by this firm */
  communicationId: string
}

export interface TestTenants {
  firmA: FirmContext
  firmB: FirmContext
  firmC: FirmContext
}
