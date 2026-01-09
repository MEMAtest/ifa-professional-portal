/**
 * Firm Module - useFirmUsers Hook
 * React Query hooks for user management
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getFirmUsers,
  getUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  changeUserRole,
  getAdvisorCaseloads,
  reassignClients,
  sendPasswordReset,
} from '../api/user.api'
import {
  getPendingInvitations,
  inviteUser,
  resendInvitation,
  cancelInvitation,
} from '../api/invite.api'
import type { FirmUserUpdateInput, ReassignClientsInput, InviteUserInput } from '../types/user.types'
import { FIRM_SEATS_QUERY_KEY } from './useFirm'

export const FIRM_USERS_QUERY_KEY = ['firm', 'users']
export const FIRM_INVITATIONS_QUERY_KEY = ['firm', 'invitations']
export const FIRM_CASELOADS_QUERY_KEY = ['firm', 'caseloads']

/**
 * Hook to fetch all users in the firm
 */
export function useFirmUsers() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: FIRM_USERS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await getFirmUsers()
      if (error) throw new Error(error)
      return data
    },
    staleTime: 60 * 1000, // 1 minute
  })

  const updateMutation = useMutation({
    mutationFn: async ({ userId, input }: { userId: string; input: FirmUserUpdateInput }) => {
      const { data, error } = await updateUser(userId, input)
      if (error) throw new Error(error)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FIRM_USERS_QUERY_KEY })
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await deactivateUser(userId)
      if (error) throw new Error(error)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FIRM_USERS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: FIRM_SEATS_QUERY_KEY })
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await reactivateUser(userId)
      if (error) throw new Error(error)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FIRM_USERS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: FIRM_SEATS_QUERY_KEY })
    },
  })

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'advisor' | 'supervisor' | 'admin' }) => {
      const { data, error } = await changeUserRole(userId, role)
      if (error) throw new Error(error)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FIRM_USERS_QUERY_KEY })
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await sendPasswordReset(userId)
      if (error) throw new Error(error)
      return data
    },
  })

  // Filter helpers
  const activeUsers = query.data?.filter((u) => u.status === 'active') ?? []
  const deactivatedUsers = query.data?.filter((u) => u.status === 'deactivated') ?? []
  const advisors = query.data?.filter((u) => u.role === 'advisor' && u.status === 'active') ?? []
  const supervisors = query.data?.filter((u) => u.role === 'supervisor' && u.status === 'active') ?? []
  const admins = query.data?.filter((u) => u.role === 'admin' && u.status === 'active') ?? []

  return {
    users: query.data ?? [],
    activeUsers,
    deactivatedUsers,
    advisors,
    supervisors,
    admins,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    // Mutations
    updateUser: updateMutation.mutate,
    updateUserAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deactivateUser: deactivateMutation.mutate,
    deactivateUserAsync: deactivateMutation.mutateAsync,
    isDeactivating: deactivateMutation.isPending,
    reactivateUser: reactivateMutation.mutate,
    isReactivating: reactivateMutation.isPending,
    changeRole: changeRoleMutation.mutate,
    isChangingRole: changeRoleMutation.isPending,
    sendPasswordReset: resetPasswordMutation.mutate,
    isSendingReset: resetPasswordMutation.isPending,
  }
}

/**
 * Hook to fetch a single user
 */
export function useUser(userId: string) {
  return useQuery({
    queryKey: [...FIRM_USERS_QUERY_KEY, userId],
    queryFn: async () => {
      const { data, error } = await getUser(userId)
      if (error) throw new Error(error)
      return data
    },
    enabled: !!userId,
  })
}

/**
 * Hook to manage user invitations
 */
export function useUserInvitations() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: FIRM_INVITATIONS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await getPendingInvitations()
      if (error) throw new Error(error)
      return data
    },
    staleTime: 60 * 1000,
  })

  const inviteMutation = useMutation({
    mutationFn: async (input: InviteUserInput) => {
      const { data, error } = await inviteUser(input)
      if (error) throw new Error(error)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FIRM_INVITATIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: FIRM_SEATS_QUERY_KEY })
    },
  })

  const resendMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await resendInvitation(invitationId)
      if (error) throw new Error(error)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FIRM_INVITATIONS_QUERY_KEY })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await cancelInvitation(invitationId)
      if (error) throw new Error(error)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FIRM_INVITATIONS_QUERY_KEY })
    },
  })

  return {
    invitations: query.data ?? [],
    isLoading: query.isLoading,
    isLoadingInvitations: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    // Mutations
    inviteUser: inviteMutation.mutate,
    inviteUserAsync: inviteMutation.mutateAsync,
    isInviting: inviteMutation.isPending,
    inviteError: inviteMutation.error,
    resendInvitation: resendMutation.mutate,
    resendInviteAsync: resendMutation.mutateAsync,
    isResending: resendMutation.isPending,
    cancelInvitation: cancelMutation.mutate,
    cancelInviteAsync: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
  }
}

/**
 * Hook to fetch advisor caseloads
 */
export function useAdvisorCaseloads() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: FIRM_CASELOADS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await getAdvisorCaseloads()
      if (error) throw new Error(error)
      return data
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  const reassignMutation = useMutation({
    mutationFn: async (input: ReassignClientsInput) => {
      const { data, error } = await reassignClients(input)
      if (error) throw new Error(error)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FIRM_CASELOADS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })

  return {
    caseloads: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    reassignClients: reassignMutation.mutate,
    reassignClientsAsync: reassignMutation.mutateAsync,
    isReassigning: reassignMutation.isPending,
  }
}
