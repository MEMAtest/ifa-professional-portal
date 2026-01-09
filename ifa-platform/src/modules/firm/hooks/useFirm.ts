/**
 * Firm Module - useFirm Hook
 * React Query hook for firm data management
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFirm, updateFirm, uploadFirmLogo, getFirmSeatCount } from '../api/firm.api'
import type { FirmUpdateInput } from '../types/firm.types'

export const FIRM_QUERY_KEY = ['firm']
export const FIRM_SEATS_QUERY_KEY = ['firm', 'seats']

/**
 * Hook to fetch and manage current firm data
 */
export function useFirm() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: FIRM_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await getFirm()
      if (error) throw new Error(error)
      return data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const updateMutation = useMutation({
    mutationFn: async (input: FirmUpdateInput) => {
      const { data, error } = await updateFirm(input)
      if (error) throw new Error(error)
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(FIRM_QUERY_KEY, data)
    },
  })

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const { data, error } = await uploadFirmLogo(file)
      if (error) throw new Error(error)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FIRM_QUERY_KEY })
    },
  })

  return {
    firm: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    updateFirm: updateMutation.mutate,
    updateFirmAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,
    uploadLogo: uploadLogoMutation.mutate,
    uploadLogoAsync: uploadLogoMutation.mutateAsync,
    isUploadingLogo: uploadLogoMutation.isPending,
  }
}

/**
 * Hook to fetch firm seat count
 */
export function useFirmSeats() {
  const query = useQuery({
    queryKey: FIRM_SEATS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await getFirmSeatCount()
      if (error) throw new Error(error)
      return data
    },
    staleTime: 60 * 1000, // 1 minute
  })

  const canAddUser = query.data
    ? query.data.currentSeats < query.data.maxSeats
    : false

  const seatsRemaining = query.data
    ? query.data.maxSeats - query.data.currentSeats
    : 0

  return {
    maxSeats: query.data?.maxSeats ?? 0,
    currentSeats: query.data?.currentSeats ?? 0,
    canAddUser,
    seatsRemaining,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
