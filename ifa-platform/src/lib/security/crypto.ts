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

  // Track if lengths match - but don't return early (timing leak)
  const lengthsMatch = bufferA.length === bufferB.length

  // Always compare against a buffer of the same length as bufferA
  // This ensures constant time regardless of input lengths
  const compareBuffer = lengthsMatch
    ? bufferB
    : Buffer.alloc(bufferA.length) // Zero-filled buffer for mismatched lengths

  // Copy what we can from bufferB into compareBuffer for mismatched lengths
  if (!lengthsMatch) {
    bufferB.copy(compareBuffer, 0, 0, Math.min(bufferA.length, bufferB.length))
  }

  // Always perform the comparison (constant time)
  const contentsMatch = timingSafeEqual(bufferA, compareBuffer)

  // Both length AND contents must match
  return lengthsMatch && contentsMatch
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
