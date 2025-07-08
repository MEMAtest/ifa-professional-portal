'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  BarChart3, 
  User,
  Calculator,
  FileText,
  Target,
  Brain,
  Activity,
  Info,
  ChevronDown,
  MapPin
} from 'lucide-react';

// Import data and services
import { atrQuestions } from '@/data/atrQuestions';
import { investorPersonas } from '@/data/investorPersonas';

// Types
interface AssessmentAnswers {
  [key: string]: number;
}

interface ClientData {
  name?: string;
  age?: number;
  investmentAmount?: number;
  occupation?: string;
  maritalStatus?: string;
  partnerName?: string;
  partnerAge?: number;
  dependents?: number;
  annualIncome?: number;
  address?: string;
  postcode?: string;
  employmentStatus?: string;
  employerName?: string;
  fees?: number;
  monthlySavings?: number;
  targetRetirementAge?: number;
}

interface RiskMetrics {
  atrScore: number;
  cflScore: number;
  finalRiskProfile: number;
  riskReconciliation?: string;
  netInvestment?: number;
  annualSavings?: number;
  yearsToRetirement?: number;
}

interface UnifiedAssessmentData {
  atr: AssessmentAnswers;
  cfl: AssessmentAnswers;
  persona: AssessmentAnswers;
  clientData: ClientData;
  riskMetrics: RiskMetrics;
  integrationStatus: {
    dataLinked: boolean;
    profileCalculated: boolean;
    personaMatched: boolean;
    readyForAdvice: boolean;
  };
}

// Simple UI Components (to replace missing imports)
const Badge = ({ children, variant = "default" }: { children: React.ReactNode; variant?: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
    variant === "default" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
  }`}>
    {children}
  </span>
);

const Button = ({ 
  children, 
  onClick, 
  disabled = false, 
  variant = "default",
  className = ""
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  disabled?: boolean;
  variant?: string;
  className?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
      variant === "outline" 
        ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50" 
        : "bg-blue-600 text-white hover:bg-blue-700"
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
  >
    {children}
  </button>
);

const Card = ({ children, className = "", ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) => (
  <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`} {...props}>
    {children}
  </div>
);

const Progress = ({ value, className = "" }: { value: number; className?: string }) => (
  <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
    <div 
      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

// INFO TOOLTIP COMPONENT
const InfoTooltip = ({ text, className = "" }: { text: string; className?: string }) => (
  <div className={`group relative inline-block ${className}`}>
    <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
    <div className="opacity-0 group-hover:opacity-100 absolute z-10 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-sm transition-opacity duration-300 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64">
      {text}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
    </div>
  </div>
);

// DROPDOWN COMPONENT
const Dropdown = ({ 
  value, 
  onChange, 
  options, 
  placeholder = "Select...",
  className = ""
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 border border-gray-300 rounded-lg bg-white text-left flex justify-between items-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <span className={value ? "text-gray-900" : "text-gray-500"}>
          {value ? options.find(opt => opt.value === value)?.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ADDRESS SEARCH COMPONENT WITH REAL UK ORDNANCE SURVEY API
const AddressSearch = ({ 
  value, 
  onChange, 
  onAddressSelect,
  className = ""
}: {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (address: string) => void;
  className?: string;
}) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // UK Address Search using secure API route
  const searchAddresses = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      // Call our secure API route instead of direct OS API
      const response = await fetch(`/api/search-address?query=${encodeURIComponent(query)}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          setSuggestions(data.results);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } else {
        console.warn('Address API Error:', response.status, response.statusText);
        // Fallback to basic mock data
        const mockAddresses = generateClientMockAddresses(query);
        setSuggestions(mockAddresses);
        setShowSuggestions(mockAddresses.length > 0);
      }
    } catch (error) {
      console.error('Address search error:', error);
      // Fallback to basic mock data
      const mockAddresses = generateClientMockAddresses(query);
      setSuggestions(mockAddresses);
      setShowSuggestions(mockAddresses.length > 0);
    } finally {
      setIsLoading(false);
    }
  };

  // Minimal client-side fallback (last resort)
  const generateClientMockAddresses = (query: string) => {
    const basicLocations = [
      { name: "London", county: "Greater London", postcode: "SW1A 1AA" },
      { name: "Manchester", county: "Greater Manchester", postcode: "M1 1AA" },
      { name: "Birmingham", county: "West Midlands", postcode: "B1 1AA" }
    ];

    return basicLocations
      .filter(location => 
        location.name.toLowerCase().includes(query.toLowerCase()) ||
        location.postcode.toLowerCase().includes(query.toLowerCase())
      )
      .map(location => ({
        displayName: location.name,
        fullAddress: `${location.name}, ${location.county}`,
        postcode: location.postcode,
        type: 'City',
        coordinates: { lat: 51.5074, lng: -0.1278 }
      }));
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (value && value.length >= 2) searchAddresses(value);
    }, 300); // Faster response for better UX
    return () => clearTimeout(debounce);
  }, [value]);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter postcode, city, or address"
        />
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                onAddressSelect(suggestion.fullAddress);
                setShowSuggestions(false);
                // Auto-populate postcode if available
                if (suggestion.postcode) {
                  // This will be handled by the parent component
                }
              }}
              className="w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0"
            >
              <div className="flex flex-col">
                <span className="font-medium text-gray-900">{suggestion.displayName}</span>
                <span className="text-sm text-gray-600">{suggestion.fullAddress}</span>
                <div className="flex items-center space-x-3 mt-1">
                  {suggestion.postcode && (
                    <span className="text-xs text-blue-600">📮 {suggestion.postcode}</span>
                  )}
                  <span className="text-xs text-gray-500">{suggestion.type}</span>
                </div>
              </div>
            </button>
          ))}
          
          {/* API Attribution */}
          <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500 text-center">
            Powered by OS Data © Crown copyright and database rights 2024
          </div>
        </div>
      )}
      
      {/* No results message */}
      {showSuggestions && suggestions.length === 0 && !isLoading && value.length >= 3 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm">
          No addresses found. Try a different search term.
        </div>
      )}
    </div>
  );
};

// STICKY HEADER COMPONENT
const StickyAssessmentHeader = ({ 
  title, 
  progress, 
  currentStep, 
  totalSteps 
}: { 
  title: string; 
  progress: number; 
  currentStep: number; 
  totalSteps: number; 
}) => (
  <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
    <div className="max-w-6xl mx-auto px-6 py-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        <span className="text-sm text-gray-500">
          Step {currentStep} of {totalSteps}
        </span>
      </div>
      <div className="flex items-center space-x-4">
        <Progress value={progress} className="flex-1" />
        <span className="text-sm font-medium text-gray-600">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  </div>
);

export default function AssessmentsPage() {
  // State Management - UNIFIED APPROACH
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [assessmentSent, setAssessmentSent] = useState(false);
  
  // Unified Assessment Data Store
  const [unifiedData, setUnifiedData] = useState<UnifiedAssessmentData>({
    atr: {},
    cfl: {},
    persona: {},
    clientData: { 
      name: 'Geoffrey Clarkson', 
      age: 45, 
      investmentAmount: 150000,
      fees: 2500,
      monthlySavings: 1200,
      targetRetirementAge: 65
    },
    riskMetrics: { atrScore: 0, cflScore: 0, finalRiskProfile: 0 },
    integrationStatus: {
      dataLinked: false,
      profileCalculated: false,
      personaMatched: false,
      readyForAdvice: false
    }
  });

  // Legacy state (for backward compatibility)
  const [atrAnswers, setAtrAnswers] = useState<AssessmentAnswers>({});
  const [cflAnswers, setCflAnswers] = useState<AssessmentAnswers>({});
  const [clientData, setClientData] = useState<ClientData>({ 
    name: 'Geoffrey Clarkson', 
    age: 45, 
    investmentAmount: 150000,
    fees: 2500,
    monthlySavings: 1200,
    targetRetirementAge: 65
  });
  
  // Client Assessment state
  const [clientAssessmentAnswers, setClientAssessmentAnswers] = useState<AssessmentAnswers>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [assessmentScore, setAssessmentScore] = useState(0);

  // OCCUPATION OPTIONS
  const occupationOptions = [
    { value: 'finance_banking', label: 'Finance & Banking' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'education', label: 'Education' },
    { value: 'technology', label: 'Technology' },
    { value: 'legal', label: 'Legal' },
    { value: 'consulting', label: 'Consulting' },
    { value: 'engineering', label: 'Engineering' },
    { value: 'sales_marketing', label: 'Sales & Marketing' },
    { value: 'retail', label: 'Retail' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'government', label: 'Government' },
    { value: 'non_profit', label: 'Non-Profit' },
    { value: 'self_employed', label: 'Self-Employed' },
    { value: 'retired', label: 'Retired' },
    { value: 'other', label: 'Other' }
  ];

  // MARITAL STATUS OPTIONS
  const maritalStatusOptions = [
    { value: 'single', label: 'Single' },
    { value: 'married', label: 'Married' },
    { value: 'divorced', label: 'Divorced' },
    { value: 'widowed', label: 'Widowed' },
    { value: 'civil_partnership', label: 'Civil Partnership' }
  ];

  // EMPLOYMENT STATUS OPTIONS
  const employmentStatusOptions = [
    { value: 'employed', label: 'Employed' },
    { value: 'self_employed', label: 'Self-Employed' },
    { value: 'unemployed', label: 'Unemployed' },
    { value: 'retired', label: 'Retired' },
    { value: 'student', label: 'Student' }
  ];

  // CFL Questions (previously missing)
  const cflQuestions = [
    {
      id: 'cfl1',
      question: 'If your investments fell by 10% in the first year, what would you do?',
      options: [
        { value: 1, text: 'Sell immediately to prevent further losses' },
        { value: 2, text: 'Sell some to reduce risk' },
        { value: 3, text: 'Keep the investments but worry about it' },
        { value: 4, text: 'Keep the investments and review in 6 months' },
        { value: 5, text: 'Buy more while prices are lower' }
      ]
    },
    {
      id: 'cfl2',
      question: 'What portion of your total wealth does this investment represent?',
      options: [
        { value: 1, text: 'More than 75% - this is most of my money' },
        { value: 2, text: '50-75% - a significant portion' },
        { value: 3, text: '25-50% - a moderate portion' },
        { value: 4, text: '10-25% - a small portion' },
        { value: 5, text: 'Less than 10% - money I can afford to lose' }
      ]
    },
    {
      id: 'cfl3',
      question: 'How long could you maintain your lifestyle if you lost this investment?',
      options: [
        { value: 1, text: 'Less than 6 months' },
        { value: 2, text: '6 months to 1 year' },
        { value: 3, text: '1-3 years' },
        { value: 4, text: '3-5 years' },
        { value: 5, text: 'More than 5 years - minimal impact' }
      ]
    },
    {
      id: 'cfl4',
      question: 'How important is accessing this money in the next 5 years?',
      options: [
        { value: 1, text: 'Essential - I will definitely need it' },
        { value: 2, text: 'Very likely - probably will need some' },
        { value: 3, text: 'Possible - might need it for emergencies' },
        { value: 4, text: 'Unlikely - have other sources available' },
        { value: 5, text: 'Not needed - this is long-term money' }
      ]
    }
  ];

  // Client Assessment Questions
  const clientAssessmentQuestions = [
    {
      id: 'ca1',
      question: 'When making financial decisions, I usually...',
      options: [
        { value: 1, text: 'Take a very long time and seek lots of advice' },
        { value: 2, text: 'Research thoroughly before deciding' },
        { value: 3, text: 'Consider the options and decide reasonably quickly' },
        { value: 4, text: 'Trust my instincts and decide quite fast' },
        { value: 5, text: 'Make quick decisions and rarely look back' }
      ]
    },
    {
      id: 'ca2',
      question: 'If I saw my investments had fallen 15% in value, I would...',
      options: [
        { value: 1, text: 'Feel very stressed and want to sell immediately' },
        { value: 2, text: 'Be concerned and call my adviser for reassurance' },
        { value: 3, text: 'Be disappointed but wait to see what happens' },
        { value: 4, text: 'View it as normal market fluctuation' },
        { value: 5, text: 'See it as a buying opportunity' }
      ]
    },
    {
      id: 'ca3',
      question: 'My main goal with investing is to...',
      options: [
        { value: 1, text: 'Preserve my capital above all else' },
        { value: 2, text: 'Achieve steady, reliable returns' },
        { value: 3, text: 'Balance growth with some security' },
        { value: 4, text: 'Grow my wealth over the long term' },
        { value: 5, text: 'Maximize returns regardless of risk' }
      ]
    },
    {
      id: 'ca4',
      question: 'When it comes to new financial products...',
      options: [
        { value: 1, text: 'I stick to what I know and understand' },
        { value: 2, text: 'I need extensive explanation before considering' },
        { value: 3, text: 'I\'ll consider them if they seem suitable' },
        { value: 4, text: 'I\'m usually interested in new opportunities' },
        { value: 5, text: 'I love exploring innovative investment options' }
      ]
    },
    {
      id: 'ca5',
      question: 'How do you feel about financial uncertainty?',
      options: [
        { value: 1, text: 'I find it very stressful and try to avoid it' },
        { value: 2, text: 'I prefer predictability when possible' },
        { value: 3, text: 'I can handle moderate uncertainty' },
        { value: 4, text: 'I\'m comfortable with uncertainty for better returns' },
        { value: 5, text: 'I thrive on uncertainty and market volatility' }
      ]
    },
    {
      id: 'ca6',
      question: 'If friends asked about your investment approach...',
      options: [
        { value: 1, text: 'I\'d emphasize safety and capital protection' },
        { value: 2, text: 'I\'d talk about steady, reliable growth' },
        { value: 3, text: 'I\'d mention balanced risk and reward' },
        { value: 4, text: 'I\'d discuss long-term wealth building' },
        { value: 5, text: 'I\'d share exciting growth opportunities' }
      ]
    },
    {
      id: 'ca7',
      question: 'When market news is negative, I typically...',
      options: [
        { value: 1, text: 'Worry significantly about my investments' },
        { value: 2, text: 'Pay close attention and feel concerned' },
        { value: 3, text: 'Notice but don\'t let it affect me much' },
        { value: 4, text: 'View it as temporary market cycles' },
        { value: 5, text: 'See it as opportunity for future gains' }
      ]
    },
    {
      id: 'ca8',
      question: 'My ideal investment timeframe is...',
      options: [
        { value: 1, text: 'Short-term - I may need the money soon' },
        { value: 2, text: '2-3 years with regular access' },
        { value: 3, text: '5-7 years with occasional access' },
        { value: 4, text: '10+ years for long-term growth' },
        { value: 5, text: 'Very long-term - for future generations' }
      ]
    }
  ];

  // INTEGRATION EFFECTS - Update unified data when individual assessments change
  useEffect(() => {
    updateUnifiedAssessment();
  }, [atrAnswers, cflAnswers, clientAssessmentAnswers, clientData]);

  // CORE INTEGRATION FUNCTION
  const updateUnifiedAssessment = () => {
    const newMetrics = calculateRiskMetrics();
    const newIntegrationStatus = calculateIntegrationStatus();
    
    setUnifiedData(prev => ({
      ...prev,
      atr: atrAnswers,
      cfl: cflAnswers,
      persona: clientAssessmentAnswers,
      clientData: clientData,
      riskMetrics: newMetrics,
      integrationStatus: newIntegrationStatus
    }));
  };

  // ENHANCED CALCULATION WITH DYNAMIC FEATURES
  const calculateRiskMetrics = (): RiskMetrics => {
    // ATR Score calculation - FIXED: Use Object.values() correctly
    const atrScoreValues = Object.values(atrAnswers);
    const atrScore = atrScoreValues.length > 0 
      ? atrScoreValues.reduce((sum: number, val: number) => sum + val, 0) / atrScoreValues.length 
      : 0;

    // CFL Score calculation 
    const cflScoreValues = Object.values(cflAnswers);
    const cflScore = cflScoreValues.length > 0 
      ? cflScoreValues.reduce((sum: number, val: number) => sum + val, 0) / cflScoreValues.length 
      : 0;

    // Final Risk Profile (conservative approach - take the minimum)
    const finalRiskProfile = Math.min(Math.round(atrScore), Math.round(cflScore)) || 0;

    // DYNAMIC FINANCIAL CALCULATIONS
    const netInvestment = (clientData.investmentAmount || 0) - (clientData.fees || 0);
    const annualSavings = (clientData.monthlySavings || 0) * 12;
    const yearsToRetirement = (clientData.targetRetirementAge || 65) - (clientData.age || 0);

    // Risk Reconciliation Logic
    let riskReconciliation = '';
    const atrRound = Math.round(atrScore);
    const cflRound = Math.round(cflScore);
    
    if (Math.abs(atrRound - cflRound) > 1) {
      riskReconciliation = `Risk mismatch detected: ATR=${atrRound}, CFL=${cflRound}. Using conservative approach.`;
    } else {
      riskReconciliation = `Risk alignment confirmed: ATR=${atrRound}, CFL=${cflRound}`;
    }

    return {
      atrScore,
      cflScore,
      finalRiskProfile,
      riskReconciliation,
      netInvestment,
      annualSavings,
      yearsToRetirement
    };
  };

  // INTEGRATION STATUS CALCULATION
  const calculateIntegrationStatus = () => {
    const atrComplete = Object.keys(atrAnswers).length === atrQuestions.length;
    const cflComplete = Object.keys(cflAnswers).length === cflQuestions.length;
    const personaComplete = Object.keys(clientAssessmentAnswers).length === clientAssessmentQuestions.length;
    const clientDataComplete = !!(clientData.name && clientData.age && clientData.investmentAmount);

    return {
      dataLinked: atrComplete || cflComplete || personaComplete,
      profileCalculated: atrComplete && cflComplete,
      personaMatched: personaComplete,
      readyForAdvice: atrComplete && cflComplete && personaComplete && clientDataComplete
    };
  };

  // HANDLERS
  const handleATRAnswer = (questionId: string, value: number) => {
    setAtrAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleCFLAnswer = (questionId: string, value: number) => {
    setCflAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleClientAssessmentAnswer = (questionId: string, value: number) => {
    setClientAssessmentAnswers(prev => ({ ...prev, [questionId]: value }));
    
    // Auto-advance logic for client assessment
    if (currentQuestion < clientAssessmentQuestions.length - 1) {
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
    } else {
      // Calculate final score - FIXED: Use correct array operations
      const allAnswers = { ...clientAssessmentAnswers, [questionId]: value };
      const scores = Object.values(allAnswers);
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      setAssessmentScore(avgScore);
      setTimeout(() => setShowResults(true), 300);
    }
  };

  // SMART CLIENT DATA HANDLER
  const handleClientDataChange = (field: keyof ClientData, value: any) => {
    setClientData(prev => ({ ...prev, [field]: value }));
  };

  // Get current risk metrics
  const riskMetrics = unifiedData.riskMetrics;
  const integrationStatus = unifiedData.integrationStatus;

  // ENHANCED DASHBOARD COMPONENT WITH CLIENT DATA ENTRY
  const AssessmentDashboard = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <BarChart3 className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-blue-900">Assessment Dashboard</h2>
            <p className="text-blue-700">Unified risk profiling and investor assessment platform</p>
          </div>
        </div>
      </div>

      {/* ENHANCED CLIENT DATA FORM */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <h3 className="text-lg font-semibold">👤 Client Information</h3>
          <InfoTooltip text="Complete client details for comprehensive assessment and regulatory compliance" />
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              value={clientData.name || ''}
              onChange={(e) => handleClientDataChange('name', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Client full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
            <input
              type="number"
              value={clientData.age || ''}
              onChange={(e) => handleClientDataChange('age', parseInt(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Age"
              min="18"
              max="100"
            />
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-2">
              <label className="block text-sm font-medium text-gray-700">Occupation</label>
              <InfoTooltip text="Professional occupation affects risk capacity and regulatory requirements" />
            </div>
            <Dropdown
              value={clientData.occupation || ''}
              onChange={(value) => handleClientDataChange('occupation', value)}
              options={occupationOptions}
              placeholder="Select occupation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Marital Status</label>
            <Dropdown
              value={clientData.maritalStatus || ''}
              onChange={(value) => handleClientDataChange('maritalStatus', value)}
              options={maritalStatusOptions}
              placeholder="Select status"
            />
          </div>

          {/* CONDITIONAL PARTNER FIELDS */}
          {(clientData.maritalStatus === 'married' || clientData.maritalStatus === 'civil_partnership') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Partner Name</label>
                <input
                  type="text"
                  value={clientData.partnerName || ''}
                  onChange={(e) => handleClientDataChange('partnerName', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Partner's name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Partner Age</label>
                <input
                  type="number"
                  value={clientData.partnerAge || ''}
                  onChange={(e) => handleClientDataChange('partnerAge', parseInt(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Partner's age"
                  min="18"
                  max="100"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Employment Status</label>
            <Dropdown
              value={clientData.employmentStatus || ''}
              onChange={(value) => handleClientDataChange('employmentStatus', value)}
              options={employmentStatusOptions}
              placeholder="Select status"
            />
          </div>

          {/* CONDITIONAL EMPLOYER FIELD */}
          {clientData.employmentStatus === 'employed' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Employer Name</label>
              <input
                type="text"
                value={clientData.employerName || ''}
                onChange={(e) => handleClientDataChange('employerName', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Current employer"
              />
            </div>
          )}

          <div>
            <div className="flex items-center space-x-2 mb-2">
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <InfoTooltip text="UK postcode lookup for accurate address verification" />
            </div>
            <AddressSearch
              value={clientData.address || ''}
              onChange={(value) => handleClientDataChange('address', value)}
              onAddressSelect={(address) => {
                handleClientDataChange('address', address);
                // Extract postcode from the suggestion data if available
                // This will be handled by the AddressSearch component callback
              }}
            />
          </div>
        </div>

        {/* FINANCIAL INFORMATION WITH LIVE CALCULATIONS */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <h4 className="text-md font-semibold text-gray-900">💰 Financial Information</h4>
            <InfoTooltip text="Financial details enable accurate portfolio modeling and retirement planning" />
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Investment Amount</label>
              <input
                type="number"
                value={clientData.investmentAmount || ''}
                onChange={(e) => handleClientDataChange('investmentAmount', parseInt(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="£0"
              />
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-2">
                <label className="block text-sm font-medium text-gray-700">Fees</label>
                <InfoTooltip text="Annual management fees and charges" />
              </div>
              <input
                type="number"
                value={clientData.fees || ''}
                onChange={(e) => handleClientDataChange('fees', parseInt(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="£0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Savings</label>
              <input
                type="number"
                value={clientData.monthlySavings || ''}
                onChange={(e) => handleClientDataChange('monthlySavings', parseInt(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="£0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Retirement Age</label>
              <input
                type="number"
                value={clientData.targetRetirementAge || ''}
                onChange={(e) => handleClientDataChange('targetRetirementAge', parseInt(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="65"
                min="50"
                max="80"
              />
            </div>
          </div>

          {/* LIVE CALCULATION DISPLAY */}
          <div className="mt-4 grid md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 mb-1">Net Investment</div>
              <div className="text-xl font-bold text-blue-900">
                £{((clientData.investmentAmount || 0) - (clientData.fees || 0)).toLocaleString()}
              </div>
              <div className="text-xs text-blue-500">After fees</div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 mb-1">Annual Savings</div>
              <div className="text-xl font-bold text-green-900">
                £{((clientData.monthlySavings || 0) * 12).toLocaleString()}
              </div>
              <div className="text-xs text-green-500">£{clientData.monthlySavings || 0}/month</div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600 mb-1">Years to Retirement</div>
              <div className="text-xl font-bold text-purple-900">
                {Math.max(0, (clientData.targetRetirementAge || 65) - (clientData.age || 0))} years
              </div>
              <div className="text-xs text-purple-500">Until age {clientData.targetRetirementAge || 65}</div>
            </div>
          </div>
        </div>
      </div>

      {/* INTEGRATION STATUS PANEL */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <h3 className="text-lg font-semibold">🔗 Assessment Integration Status</h3>
          <InfoTooltip text="Real-time tracking of assessment completion and data integration across all modules" />
        </div>
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Data Linked', status: integrationStatus.dataLinked, icon: '🔗' },
            { label: 'Profile Calculated', status: integrationStatus.profileCalculated, icon: '📊' },
            { label: 'Persona Matched', status: integrationStatus.personaMatched, icon: '👤' },
            { label: 'Advice Ready', status: integrationStatus.readyForAdvice, icon: '✅' }
          ].map((item, index) => (
            <div key={index} className={`p-4 rounded-lg border-2 ${item.status ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-sm font-medium">{item.label}</div>
              <div className={`text-xs ${item.status ? 'text-green-600' : 'text-gray-500'}`}>
                {item.status ? 'Complete' : 'Pending'}
              </div>
            </div>
          ))}
        </div>

        {/* UNIFIED RISK PROFILE DISPLAY */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg">
          <div className="flex items-center space-x-2 mb-4">
            <h4 className="font-semibold text-gray-900">🎯 Unified Risk Profile</h4>
            <InfoTooltip text="Combined risk assessment using ATR (attitude) and CFL (capacity) with conservative reconciliation" />
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{riskMetrics.atrScore.toFixed(1)}</div>
              <div className="text-sm text-gray-600">ATR Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{riskMetrics.cflScore.toFixed(1)}</div>
              <div className="text-sm text-gray-600">CFL Score</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600">{riskMetrics.finalRiskProfile}</div>
              <div className="text-sm text-gray-600">Final Risk Profile</div>
            </div>
          </div>
          {riskMetrics.riskReconciliation && (
            <div className="mt-4 p-3 bg-white rounded border text-sm text-gray-700">
              <strong>Risk Analysis:</strong> {riskMetrics.riskReconciliation}
            </div>
          )}
        </div>
      </div>

      {/* ASSESSMENT CARDS */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" 
              onClick={() => setCurrentSection('atr')}>
          <div className="flex items-center space-x-3 mb-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <h3 className="font-semibold">ATR Assessment</h3>
            <InfoTooltip text="Attitude to Risk questionnaire measures psychological comfort with investment volatility" />
          </div>
          <p className="text-sm text-gray-600 mb-4">Attitude to Risk questionnaire</p>
          <div className="flex justify-between items-center">
            <Badge variant={Object.keys(atrAnswers).length === atrQuestions.length ? "default" : "secondary"}>
              {Object.keys(atrAnswers).length}/{atrQuestions.length} Complete
            </Badge>
            <span className="text-2xl">{Object.keys(atrAnswers).length === atrQuestions.length ? '✅' : '⏳'}</span>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" 
              onClick={() => setCurrentSection('cfl')}>
          <div className="flex items-center space-x-3 mb-3">
            <Calculator className="h-6 w-6 text-green-600" />
            <h3 className="font-semibold">CFL Assessment</h3>
            <InfoTooltip text="Capacity for Loss evaluation determines financial ability to absorb investment losses" />
          </div>
          <p className="text-sm text-gray-600 mb-4">Capacity for Loss evaluation</p>
          <div className="flex justify-between items-center">
            <Badge variant={Object.keys(cflAnswers).length === cflQuestions.length ? "default" : "secondary"}>
              {Object.keys(cflAnswers).length}/{cflQuestions.length} Complete
            </Badge>
            <span className="text-2xl">{Object.keys(cflAnswers).length === cflQuestions.length ? '✅' : '⏳'}</span>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" 
              onClick={() => setCurrentSection('client')}>
          <div className="flex items-center space-x-3 mb-3">
            <User className="h-6 w-6 text-purple-600" />
            <h3 className="font-semibold">Persona Assessment</h3>
            <InfoTooltip text="Behavioral profiling for Consumer Duty compliance and personalized advice delivery" />
          </div>
          <p className="text-sm text-gray-600 mb-4">Client personality profiling</p>
          <div className="flex justify-between items-center">
            <Badge variant={Object.keys(clientAssessmentAnswers).length === clientAssessmentQuestions.length ? "default" : "secondary"}>
              {Object.keys(clientAssessmentAnswers).length}/{clientAssessmentQuestions.length} Complete
            </Badge>
            <span className="text-2xl">{Object.keys(clientAssessmentAnswers).length === clientAssessmentQuestions.length ? '✅' : '⏳'}</span>
          </div>
        </Card>
      </div>

      {/* QUICK STATS */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-blue-100">
          <h3 className="font-semibold text-blue-900 mb-2">Client Profile</h3>
          <div className="text-2xl font-bold text-blue-600">{clientData.name ? '👤' : '❓'}</div>
          <div className="text-sm text-blue-500">{clientData.name || 'Not Set'}</div>
          <div className="text-xs text-blue-400 mt-1">
            {clientData.age ? `Age ${clientData.age}` : 'Age not set'}
          </div>
          <div className="text-xs text-blue-400 mt-1">
            {clientData.investmentAmount ? `£${clientData.investmentAmount.toLocaleString()}` : 'Amount TBD'}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-green-100">
          <h3 className="font-semibold text-green-900 mb-2">Risk Profile</h3>
          <div className="text-2xl font-bold text-green-600">{riskMetrics.finalRiskProfile}/5</div>
          <div className="text-sm text-green-500">
            {riskCategories[riskMetrics.finalRiskProfile]?.name || 'Not Assessed'}
          </div>
          <div className="text-xs text-green-400 mt-1">
            {riskMetrics.finalRiskProfile ? `${riskCategories[riskMetrics.finalRiskProfile]?.expectedReturn}% target return` : 'Pending assessment'}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-purple-100">
          <h3 className="font-semibold text-purple-900 mb-2">Investor Persona</h3>
          <div className="text-2xl font-bold text-purple-600">
            {Object.keys(clientAssessmentAnswers).length === clientAssessmentQuestions.length ? 
              investorPersonas[Math.round(assessmentScore)]?.avatar || '👤' : '⏳'}
          </div>
          <div className="text-sm text-purple-500">
            {Object.keys(clientAssessmentAnswers).length === clientAssessmentQuestions.length ? 
              investorPersonas[Math.round(assessmentScore)]?.type || 'Generated' : 'Not Generated'}
          </div>
          <div className="text-xs text-purple-400 mt-1">
            {Object.keys(clientAssessmentAnswers).length === clientAssessmentQuestions.length ? 'Consumer Duty Aligned' : 'Complete assessment'}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-orange-100">
          <h3 className="font-semibold text-orange-900 mb-2">Integration Status</h3>
          <div className="text-2xl font-bold text-orange-600">
            {integrationStatus.readyForAdvice ? '✅' : '⏳'}
          </div>
          <div className="text-sm text-orange-500">
            {integrationStatus.readyForAdvice ? 'Ready for Advice' : 'Assessment Pending'}
          </div>
          <div className="text-xs text-orange-400 mt-1">
            {integrationStatus.readyForAdvice ? 'All assessments complete' : 'Complete remaining assessments'}
          </div>
        </div>
      </div>
    </div>
  );

  // ATR ASSESSMENT COMPONENT WITH STICKY HEADER
  const ATRAssessment = () => {
    const progress = (Object.keys(atrAnswers).length / atrQuestions.length) * 100;
    
    return (
      <>
        <StickyAssessmentHeader 
          title="Attitude to Risk Assessment"
          progress={progress}
          currentStep={1}
          totalSteps={3}
        />
        
        <div className="space-y-6 mt-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h2 className="text-2xl font-bold text-blue-900">Attitude to Risk Assessment</h2>
                <div className="flex items-center space-x-2">
                  <p className="text-blue-700">Professional risk tolerance evaluation - Compliant with FSA FG11/05 guidelines</p>
                  <InfoTooltip text="This assessment measures your psychological comfort with investment volatility and market fluctuations" />
                </div>
              </div>
            </div>
          </div>

          {atrQuestions.map((question: any, index: number) => (
            <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start space-x-3 mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex-1">
                  {index + 1}. {question.text || question.question}
                </h3>
                <InfoTooltip text="Choose the option that best reflects your natural response to this scenario" />
              </div>
              <div className="space-y-3">
                {question.options.map((option: any) => (
                  <label key={option.value} className="flex items-start space-x-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors">
                    <input
                      type="radio"
                      name={question.id}
                      value={option.value}
                      checked={atrAnswers[question.id] === option.value}
                      onChange={() => handleATRAnswer(question.id, option.value)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="text-gray-700">{option.text}</span>
                      {option.bias && (
                        <span className="block text-xs text-gray-500 mt-1">
                          Behavioral indicator: {option.bias.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
          
          {/* Assessment Progress */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Progress: {Object.keys(atrAnswers).length}/{atrQuestions.length} questions completed
              </div>
              <div className="flex items-center space-x-2">
                {Object.keys(atrAnswers).length === atrQuestions.length && (
                  <span className="text-green-600 text-sm flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    ATR Assessment Complete
                  </span>
                )}
              </div>
            </div>
            <Progress 
              value={progress} 
              className="mt-2"
            />
          </div>
          
          {/* Navigation - REMOVED BACK TO DASHBOARD */}
          <div className="flex justify-end items-center bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-center flex-1">
              <div className="text-sm text-gray-600">Current Score: {riskMetrics.atrScore.toFixed(1)}/5</div>
            </div>
            
            <Button 
              onClick={() => setCurrentSection('cfl')}
              disabled={Object.keys(atrAnswers).length !== atrQuestions.length}
            >
              Continue to CFL →
            </Button>
          </div>
        </div>
      </>
    );
  };

  // CFL ASSESSMENT COMPONENT WITH STICKY HEADER
  const CFLAssessment = () => {
    const progress = (Object.keys(cflAnswers).length / cflQuestions.length) * 100;
    
    return (
      <>
        <StickyAssessmentHeader 
          title="Capacity for Loss Assessment"
          progress={progress}
          currentStep={2}
          totalSteps={3}
        />
        
        <div className="space-y-6 mt-4">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Calculator className="h-8 w-8 text-green-600" />
              <div>
                <h2 className="text-2xl font-bold text-green-900">Capacity for Loss Assessment</h2>
                <div className="flex items-center space-x-2">
                  <p className="text-green-700">Financial resilience evaluation - Determines ability to absorb losses</p>
                  <InfoTooltip text="This assessment evaluates your financial capacity to sustain investment losses without affecting your lifestyle" />
                </div>
              </div>
            </div>
          </div>

          {cflQuestions.map((question, index) => (
            <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start space-x-3 mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex-1">
                  {index + 1}. {question.question}
                </h3>
                <InfoTooltip text="Consider your actual financial situation when selecting your response" />
              </div>
              <div className="space-y-3">
                {question.options.map((option) => (
                  <label key={option.value} className="flex items-start space-x-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors">
                    <input
                      type="radio"
                      name={question.id}
                      value={option.value}
                      checked={cflAnswers[question.id] === option.value}
                      onChange={() => handleCFLAnswer(question.id, option.value)}
                      className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500"
                    />
                    <div className="flex-1">
                      <span className="text-gray-700">{option.text}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
          
          {/* Assessment Progress */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Progress: {Object.keys(cflAnswers).length}/{cflQuestions.length} questions completed
              </div>
              <div className="flex items-center space-x-2">
                {Object.keys(cflAnswers).length === cflQuestions.length && (
                  <span className="text-green-600 text-sm flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    CFL Assessment Complete
                  </span>
                )}
              </div>
            </div>
            <Progress 
              value={progress} 
              className="mt-2"
            />
          </div>

          {/* Risk Reconciliation Panel */}
          {Object.keys(atrAnswers).length === atrQuestions.length && Object.keys(cflAnswers).length === cflQuestions.length && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <h3 className="text-lg font-semibold text-yellow-900">⚖️ Risk Profile Reconciliation</h3>
                <InfoTooltip text="We compare your attitude to risk with your capacity for loss and use the more conservative score for your protection" />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <div className="text-sm text-gray-600">ATR Score</div>
                  <div className="text-2xl font-bold text-blue-600">{riskMetrics.atrScore.toFixed(1)}</div>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <div className="text-sm text-gray-600">CFL Score</div>
                  <div className="text-2xl font-bold text-green-600">{riskMetrics.cflScore.toFixed(1)}</div>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Final Profile</div>
                  <div className="text-2xl font-bold text-purple-600">{riskMetrics.finalRiskProfile}</div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-white rounded text-sm">
                <strong>Analysis:</strong> {riskMetrics.riskReconciliation}
              </div>
            </div>
          )}
          
          {/* Navigation - REMOVED BACK BUTTON */}
          <div className="flex justify-end items-center bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-center flex-1">
              <div className="text-sm text-gray-600">CFL Score: {riskMetrics.cflScore.toFixed(1)}/5</div>
            </div>
            
            <Button 
              onClick={() => setCurrentSection('client')}
              disabled={Object.keys(cflAnswers).length !== cflQuestions.length}
            >
              Continue to Persona →
            </Button>
          </div>
        </div>
      </>
    );
  };

  // CLIENT ASSESSMENT COMPONENT WITH STICKY HEADER
  const ClientAssessment = () => {
    const sendAssessmentLink = () => {
      setAssessmentSent(true);
      alert(`📱 Assessment Link Sent!\n\nEmail sent to: ${clientData.name || 'client'}@email.com\n\nSubject: "Complete Your Investment Personality Assessment"\n\nThe client will receive:\n• Mobile-optimized questionnaire\n• 8 natural language questions\n• Automatic results sync to your platform\n• Pre-populated data for your meeting\n\nEstimated completion time: 3-5 minutes`);
    };

    const resetAssessment = () => {
      setCurrentQuestion(0);
      setShowResults(false);
      setClientAssessmentAnswers({});
      setAssessmentScore(0);
    };

    // Assessment Results View
    if (showResults) {
      const riskLevel = Math.round(assessmentScore);
      const persona = investorPersonas[riskLevel];
      
      return (
        <>
          <StickyAssessmentHeader 
            title="Persona Assessment Complete"
            progress={100}
            currentStep={3}
            totalSteps={3}
          />
          
          <div className="space-y-6 mt-4">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
              <div className="text-center">
                <div className="text-6xl mb-4">{persona?.avatar || '📊'}</div>
                <h2 className="text-2xl font-bold text-green-900 mb-2">Assessment Complete!</h2>
                <p className="text-green-700">Your Investment Personality: <strong>{persona?.type || 'Balanced Investor'}</strong></p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <h3 className="text-lg font-semibold">📊 Your Results</h3>
                <InfoTooltip text="These results combine your risk tolerance, financial capacity, and behavioral preferences for personalized advice" />
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <div className="text-3xl font-bold text-blue-600 mb-1">{riskLevel}/5</div>
                    <div className="text-gray-600">Risk Comfort Level</div>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Assessment Score:</span>
                      <span className="font-medium">{assessmentScore.toFixed(1)}/5</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Questions Completed:</span>
                      <span className="font-medium">{Object.keys(clientAssessmentAnswers).length}/8</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Personality Type:</span>
                      <span className="font-medium">{persona?.type}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">💭 What This Means</h4>
                  <p className="text-sm text-gray-700 mb-3">{persona?.description}</p>
                  
                  <h4 className="font-medium mb-2">🎯 Your Key Motivations</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {persona?.motivations?.slice(0, 3).map((motivation: string, i: number) => (
                      <li key={i}>• {motivation}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">🤝 Next Steps</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">1. Results Shared</h4>
                  <p className="text-sm text-blue-800">Your responses have been automatically shared with your adviser for your upcoming meeting.</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">2. Personalized Advice</h4>
                  <p className="text-sm text-green-800">Your adviser will use these insights to provide recommendations tailored to your personality.</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">3. Better Outcomes</h4>
                  <p className="text-sm text-purple-800">This assessment helps ensure you receive investment advice that's truly suitable for you.</p>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Button 
                  onClick={resetAssessment}
                  variant="outline"
                  className="mr-3"
                >
                  Retake Assessment
                </Button>
                <Button 
                  onClick={() => setCurrentSection('results')}
                >
                  View Unified Results →
                </Button>
              </div>
            </div>
          </div>
        </>
      );
    }

    // Assessment Questions View (Mobile-First Design)
    const progress = ((currentQuestion + 1) / clientAssessmentQuestions.length) * 100;
    const question = clientAssessmentQuestions[currentQuestion];

    return (
      <>
        <StickyAssessmentHeader 
          title="Client Persona Assessment"
          progress={progress}
          currentStep={3}
          totalSteps={3}
        />
        
        <div className="space-y-6 mt-4">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <User className="h-8 w-8 text-purple-600" />
              <div>
                <h2 className="text-2xl font-bold text-purple-900">Client Assessment Portal</h2>
                <div className="flex items-center space-x-2">
                  <p className="text-purple-700">Mobile-first assessment for clients to complete before meetings</p>
                  <InfoTooltip text="This behavioral assessment helps advisers understand client preferences for Consumer Duty compliance" />
                </div>
              </div>
            </div>
          </div>

          {/* Assessment Management */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <h3 className="text-lg font-semibold">📧 Send Assessment to Client</h3>
              <InfoTooltip text="Clients can complete this assessment on their mobile device before the meeting" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client Email</label>
                  <input
                    type="email"
                    value={`${clientData.name?.toLowerCase()?.replace(' ', '.') || 'client'}@email.com`}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    readOnly
                  />
                </div>
                <Button 
                  onClick={sendAssessmentLink}
                  disabled={assessmentSent}
                  className="w-full"
                >
                  {assessmentSent ? '✅ Assessment Link Sent' : '📱 Send Mobile Assessment'}
                </Button>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">📋 Assessment Features</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Mobile-optimized interface</li>
                  <li>• 8 natural language questions</li>
                  <li>• Auto-saving responses</li>
                  <li>• Instant personality matching</li>
                  <li>• Pre-meeting data sync</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Live Assessment Demo */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <h3 className="text-lg font-semibold">📱 Live Assessment Demo</h3>
              <InfoTooltip text="Interactive demonstration of the client experience on mobile devices" />
            </div>
            
            <div className="max-w-md mx-auto bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Question {currentQuestion + 1} of {clientAssessmentQuestions.length}</span>
                  <span>{Math.round(progress)}% complete</span>
                </div>
                <Progress value={progress} className="mb-4" />
              </div>

              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">{question.question}</h4>
                <div className="space-y-3">
                  {question.options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleClientAssessmentAnswer(question.id, option.value)}
                      className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <span className="text-gray-700">{option.text}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500">
                <button 
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <div className="text-xs text-gray-500">
                  {Math.round(progress)}% complete
                </div>
                <div className="text-gray-400 text-sm">
                  Auto-advance
                </div>
              </div>
            </div>

            <div className="mt-4 text-center text-sm text-gray-600">
              <p>Click any answer to see the smooth progression experience</p>
            </div>
          </div>

          {/* Assessment Status */}
          {Object.keys(clientAssessmentAnswers).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <h3 className="text-lg font-semibold">📊 Assessment Progress</h3>
                <InfoTooltip text="Real-time tracking of client responses and automatic scoring" />
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Client Responses</h4>
                  <div className="space-y-2">
                    {Object.entries(clientAssessmentAnswers).map(([questionId, answer]) => {
                      const qIndex = clientAssessmentQuestions.findIndex(q => q.id === questionId);
                      return (
                        <div key={questionId} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                          <span>Q{qIndex + 1}:</span>
                          <span className="font-medium">{answer}/5</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Live Integration</h4>
                  <div className="text-sm text-gray-700 space-y-2">
                    <div>Responses: {Object.keys(clientAssessmentAnswers).length}/8</div>
                    <div>Current Score: {Object.keys(clientAssessmentAnswers).length > 0 ? 
                      (Object.values(clientAssessmentAnswers).reduce((sum, val) => sum + val, 0) / Object.keys(clientAssessmentAnswers).length).toFixed(1) : 
                      'N/A'}/5</div>
                    <div>Status: {Object.keys(clientAssessmentAnswers).length === 8 ? 'Complete' : 'In Progress'}</div>
                    
                    {Object.keys(clientAssessmentAnswers).length === 8 && (
                      <Button
                        onClick={() => setShowResults(true)}
                        className="mt-3"
                      >
                        View Final Results
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation - REMOVED BACK BUTTON */}
          <div className="flex justify-end items-center bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-center flex-1">
              <div className="text-sm text-gray-600">Client Assessment Portal</div>
              <div className="text-xs text-gray-500">Mobile-first pre-meeting assessment</div>
            </div>
            
            <Button 
              onClick={() => setCurrentSection('results')}
              disabled={!integrationStatus.readyForAdvice}
            >
              View Unified Results →
            </Button>
          </div>
        </div>
      </>
    );
  };

  // UNIFIED RESULTS COMPONENT
  const UnifiedResults = () => (
    <>
      <StickyAssessmentHeader 
        title="Unified Assessment Results"
        progress={100}
        currentStep={4}
        totalSteps={4}
      />
      
      <div className="space-y-6 mt-4">
        <div className="bg-gradient-to-r from-purple-50 to-green-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Target className="h-8 w-8 text-purple-600" />
            <div>
              <h2 className="text-2xl font-bold text-purple-900">Unified Assessment Results</h2>
              <div className="flex items-center space-x-2">
                <p className="text-purple-700">Complete risk profile and investment recommendation framework</p>
                <InfoTooltip text="Comprehensive analysis combining all assessment data for regulatory-compliant investment advice" />
              </div>
            </div>
          </div>
        </div>

        {/* Client Summary Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <h3 className="text-lg font-semibold">👤 Client Profile Summary</h3>
            <InfoTooltip text="Complete client overview including personal details, financial situation, and assessment outcomes" />
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
              <div className="space-y-1 text-sm">
                <div><strong>Name:</strong> {clientData.name}</div>
                <div><strong>Age:</strong> {clientData.age}</div>
                <div><strong>Occupation:</strong> {occupationOptions.find(o => o.value === clientData.occupation)?.label || 'Not specified'}</div>
                <div><strong>Status:</strong> {maritalStatusOptions.find(o => o.value === clientData.maritalStatus)?.label || 'Not specified'}</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Financial Overview</h4>
              <div className="space-y-1 text-sm">
                <div><strong>Investment:</strong> £{clientData.investmentAmount?.toLocaleString()}</div>
                <div><strong>Net Investment:</strong> £{((clientData.investmentAmount || 0) - (clientData.fees || 0)).toLocaleString()}</div>
                <div><strong>Monthly Savings:</strong> £{clientData.monthlySavings?.toLocaleString()}</div>
                <div><strong>Years to Retirement:</strong> {Math.max(0, (clientData.targetRetirementAge || 65) - (clientData.age || 0))}</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Risk Assessment</h4>
              <div className="space-y-1 text-sm">
                <div><strong>ATR Score:</strong> {riskMetrics.atrScore.toFixed(1)}/5</div>
                <div><strong>CFL Score:</strong> {riskMetrics.cflScore.toFixed(1)}/5</div>
                <div><strong>Final Profile:</strong> {riskMetrics.finalRiskProfile}/5</div>
                <div><strong>Category:</strong> {riskCategories[riskMetrics.finalRiskProfile]?.name}</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Investor Persona</h4>
              <div className="space-y-1 text-sm">
                <div className="text-2xl">{investorPersonas[Math.round(assessmentScore)]?.avatar || '👤'}</div>
                <div><strong>Type:</strong> {investorPersonas[Math.round(assessmentScore)]?.type || 'Not Generated'}</div>
                <div><strong>Score:</strong> {assessmentScore.toFixed(1)}/5</div>
                <div><strong>Status:</strong> <span className="text-green-600">Ready for Advice</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Reconciliation */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <h3 className="text-lg font-semibold">⚖️ Risk Profile Analysis</h3>
            <InfoTooltip text="Detailed analysis of risk alignment and regulatory approach to risk assessment" />
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 mb-2"><strong>Analysis:</strong> {riskMetrics.riskReconciliation}</p>
            <div className="text-xs text-gray-600">
              Final risk profile uses the more conservative of ATR and CFL scores to ensure suitable recommendations and regulatory compliance.
            </div>
          </div>
        </div>

        {/* Investment Strategy Recommendations */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <h3 className="text-lg font-semibold">🎯 Investment Strategy Recommendations</h3>
            <InfoTooltip text="Personalized investment strategies based on risk profile, capacity, and behavioral preferences" />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Portfolio Allocation</h4>
              <div className="space-y-2">
                {riskCategories[riskMetrics.finalRiskProfile] && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="font-medium">{riskCategories[riskMetrics.finalRiskProfile].name}</div>
                    <div className="text-sm text-gray-600 mt-2 whitespace-pre-line">
                      {riskCategories[riskMetrics.finalRiskProfile].characteristics}
                    </div>
                    <div className="mt-2 text-sm">
                      <strong>Target Return:</strong> {riskCategories[riskMetrics.finalRiskProfile].expectedReturn}% per annum
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Behavioral Considerations</h4>
              <div className="space-y-2">
                {investorPersonas[Math.round(assessmentScore)]?.behavioralTraits?.map((trait: string, i: number) => (
                  <div key={i} className="bg-purple-50 p-2 rounded text-sm">
                    • {trait}
                  </div>
                ))}
              </div>
              
              <h4 className="font-medium mb-3 mt-4">Communication Preferences</h4>
              <div className="text-sm text-gray-700">
                <div className="bg-blue-50 p-3 rounded">
                  Tailor communication style to match {investorPersonas[Math.round(assessmentScore)]?.type || 'client'} preferences for optimal engagement.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Items */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <h3 className="text-lg font-semibold">✅ Next Steps & Action Items</h3>
            <InfoTooltip text="Structured action plan for adviser follow-up and client engagement" />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">For Adviser</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Review unified risk profile and reconciliation</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Prepare {riskCategories[riskMetrics.finalRiskProfile]?.name} portfolio recommendations</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Consider {investorPersonas[Math.round(assessmentScore)]?.type} behavioral insights</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Schedule advice meeting and prepare suitability report</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Document Consumer Duty compliance evidence</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">For Client</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>All assessments completed successfully</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>Risk profile and preferences documented</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>Await adviser meeting invitation</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>Review investment recommendations</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>Consider suitability report findings</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Navigation - FINAL STEP */}
        <div className="flex justify-center items-center bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 mb-2">🎉 Assessment Process Complete</div>
            <div className="text-sm text-gray-600 mb-4">All assessments integrated and ready for advice meeting</div>
            <Button 
              onClick={() => setCurrentSection('dashboard')}
              className="bg-green-600 hover:bg-green-700"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </>
  );

  // Risk categories definition
  const riskCategories: { [key: number]: { name: string; expectedReturn: number; characteristics: string } } = {
    1: {
      name: "Capital Preservation",
      expectedReturn: 3.5,
      characteristics: "• 0-5% equity allocation\n• Focus on capital protection\n• Cash and government bonds\n• Inflation risk acknowledged"
    },
    2: {
      name: "Conservative",
      expectedReturn: 4.5,
      characteristics: "• 5-25% equity allocation\n• Defensive asset bias\n• High-grade bonds and stable funds\n• Limited volatility acceptance"
    },
    3: {
      name: "Balanced",
      expectedReturn: 6.0,
      characteristics: "• 25-50% equity allocation\n• Balanced approach\n• Mixed asset classes\n• Moderate volatility acceptance"
    },
    4: {
      name: "Growth",
      expectedReturn: 7.5,
      characteristics: "• 50-75% equity allocation\n• Growth-focused\n• Higher volatility acceptance\n• Long-term perspective"
    },
    5: {
      name: "Aggressive Growth",
      expectedReturn: 9.0,
      characteristics: "• 75-100% equity allocation\n• Maximum growth potential\n• High volatility acceptance\n• Very long-term horizon"
    }
  };

  // Main render logic
  const renderCurrentSection = () => {
    switch (currentSection) {
      case 'atr':
        return <ATRAssessment />;
      case 'cfl':
        return <CFLAssessment />;
      case 'client':
        return <ClientAssessment />;
      case 'results':
        return <UnifiedResults />;
      default:
        return <AssessmentDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {renderCurrentSection()}
      </div>
    </div>
  );
}