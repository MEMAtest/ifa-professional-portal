// src/app/assessments/cfl/results/[clientId]/page.tsx
// CFL RESULTS VIEWING PAGE - COMPLETE PRODUCTION VERSION WITH FIXES

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, differenceInDays } from 'date-fns';
import { 
  TrendingUp, 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  FileText, 
  Clock, 
  CheckCircle, 
  RefreshCw, 
  AlertTriangle,
  Shield,
  PieChart,
  TrendingDown,
  Loader2,
  Info,
  Eye,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

// Import DocumentGenerationButton
import DocumentGenerationButton from '@/components/documents/DocumentGenerationButton';

// Types
interface CFLResult {
  id: string;
  client_id: string;
  capacity_level: number;
  capacity_category: string;
  total_score: number;
  max_loss_percentage: number;
  confidence_level: number;
  monthly_income?: number;
  monthly_expenses?: number;
  emergency_fund?: number;
  other_investments?: number;
  recommendations?: string[];
  assessment_date: string;
  version?: number;
  is_current: boolean;
  notes?: string;
  completed_by?: string;
  created_at?: string;
  updated_at?: string;
}

interface CFLHistoryData {
  success: boolean;
  current?: CFLResult;
  versions?: CFLResult[];
  stats?: {
    totalAssessments: number;
    latestVersion: number;
    averageScore: number;
    scoreProgression: Array<{
      version: number;
      score: number;
      date: string;
    }>;
  };
}

// Simple UI Components
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 border-b border-gray-200 ${className}`}>
    {children}
  </div>
);

const CardContent = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
    {children}
  </h3>
);

const Button = ({ 
  children, 
  onClick, 
  variant = "default",
  size = "default",
  disabled = false,
  className = ""
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: string;
  size?: string;
  disabled?: boolean;
  className?: string;
}) => {
  const variants: Record<string, string> = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
    ghost: "text-gray-700 hover:bg-gray-100",
    destructive: "bg-red-600 text-white hover:bg-red-700"
  };
  
  const sizes: Record<string, string> = {
    default: "px-4 py-2",
    sm: "px-3 py-1.5 text-sm",
    lg: "px-6 py-3"
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg font-medium transition-colors inline-flex items-center justify-center ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

const Badge = ({ children, variant = "default", className = "" }: { children: React.ReactNode; variant?: string; className?: string }) => {
  const variants: Record<string, string> = {
    default: "bg-blue-100 text-blue-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    danger: "bg-red-100 text-red-800",
    secondary: "bg-gray-100 text-gray-800"
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  );
};

const Alert = ({ children, variant = "default", className = "" }: { children: React.ReactNode; variant?: string; className?: string }) => {
  const variants: Record<string, string> = {
    default: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    danger: "bg-red-50 border-red-200 text-red-800",
    success: "bg-green-50 border-green-200 text-green-800"
  };
  
  return (
    <div className={`p-4 rounded-lg border ${variants[variant] || variants.default} ${className}`}>
      {children}
    </div>
  );
};

// Helper function
function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

// FIXED: Proper capacity level colors (green = high capacity, red = low capacity)
const getCapacityLevelColor = (level: number): string => {
  if (level >= 8) return 'bg-green-500';     // High capacity
  if (level >= 6) return 'bg-lime-500';      // Good capacity
  if (level >= 4) return 'bg-yellow-500';    // Medium capacity
  if (level >= 2) return 'bg-orange-500';    // Low capacity
  return 'bg-red-500';                       // Very low capacity
};

const getCapacityLevelTextColor = (level: number): string => {
  if (level >= 8) return 'text-green-600';
  if (level >= 6) return 'text-lime-600';
  if (level >= 4) return 'text-yellow-600';
  if (level >= 2) return 'text-orange-600';
  return 'text-red-600';
};

const getCapacityLevelBgLight = (level: number): string => {
  if (level >= 8) return 'bg-green-50';
  if (level >= 6) return 'bg-lime-50';
  if (level >= 4) return 'bg-yellow-50';
  if (level >= 2) return 'bg-orange-50';
  return 'bg-red-50';
};

const getCapacityCategoryColor = (category: string): string => {
  const lowerCategory = category?.toLowerCase() || '';
  if (lowerCategory.includes('very high')) return 'bg-green-500';
  if (lowerCategory.includes('high') && !lowerCategory.includes('very')) return 'bg-lime-500';
  if (lowerCategory.includes('medium')) return 'bg-yellow-500';
  if (lowerCategory.includes('low') && !lowerCategory.includes('very')) return 'bg-orange-500';
  if (lowerCategory.includes('very low')) return 'bg-red-500';
  return 'bg-gray-500';
};

export default function CFLResultsPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.clientId as string;
  
  const [currentResult, setCurrentResult] = useState<CFLResult | null>(null);
  const [displayedResult, setDisplayedResult] = useState<CFLResult | null>(null); // ADDED: For showing selected version
  const [allVersions, setAllVersions] = useState<CFLResult[]>([]);
  const [stats, setStats] = useState<CFLHistoryData['stats'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [showVersionDetails, setShowVersionDetails] = useState(false);
  const [clientData, setClientData] = useState<any>(null);

  const loadClientData = useCallback(async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setClientData(data.client || data);
      }
    } catch (error) {
      console.error('Error loading client data:', error);
    }
  }, [clientId]);

  const loadResults = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const currentRes = await fetch(`/api/assessments/cfl?clientId=${clientId}`);
      if (!currentRes.ok) {
        throw new Error('Failed to load CFL assessment');
      }
      const currentData = await currentRes.json();
      
      // Load history if endpoint exists
      try {
        const historyRes = await fetch(`/api/assessments/cfl/history?clientId=${clientId}`);
        if (historyRes.ok) {
          const historyData: CFLHistoryData = await historyRes.json();
          setAllVersions(historyData.versions || []);
          setStats(historyData.stats || null);
        }
      } catch (historyError) {
        console.log('History endpoint not available');
        // Set single version if history not available
        if (currentData.data) {
          setAllVersions([currentData.data]);
        }
      }
      
      setCurrentResult(currentData.data);
      setDisplayedResult(currentData.data); // ADDED: Set initial displayed result
    } catch (error) {
      console.error('Error loading results:', error);
      setError(error instanceof Error ? error.message : 'Failed to load results');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (clientId) {
      loadResults();
      loadClientData();
    }
  }, [clientId, loadClientData, loadResults]);

  // ADDED: Sync displayed result with current on initial load
  useEffect(() => {
    if (currentResult && !displayedResult) {
      setDisplayedResult(currentResult);
      setSelectedVersion(currentResult.version || 1);
    }
  }, [currentResult, displayedResult]);

  const handleRetake = () => {
    router.push(`/assessments/cfl?clientId=${clientId}`);
  };

  const handleBack = () => {
    router.push(`/assessments/client/${clientId}`);
  };

  // ADDED: Handle version selection - actually change displayed data
  const handleVersionSelect = (version: CFLResult) => {
    setDisplayedResult(version);
    setSelectedVersion(version.version || 1);
  };

  // Handle document generation success
  const handleDocumentGenerationSuccess = (docId: string, docUrl?: string) => {
    console.log('Document generated successfully:', docId);
  };

  // Get client name and email for document generation
  const getClientName = () => {
    if (!clientData) return '';
    const firstName = clientData.personalDetails?.firstName || clientData.personal_details?.firstName || '';
    const lastName = clientData.personalDetails?.lastName || clientData.personal_details?.lastName || '';
    return `${firstName} ${lastName}`.trim();
  };

  const getClientEmail = () => {
    if (!clientData) return '';
    return clientData.contactInfo?.email || clientData.contact_info?.email || '';
  };

  const isAssessmentOld = (date: string): boolean => {
    const assessmentDate = new Date(date);
    const daysSince = differenceInDays(new Date(), assessmentDate);
    return daysSince > 365;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading CFL results...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Loading Results</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={handleBack}>
                Go Back
              </Button>
              <Button onClick={() => loadResults()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentResult) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="text-center py-12">
            <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No CFL Assessment Found</h2>
            <p className="text-gray-600 mb-6">This client has not completed a CFL assessment yet.</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Assessments
              </Button>
              <Button onClick={() => router.push(`/assessments/cfl?clientId=${clientId}`)}>
                Start CFL Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // CHANGED: Use displayedResult for all display, fallback to currentResult
  const resultToShow = displayedResult || currentResult;
  const isViewingCurrent = selectedVersion === (currentResult?.version || 1);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="outline" onClick={handleBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Assessment Hub
        </Button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Capacity for Loss Results</h1>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="outline" className="text-sm">
                Version {resultToShow.version || 1}
              </Badge>
              <span className="text-gray-600 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Completed {format(new Date(resultToShow.assessment_date), 'dd MMM yyyy')}
              </span>
              {!isViewingCurrent && (
                <Badge variant="warning" className="text-sm">
                  <Eye className="h-3 w-3 mr-1" />
                  Viewing Historical Version
                </Badge>
              )}
              {isViewingCurrent && isAssessmentOld(resultToShow.assessment_date) && (
                <Badge variant="warning" className="text-sm">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Review Due
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            {/* REPLACED Export with DocumentGenerationButton */}
            <DocumentGenerationButton
              assessmentType="cfl"
              assessmentId={resultToShow.id}
              clientId={clientId}
              clientName={getClientName()}
              clientEmail={getClientEmail()}
              onSuccess={handleDocumentGenerationSuccess}
            />
            <Button onClick={handleRetake}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retake Assessment
            </Button>
          </div>
        </div>
      </div>

      {/* Main Result Card */}
      <Card className="mb-6">
        <CardHeader className={`bg-gradient-to-r from-green-50 to-emerald-50`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-4 rounded-lg ${getCapacityLevelBgLight(resultToShow.capacity_level)}`}>
                <TrendingUp className={`h-12 w-12 ${getCapacityLevelTextColor(resultToShow.capacity_level)}`} />
              </div>
              <div>
                <CardTitle className="text-2xl mb-1">{resultToShow.capacity_category}</CardTitle>
                <p className="text-gray-600">Capacity Level {resultToShow.capacity_level}/10</p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-lg px-4 py-2">
                Max Loss: {resultToShow.max_loss_percentage}%
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          {/* Financial Metrics */}
          {(resultToShow.monthly_income || resultToShow.monthly_expenses || resultToShow.emergency_fund || resultToShow.other_investments) && (
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              {resultToShow.monthly_income !== undefined && (
                <Card>
                  <CardContent className="p-4 text-center">
                    <DollarSign className="h-5 w-5 text-green-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Monthly Income</p>
                    <p className="text-lg font-bold">£{resultToShow.monthly_income.toLocaleString()}</p>
                  </CardContent>
                </Card>
              )}
              {resultToShow.monthly_expenses !== undefined && (
                <Card>
                  <CardContent className="p-4 text-center">
                    <DollarSign className="h-5 w-5 text-red-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Monthly Expenses</p>
                    <p className="text-lg font-bold">£{resultToShow.monthly_expenses.toLocaleString()}</p>
                  </CardContent>
                </Card>
              )}
              {resultToShow.emergency_fund !== undefined && (
                <Card>
                  <CardContent className="p-4 text-center">
                    <Shield className="h-5 w-5 text-yellow-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Emergency Fund</p>
                    <p className="text-lg font-bold">£{resultToShow.emergency_fund.toLocaleString()}</p>
                  </CardContent>
                </Card>
              )}
              {resultToShow.confidence_level !== undefined && (
                <Card>
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="h-5 w-5 text-blue-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Confidence</p>
                    <p className="text-lg font-bold">{resultToShow.confidence_level}%</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Capacity Level Indicator - FIXED COLORS */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Capacity Level</h4>
            <div className="flex items-center space-x-1">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-1 h-8 rounded transition-all",
                    i < resultToShow.capacity_level
                      ? getCapacityLevelColor(i + 1)
                      : 'bg-gray-200'
                  )}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Low Capacity</span>
              <span>Medium Capacity</span>
              <span>High Capacity</span>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <PieChart className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500 mb-1">CFL Score</p>
                <p className="text-2xl font-bold text-blue-600">{resultToShow.total_score?.toFixed(1) || '0'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingDown className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500 mb-1">Max Loss Tolerance</p>
                <p className="text-2xl font-bold text-orange-600">{resultToShow.max_loss_percentage}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500 mb-1">Confidence Level</p>
                <p className="text-2xl font-bold text-green-600">{resultToShow.confidence_level}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          {resultToShow.recommendations && resultToShow.recommendations.length > 0 && (
            <div className="mb-8">
              <h4 className="text-lg font-semibold mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Recommendations
              </h4>
              <div className="space-y-3">
                {resultToShow.recommendations.map((rec: string, idx: number) => (
                  <div key={idx} className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {resultToShow.notes && (
            <Alert variant="default" className="mb-6">
              <Info className="h-4 w-4" />
              <div className="ml-2">
                <p className="font-medium">Assessment Notes</p>
                <p className="text-sm mt-1">{resultToShow.notes}</p>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Version History - FIXED: Now clickable and loads data */}
      {allVersions && allVersions.length > 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Assessment History
              </CardTitle>
              {allVersions.length > 2 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVersionDetails(!showVersionDetails)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showVersionDetails ? 'Hide' : 'Show'} Details
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allVersions.map((version) => {
                const isSelected = selectedVersion === version.version;
                const isCurrent = version.is_current;
                
                return (
                  <div 
                    key={version.id}
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${
                      isSelected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-400' :
                      isCurrent ? 'border-blue-300 bg-blue-50/50' :
                      'hover:bg-gray-50 border-gray-200'
                    }`}
                    onClick={() => handleVersionSelect(version)} // FIXED: Now loads the version data
                  >
                    <div className="flex items-center space-x-3">
                      <Badge variant={isCurrent ? "default" : "secondary"}>
                        v{version.version || 1}
                      </Badge>
                      {isSelected && (
                        <Badge variant="outline" className="text-xs bg-blue-100">
                          Currently Viewing
                        </Badge>
                      )}
                      <div>
                        <p className="font-medium">{version.capacity_category}</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(version.assessment_date), 'dd MMM yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Capacity Level</p>
                        <p className="font-semibold flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${
                            getCapacityCategoryColor(version.capacity_category)
                          }`} />
                          Level {version.capacity_level}/10
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Max Loss</p>
                        <p className="font-semibold">{version.max_loss_percentage}%</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Notice when viewing historical version */}
            {!isViewingCurrent && (
              <Alert variant="warning" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <div className="ml-2">
                  <p className="font-medium">Viewing Historical Version {selectedVersion}</p>
                  <p className="text-sm mt-1">
                    You are viewing a previous assessment version. 
                    <button 
                      className="underline ml-1 hover:text-yellow-900"
                      onClick={() => handleVersionSelect(currentResult)}
                    >
                      Return to current version
                    </button>
                  </p>
                </div>
              </Alert>
            )}

            {/* Score Progression Chart (if stats available) */}
            {stats && stats.scoreProgression && stats.scoreProgression.length > 1 && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h5 className="text-sm font-medium text-gray-700 mb-3">Score Progression</h5>
                <div className="flex items-end justify-between h-32 gap-2">
                  {stats.scoreProgression.map((item, idx) => {
                    const height = (item.score / 100) * 100;
                    const isSelectedBar = item.version === selectedVersion;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center justify-end">
                        <div 
                          className={`w-full rounded-t transition-colors cursor-pointer ${
                            isSelectedBar ? 'bg-green-600' : 'bg-green-400 hover:bg-green-500'
                          }`}
                          style={{ height: `${height}%` }}
                          title={`v${item.version}: ${item.score.toFixed(1)}`}
                          onClick={() => {
                            const versionData = allVersions.find(v => v.version === item.version);
                            if (versionData) handleVersionSelect(versionData);
                          }}
                        />
                        <span className={`text-xs mt-1 ${isSelectedBar ? 'font-bold' : ''}`}>
                          v{item.version}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
