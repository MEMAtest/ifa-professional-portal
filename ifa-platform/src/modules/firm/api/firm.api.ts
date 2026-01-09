/**
 * Firm Module - Firm API Client
 * Client-side API functions for firm operations
 */

import type { Firm, FirmUpdateInput } from '../types/firm.types'

const API_BASE = '/api/firm'

export interface FirmApiResponse<T> {
  data?: T
  error?: string
}

/**
 * Get current user's firm
 */
export async function getFirm(): Promise<FirmApiResponse<Firm>> {
  try {
    const response = await fetch(API_BASE, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const error = await response.json()
      return { error: error.message || 'Failed to fetch firm' }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' }
  }
}

/**
 * Update firm settings
 */
export async function updateFirm(input: FirmUpdateInput): Promise<FirmApiResponse<Firm>> {
  try {
    const response = await fetch(API_BASE, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.json()
      return { error: error.message || 'Failed to update firm' }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' }
  }
}

/**
 * Upload firm logo
 */
export async function uploadFirmLogo(file: File): Promise<FirmApiResponse<{ logoUrl: string }>> {
  try {
    const formData = new FormData()
    formData.append('logo', file)

    const response = await fetch(`${API_BASE}/logo`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      return { error: error.message || 'Failed to upload logo' }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' }
  }
}

/**
 * Get firm seat count
 */
export async function getFirmSeatCount(): Promise<FirmApiResponse<{ maxSeats: number; currentSeats: number }>> {
  try {
    const response = await fetch(`${API_BASE}/seats`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const error = await response.json()
      return { error: error.message || 'Failed to fetch seat count' }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' }
  }
}
