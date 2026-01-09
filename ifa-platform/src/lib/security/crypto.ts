/**
 * Cryptographic Utilities for Security
 *
 * Provides secure token generation, hashing, and comparison.
 */

import { randomBytes, createHash, timingSafeEqual } from 'crypto'

/**
 * Generate a cryptographically secure random token
 * @param bytes Number of bytes (default 32 = 256 bits)
 * @returns Hex-encoded token string
 */
export function generateSecureToken(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex')
}

/**
 * Hash a token using SHA-256
 * @param token Plain text token
 * @returns SHA-256 hash of the token
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Constant-time comparison of two strings
 * Prevents timing attacks by always taking the same time regardless of match
 * @param a First string
 * @param b Second string
 * @returns true if strings are equal
 */
export function constantTimeCompare(a: string, b: string): boolean {
  // Convert to buffers for timing-safe comparison
  const bufferA = Buffer.from(a)
  const bufferB = Buffer.from(b)

  // If lengths differ, compare with same-length buffer to avoid timing leak
  if (bufferA.length !== bufferB.length) {
    // Create a buffer of same length as A to compare against
    // This ensures constant time even for different lengths
    const paddedB = Buffer.alloc(bufferA.length)
    bufferB.copy(paddedB, 0, 0, Math.min(bufferA.length, bufferB.length))
    timingSafeEqual(bufferA, paddedB)
    return false
  }

  return timingSafeEqual(bufferA, bufferB)
}

/**
 * Verify a token against its hash using constant-time comparison
 * @param plainToken The plain text token to verify
 * @param hashedToken The hashed token from storage
 * @returns true if the token matches
 */
export function verifyToken(plainToken: string, hashedToken: string): boolean {
  const tokenHash = hashToken(plainToken)
  return constantTimeCompare(tokenHash, hashedToken)
}

/**
 * Generate a token and its hash
 * @returns Object with plain token (for URL) and hashed token (for storage)
 */
export function generateTokenPair(): { token: string; hashedToken: string } {
  const token = generateSecureToken()
  const hashedToken = hashToken(token)
  return { token, hashedToken }
}
