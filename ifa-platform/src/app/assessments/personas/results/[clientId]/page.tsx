// src/app/assessments/personas/results/[clientId]/page.tsx
// PERSONA RESULTS VIEWING PAGE - COMPLETE PRODUCTION VERSION WITH FIXES

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, differenceInDays } from 'date-fns';
import { 
  Users, 
  ArrowLeft, 
  Calendar, 
  Brain, 
  Heart, 
  Target, 
  Shield, 
  Clock, 
  CheckCircle, 
  RefreshCw,
  Eye,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { investorPersonas } from '@/data/investorPersonas';

// Import DocumentGenerationButton
import DocumentGenerationButton from '@/components/documents/DocumentGenerationButton';

// Types
interface PersonaResult {
  id: string;
  client_id: string;
  persona_level: string;
  persona_type: string;
  confidence: number;
  scores: { [level: string]: number };
  motivations: string[];
  fears: string[];
  psychological_profile: any;
  communication_needs: any;
  consumer_duty_alignment: any;
  assessment_date: string;
  version?: number;
  is_current: boolean;
  notes?: string;
  completed_by?: string;
  created_at?: string;
  updated_at?: string;
}

interface PersonaHistoryData {
  success: boolean;
  current?: PersonaResult;
  versions?: PersonaResult[];
  stats?: {
    totalAssessments: number;
    latestVersion: number;
    averageConfidence: number;
    personaProgression: Array<{
      version: number;
      type: string;
      level: string;
      confidence: number;
      date: string;
    }>;
  };
  personaDistribution?: Record<string, number>;
  personaChanges?: Array<{
    fromVersion: number;
    toVersion: number;
    fromType: string;
    toType: string;
    date: string;
  }>;
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

export default function PersonaResultsPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.clientId as string;
  
  const [currentResult, setCurrentResult] = useState<PersonaResult | null>(null);
  const [displayedResult, setDisplayedResult] = useState<PersonaResult | null>(null); // ADDED for version switching
  const [allVersions, setAllVersions] = useState<PersonaResult[]>([]);
  const [stats, setStats] = useState<PersonaHistoryData['stats'] | null>(null);
  const [personaChanges, setPersonaChanges] = useState<PersonaHistoryData['personaChanges']>([]);
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

      const currentRes = await fetch(`/api/assessments/persona?clientId=${clientId}`);
      if (!currentRes.ok) {
        throw new Error('Failed to load Persona assessment');
      }
      const currentData = await currentRes.json();
      
      // Load history
      try {
        const historyRes = await fetch(`/api/assessments/persona/history?clientId=${clientId}`);
        if (historyRes.ok) {
          const historyData: PersonaHistoryData = await historyRes.json();
          setAllVersions(historyData.versions || []);
          setStats(historyData.stats || null);
          setPersonaChanges(historyData.personaChanges || []);
        }
      } catch (historyError) {
        console.log('History endpoint not available');
        if (currentData.data) {
          setAllVersions([currentData.data]);
        }
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
    router.push(`/assessments/persona-assessment?clientId=${clientId}`);
  };

  const handleBack = () => {
    router.push(`/assessments/client/${clientId}`);
  };

  // ADDED: Handle version selection - actually change displayed data
  const handleVersionSelect = (version: PersonaResult) => {
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
            <p className="text-gray-600">Loading persona results...</p>
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
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Persona Assessment Found</h2>
            <p className="text-gray-600 mb-6">This client has not completed a persona assessment yet.</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Assessments
              </Button>
              <Button onClick={() => router.push(`/assessments/persona-assessment?clientId=${clientId}`)}>
                Start Persona Assessment
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
  const persona = investorPersonas[resultToShow.persona_level];

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
            <h1 className="text-3xl font-bold text-gray-900">Investor Persona Results</h1>
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
            {/* ADDED DocumentGenerationButton */}
            <DocumentGenerationButton
              assessmentType="persona"
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
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="text-center">
            <div className="text-6xl mb-4">{persona?.avatar || '👤'}</div>
            <CardTitle className="text-2xl mb-2">{resultToShow.persona_type}</CardTitle>
            <p className="text-gray-600">{persona?.description}</p>
            <div className="flex justify-center gap-2 mt-3">
              <Badge variant="default">
                {resultToShow.confidence}% match confidence
              </Badge>
              <Badge variant="outline">
                Level {resultToShow.persona_level}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
          {/* Key Characteristics */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="flex items-center space-x-2 font-semibold text-green-900">
                <Target className="h-5 w-5" />
                <span>Key Motivations</span>
              </h4>
              <ul className="space-y-2">
                {resultToShow.motivations.map((motivation: string, i: number) => (
                  <li key={i} className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{motivation}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="flex items-center space-x-2 font-semibold text-red-900">
                <Shield className="h-5 w-5" />
                <span>Key Concerns</span>
              </h4>
              <ul className="space-y-2">
                {resultToShow.fears.map((fear: string, i: number) => (
                  <li key={i} className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{fear}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Psychological Profile */}
          {resultToShow.psychological_profile && (
            <div className="space-y-4">
              <h4 className="flex items-center space-x-2 font-semibold text-blue-900">
                <Brain className="h-5 w-5" />
                <span>Your Investment Psychology</span>
              </h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {resultToShow.psychological_profile.decisionMaking && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <strong className="text-blue-900">Decision Making:</strong>
                    <p className="text-blue-800 mt-1">{resultToShow.psychological_profile.decisionMaking}</p>
                  </div>
                )}
                {resultToShow.psychological_profile.stressResponse && (
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <strong className="text-purple-900">Stress Response:</strong>
                    <p className="text-purple-800 mt-1">{resultToShow.psychological_profile.stressResponse}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Communication Preferences */}
          {resultToShow.communication_needs && (
            <div className="space-y-4">
              <h4 className="flex items-center space-x-2 font-semibold text-purple-900">
                <Heart className="h-5 w-5" />
                <span>Communication Preferences</span>
              </h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm bg-purple-50 p-4 rounded-lg">
                {resultToShow.communication_needs.frequency && (
                  <div>
                    <strong>Frequency:</strong> {resultToShow.communication_needs.frequency}
                  </div>
                )}
                {resultToShow.communication_needs.style && (
                  <div>
                    <strong>Style:</strong> {resultToShow.communication_needs.style}
                  </div>
                )}
                {resultToShow.communication_needs.format && (
                  <div>
                    <strong>Format:</strong> {resultToShow.communication_needs.format}
                  </div>
                )}
                {resultToShow.communication_needs.meetingPreference && (
                  <div>
                    <strong>Meeting Preference:</strong> {resultToShow.communication_needs.meetingPreference}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Score Breakdown */}
          {resultToShow.scores && Object.keys(resultToShow.scores).length > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold">Score Breakdown</h4>
              <div className="space-y-2">
                {Object.entries(resultToShow.scores).map(([level, score]) => {
                  const levelPersona = investorPersonas[level];
                  const maxScore = Math.max(...Object.values(resultToShow.scores).map(s => Number(s)));
                  const percentage = maxScore > 0 ? (Number(score) / maxScore) * 100 : 0;
                  
                  return (
                    <div key={level} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{levelPersona?.avatar || '👤'}</span>
                        <span className="text-sm font-medium">{levelPersona?.type || `Level ${level}`}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              level === resultToShow.persona_level ? 'bg-indigo-600' : 'bg-gray-400'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-12">{score} pts</span>
                      </div>
                    </div>
                  );
                })}
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
                const versionPersona = investorPersonas[version.persona_level];
                
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
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{versionPersona?.avatar || '👤'}</span>
                        <div>
                          <p className="font-medium">{version.persona_type}</p>
                          <p className="text-sm text-gray-600">
                            {format(new Date(version.assessment_date), 'dd MMM yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Confidence</p>
                        <p className="font-semibold">{version.confidence}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Level</p>
                        <p className="font-semibold">{version.persona_level}</p>
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

            {/* Persona Changes Over Time */}
            {personaChanges && personaChanges.length > 0 && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h5 className="text-sm font-medium text-gray-700 mb-3">Persona Evolution</h5>
                <div className="space-y-2">
                  {personaChanges.map((change, idx) => (
                    <div key={idx} className="text-sm flex items-center gap-2">
                      <span className="text-gray-500">v{change.fromVersion}</span>
                      <span className="font-medium">{change.fromType}</span>
                      <ChevronRight className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-500">v{change.toVersion}</span>
                      <span className="font-medium">{change.toType}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
