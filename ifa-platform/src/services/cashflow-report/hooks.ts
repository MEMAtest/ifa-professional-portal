import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EnhancedCashFlowReportService } from '@/services/EnhancedCashFlowReportService'
import type { EnhancedReportOptions, ReportProgress } from '@/services/cashflow-report/types'
import clientLogger from '@/lib/logging/clientLogger'

export const useReportGeneration = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      scenarioId: string
      templateType: 'cashflow' | 'suitability' | 'review'
      options: EnhancedReportOptions
      onProgress?: (progress: ReportProgress) => void
    }) => {
      const service = EnhancedCashFlowReportService.getInstance()
      return service.generateCompleteReport(
        params.scenarioId,
        params.templateType,
        params.options,
        params.onProgress
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['report-history'] })
    },
    onError: (error) => {
      clientLogger.error('Report generation failed:', error)
    }
  })
}

export const useReportHistory = (clientId: string) => {
  return useQuery({
    queryKey: ['report-history', clientId],
    queryFn: async () => {
      const service = EnhancedCashFlowReportService.getInstance()
      return service.getReportHistory(clientId)
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  })
}

export const useReportPreview = (
  scenarioId: string,
  templateType: 'cashflow' | 'suitability' | 'review',
  options: EnhancedReportOptions
) => {
  return useQuery({
    queryKey: ['report-preview', scenarioId, templateType, options],
    queryFn: async () => {
      const service = EnhancedCashFlowReportService.getInstance()
      return service.generateReportPreview(scenarioId, templateType, options)
    },
    enabled: !!scenarioId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  })
}
