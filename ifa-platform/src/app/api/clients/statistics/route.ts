import { createClient } from "@/lib/supabase/server"
// src/app/api/clients/statistics/route.ts
import { NextRequest, NextResponse } from 'next/server';


export const dynamic = 'force-dynamic';

interface ClientStatistics {
  totalClients: number;
  activeClients: number;
  archivedClients: number; // ✅ NEW
  vulnerableClients: number; // ✅ FIXED
  prospectsCount: number;
  reviewsDue: number;
  highRiskClients: number;
  recentlyAdded: number;
  byStatus: Record<string, number>;
  byRiskLevel: Record<string, number>;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  try {
    console.log('📊 GET /api/clients/statistics - Fetching statistics...');
    
    const searchParams = request.nextUrl.searchParams;
    const advisorId = searchParams.get('advisorId');
    
    let query = supabase
      .from('clients')
      .select('*', { count: 'exact' });
    
    if (advisorId) {
      query = query.eq('advisor_id', advisorId);
    }
    
    const { data: clients, error, count } = await query;
    
    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(getDefaultStats());
    }
    
    // Initialize stats with proper types
    const stats: ClientStatistics = {
      totalClients: count || 0,
      activeClients: 0,
      archivedClients: 0, // ✅ NEW
      vulnerableClients: 0,
      prospectsCount: 0,
      reviewsDue: 0,
      highRiskClients: 0,
      recentlyAdded: 0,
      byStatus: {
        prospect: 0,
        active: 0,
        review_due: 0,
        inactive: 0,
        archived: 0
      },
      byRiskLevel: {
        low: 0,
        medium: 0,
        high: 0
      }
    };
    
    // Process clients with comprehensive vulnerability check
    clients?.forEach(client => {
      const status = client.status || 'prospect';
      
      // Direct status counts
      if (status === 'active') stats.activeClients++;
      if (status === 'prospect') stats.prospectsCount++;
      if (status === 'review_due') stats.reviewsDue++;
      if (status === 'archived') stats.archivedClients++; // ✅ NEW
      
      // Type-safe status counting
      if (status in stats.byStatus) {
        stats.byStatus[status]++;
      }
      
      // ✅ FIXED: Comprehensive vulnerability check
      const vulnAssessment = client.vulnerability_assessment;
      if (vulnAssessment) {
        const isVulnerable = 
          vulnAssessment.is_vulnerable === true ||
          vulnAssessment.hasVulnerabilities === true ||
          vulnAssessment.vulnerableClient === true ||
          vulnAssessment.status === 'vulnerable' ||
          vulnAssessment.vulnerabilityScore > 0 ||
          (Array.isArray(vulnAssessment.vulnerabilities) && vulnAssessment.vulnerabilities.length > 0) ||
          (Array.isArray(vulnAssessment.vulnerabilityFactors) && vulnAssessment.vulnerabilityFactors.length > 0) ||
          (Array.isArray(vulnAssessment.vulnerability_factors) && vulnAssessment.vulnerability_factors.length > 0);
        
        if (isVulnerable) {
          stats.vulnerableClients++;
        }
      }
      
      // Risk level counts
      const riskLevel = client.risk_profile?.riskTolerance || 
                       client.risk_profile?.final_risk_category?.toLowerCase() || 
                       'medium';
      if (riskLevel === 'high' || riskLevel === 'very high') stats.highRiskClients++;
      
      const normalizedRiskLevel = riskLevel === 'very high' ? 'high' : 
                                  riskLevel === 'very low' ? 'low' : 
                                  riskLevel;
      if (normalizedRiskLevel in stats.byRiskLevel) {
        stats.byRiskLevel[normalizedRiskLevel]++;
      }
    });
    
    // Recently added (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: recentCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());
    
    stats.recentlyAdded = recentCount || 0;
    
    console.log('✅ Statistics calculated:', stats);
    return NextResponse.json(stats);
    
  } catch (error) {
    console.error('❌ Error in statistics route:', error);
    return NextResponse.json(getDefaultStats());
  }
}

function getDefaultStats(): ClientStatistics {
  return {
    totalClients: 0,
    activeClients: 0,
    archivedClients: 0,
    vulnerableClients: 0,
    prospectsCount: 0,
    reviewsDue: 0,
    highRiskClients: 0,
    recentlyAdded: 0,
    byStatus: {
      prospect: 0,
      active: 0,
      review_due: 0,
      inactive: 0,
      archived: 0
    },
    byRiskLevel: {
      low: 0,
      medium: 0,
      high: 0
    }
  };
}