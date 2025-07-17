// src/app/api/clients/statistics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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
    const stats = {
      totalClients: count || 0,
      activeClients: 0,
      prospectsCount: 0,
      reviewsDue: 0,
      vulnerableClients: 0,
      highRiskClients: 0,
      recentlyAdded: 0,
      byStatus: {
        prospect: 0,
        active: 0,
        review_due: 0,
        inactive: 0,
        archived: 0
      } as Record<string, number>,
      byRiskLevel: {
        low: 0,
        medium: 0,
        high: 0
      } as Record<string, number>
    };
    
    // Process clients with type-safe approach
    clients?.forEach(client => {
      const status = client.status || 'prospect';
      
      // Direct status counts
      if (status === 'active') stats.activeClients++;
      if (status === 'prospect') stats.prospectsCount++;
      if (status === 'review_due') stats.reviewsDue++;
      
      // Type-safe status counting
      if (status in stats.byStatus) {
        stats.byStatus[status]++;
      }
      
      // Vulnerability count
      if (client.vulnerability_assessment?.is_vulnerable === true) {
        stats.vulnerableClients++;
      }
      
      // Risk level counts
      const riskLevel = client.risk_profile?.riskTolerance || 'medium';
      if (riskLevel === 'high') stats.highRiskClients++;
      
      if (riskLevel in stats.byRiskLevel) {
        stats.byRiskLevel[riskLevel]++;
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
    
    return NextResponse.json({
      success: true,
      ...stats,
      averagePortfolioValue: 0,
      totalAssetsUnderManagement: 0,
      newThisMonth: stats.recentlyAdded,
      clientsByStatus: stats.byStatus,
      clientsByRiskLevel: stats.byRiskLevel
    });
    
  } catch (error) {
    console.error('❌ Statistics error:', error);
    return NextResponse.json(getDefaultStats());
  }
}

function getDefaultStats() {
  return {
    success: true,
    totalClients: 0,
    activeClients: 0,
    prospectsCount: 0,
    reviewsDue: 0,
    vulnerableClients: 0,
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
    },
    averagePortfolioValue: 0,
    totalAssetsUnderManagement: 0,
    newThisMonth: 0,
    clientsByStatus: {
      prospect: 0,
      active: 0,
      review_due: 0,
      inactive: 0,
      archived: 0
    },
    clientsByRiskLevel: {
      low: 0,
      medium: 0,
      high: 0
    }
  };
}