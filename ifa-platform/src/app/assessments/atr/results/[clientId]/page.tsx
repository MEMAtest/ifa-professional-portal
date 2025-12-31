// src/app/assessments/atr/results/[clientId]/page.tsx
// ATR RESULTS VIEWING PAGE - COMPLETE PRODUCTION VERSION - WITH DOCUMENT GENERATION BUTTON

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, differenceInDays } from 'date-fns';
import { 
  Shield, 
  ArrowLeft, 
  Calendar, 
  TrendingUp, 
  FileText, 
  Clock, 
  CheckCircle, 
  RefreshCw,
  Brain,
  Target,
  Activity,
  Heart,
  Eye,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Info
} from 'lucide-react';

// Import DocumentGenerationButton
import DocumentGenerationButton from '@/components/documents/DocumentGenerationButton';

// Types
interface ATRResult {
  id: string;
  client_id: string;
  risk_level: number;
  risk_category: string;
  total_score: number;
  assessment_date: string;
  category_scores?: {
    attitude?: number;
    experience?: number;
    knowledge?: number;
    emotional?: number;
  };
  recommendations?: string[];
  answers?: Record<string, any>;
  notes?: string;
  completed_by?: string;
  version?: number;
  is_current: boolean;
  created_at?: string;
  updated_at?: string;
}

interface ATRHistoryData {
  success: boolean;
  current?: ATRResult;
  versions?: ATRResult[];
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
  riskDistribution?: Record<string, number>;
}

// Simple UI Components (since we're not importing from shadcn)
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

// Main Component
export default function ATRResultsPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.clientId as string;
  
  const [currentResult, setCurrentResult] = useState<ATRResult | null>(null);
  const [displayedResult, setDisplayedResult] = useState<ATRResult | null>(null);
  const [allVersions, setAllVersions] = useState<ATRResult[]>([]);
  const [stats, setStats] = useState<ATRHistoryData['stats'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [showVersionDetails, setShowVersionDetails] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<ATRResult | null>(null);
  const [clientData, setClientData] = useState<any>(null);

  const loadClientData = useCallback(async () => {
    try {
      // Load basic client info for document generation
      const response = await fetch(`/api/clients/${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setClientData(data.client || data);
      }
    } catch (error) {
      console.error('Error loading client data:', error);
      // Non-critical error, don't block the page
    }
  }, [clientId]);

  const loadResults = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load current result
      const currentRes = await fetch(`/api/assessments/atr?clientId=${clientId}`);
      if (!currentRes.ok) {
        throw new Error('Failed to load current ATR assessment');
      }
      const currentData = await currentRes.json();
      
      // Load all versions
      const historyRes = await fetch(`/api/assessments/atr/history?clientId=${clientId}`);
      if (historyRes.ok) {
        const historyData: ATRHistoryData = await historyRes.json();
        setAllVersions(historyData.versions || []);
        setStats(historyData.stats || null);
      }
      
      setCurrentResult(currentData.data);
      setDisplayedResult(currentData.data);
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

  // Sync displayed result with current on initial load
  useEffect(() => {
    if (currentResult && !displayedResult) {
      setDisplayedResult(currentResult);
      setSelectedVersion(currentResult.version || 1);
    }
  }, [currentResult, displayedResult]);

  const handleRetake = () => {
    router.push(`/assessments/atr?clientId=${clientId}`);
  };

  const handleBack = () => {
    router.push(`/assessments/client/${clientId}`);
  };

  // Handle document generation success
  const handleDocumentGenerationSuccess = (docId: string, docUrl?: string) => {
    // Could show a toast or update UI
    console.log('Document generated successfully:', docId);
  };

  // Fixed: Proper risk level colors (green = low risk, red = high risk)
  const getRiskLevelColor = (level: number): string => {
    if (level === 1) return 'text-green-600 bg-green-50';
    if (level === 2) return 'text-lime-600 bg-lime-50';
    if (level === 3) return 'text-yellow-600 bg-yellow-50';
    if (level === 4) return 'text-orange-600 bg-orange-50';
    if (level === 5) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  // Fixed: Proper risk category colors
  const getRiskCategoryColor = (category: string): string => {
    const lowerCategory = category?.toLowerCase() || '';
    if (lowerCategory.includes('very low')) return 'bg-green-500';
    if (lowerCategory.includes('low') && !lowerCategory.includes('very')) return 'bg-lime-500';
    if (lowerCategory.includes('medium')) return 'bg-yellow-500';
    if (lowerCategory.includes('high') && !lowerCategory.includes('very')) return 'bg-orange-500';
    if (lowerCategory.includes('very high')) return 'bg-red-500';
    return 'bg-gray-500';
  };

  const isAssessmentOld = (date: string): boolean => {
    const assessmentDate = new Date(date);
    const daysSince = differenceInDays(new Date(), assessmentDate);
    return daysSince > 365;
  };

  // Handle version selection - actually change displayed data
  const handleVersionSelect = (version: ATRResult) => {
    setDisplayedResult(version);
    setSelectedVersion(version.version || 1);
    setViewingVersion(version);
  };

  // Get client name for document generation
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading ATR results...</p>
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
            <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No ATR Assessment Found</h2>
            <p className="text-gray-600 mb-6">This client has not completed an ATR assessment yet.</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Assessments
              </Button>
              <Button onClick={() => router.push(`/assessments/atr?clientId=${clientId}`)}>
                Start ATR Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use displayedResult for all display, fallback to currentResult
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
            <h1 className="text-3xl font-bold text-gray-900">ATR Assessment Results</h1>
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
            {/* REPLACED Export PDF with DocumentGenerationButton */}
            <DocumentGenerationButton
              assessmentType="atr"
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
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-4 rounded-lg ${getRiskLevelColor(resultToShow.risk_level)}`}>
                <Shield className="h-12 w-12" />
              </div>
              <div>
                <CardTitle className="text-2xl mb-1">{resultToShow.risk_category}</CardTitle>
                <p className="text-gray-600">Risk Level {resultToShow.risk_level}/5</p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-lg px-4 py-2">
                Score: {resultToShow.total_score?.toFixed(1) || '0'}/100
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          {/* Risk Level Visual Indicator - FIXED COLORS */}
          <div className="mb-8">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Risk Tolerance Level</h4>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`flex-1 h-8 rounded-lg flex items-center justify-center font-semibold transition-all ${
                    level <= resultToShow.risk_level
                      ? getRiskCategoryColor(
                          level === 1 ? 'very low' :
                          level === 2 ? 'low' :
                          level === 3 ? 'medium' :
                          level === 4 ? 'high' :
                          'very high'
                        )
                      : 'bg-gray-200'
                  } ${level <= resultToShow.risk_level ? 'text-white' : 'text-gray-400'}`}
                >
                  {level}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Very Low</span>
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
              <span>Very High</span>
            </div>
          </div>

          {/* Category Scores */}
          {resultToShow.category_scores && Object.keys(resultToShow.category_scores).length > 0 && (
            <div className="mb-8">
              <h4 className="text-lg font-semibold mb-4">Category Breakdown</h4>
              <div className="grid md:grid-cols-4 gap-4">
                {Object.entries(resultToShow.category_scores).map(([category, score]) => {
                  const icons: Record<string, any> = {
                    attitude: Target,
                    experience: Brain,
                    knowledge: Activity,
                    emotional: Heart
                  };
                  const Icon = icons[category] || Shield;
                  
                  return (
                    <Card key={category}>
                      <CardContent className="p-4 text-center">
                        <Icon className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                        <p className="text-xs text-gray-500 capitalize mb-1">{category}</p>
                        <p className="text-2xl font-bold">{Number(score).toFixed(1)}</p>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{ width: `${Number(score)}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {resultToShow.recommendations && resultToShow.recommendations.length > 0 && (
            <div className="mb-8">
              <h4 className="text-lg font-semibold mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Investment Recommendations
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
                    onClick={() => handleVersionSelect(version)}
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
                        <p className="font-medium">{version.risk_category}</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(version.assessment_date), 'dd MMM yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Risk Level</p>
                        <p className="font-semibold flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${
                            getRiskCategoryColor(version.risk_category)
                          }`} />
                          Level {version.risk_level}/5
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Score</p>
                        <p className="font-semibold">{version.total_score?.toFixed(1) || '0'}</p>
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
                            isSelectedBar ? 'bg-blue-600' : 'bg-blue-400 hover:bg-blue-500'
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
