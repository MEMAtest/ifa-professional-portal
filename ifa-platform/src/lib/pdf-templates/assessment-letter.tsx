// src/lib/pdf-templates/assessment-letter.tsx
import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Rect,
  Line,
  Image
} from '@react-pdf/renderer'

// Define types for the component props
interface ClientPersonalDetails {
  title?: string
  firstName?: string
  lastName?: string
}

interface ClientContactInfo {
  email?: string
  phone?: string
  address?: {
    line1?: string
    line2?: string
    city?: string
    county?: string
    postcode?: string
  }
}

interface Client {
  id: string
  client_ref?: string
  personal_details?: ClientPersonalDetails
  contact_info?: ClientContactInfo
}

interface Assessment {
  id: string
  total_score?: number
  risk_category?: string
  risk_level?: number
  created_at?: string
  version_number?: number
  objectives?: any
  risk_assessment?: any
  findings?: string[]
  recommendations?: string[]
  capacity_category?: string
  max_loss_percentage?: number
  attitude_to_risk?: string
  capacity_for_loss?: string
  is_vulnerable?: boolean
  vulnerability_factors?: string[]
}

/**
 * Branding configuration for assessment letters
 */
export interface AssessmentLetterBranding {
  firmName: string
  firmAddress?: string
  firmPhone?: string
  firmEmail?: string
  fcaNumber?: string
  logoUrl?: string
  primaryColor?: string
  accentColor?: string
  footerText?: string
  advisorName?: string
  advisorTitle?: string
  advisorPhone?: string
  advisorEmail?: string
}

interface AssessmentLetterProps {
  assessment: Assessment
  client: Client
  assessmentType: string
  branding?: AssessmentLetterBranding
}

// Default branding values
const DEFAULT_BRANDING: Required<Omit<AssessmentLetterBranding, 'logoUrl' | 'advisorPhone' | 'advisorEmail'>> = {
  firmName: 'Financial Advisory Services',
  firmAddress: '',
  firmPhone: '',
  firmEmail: '',
  fcaNumber: '',
  primaryColor: '#1e3a5f',
  accentColor: '#2563eb',
  footerText: 'This document is confidential and intended solely for the addressee.',
  advisorName: 'Financial Advisor',
  advisorTitle: 'Senior Financial Consultant'
}

/**
 * Validate hex color format
 */
const isValidHexColor = (color?: string): boolean => {
  if (!color || typeof color !== 'string') return false
  return /^#[0-9A-Fa-f]{6}$/.test(color.trim())
}

// Create dynamic styles based on branding
const createStyles = (branding: AssessmentLetterBranding) => {
  // Validate color - use default if invalid
  const primaryColor = isValidHexColor(branding.primaryColor)
    ? branding.primaryColor!
    : DEFAULT_BRANDING.primaryColor

  return StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 11,
      lineHeight: 1.6,
      fontFamily: 'Helvetica',
      color: '#333333'
    },
    letterhead: {
      marginBottom: 30,
      paddingBottom: 15,
      borderBottom: `2pt solid ${primaryColor}`
    },
    companyLogo: {
      maxWidth: 180,
      maxHeight: 50,
      marginBottom: 10
    },
    companyName: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 5,
      color: primaryColor
    },
    companyDetails: {
      fontSize: 10,
      color: '#666666',
      marginBottom: 2
    },
    date: {
      marginBottom: 20,
      fontSize: 11,
      color: '#333333'
    },
    recipientSection: {
      marginBottom: 20
    },
    recipientName: {
      fontSize: 11,
      marginBottom: 2,
      color: '#333333'
    },
    recipientAddress: {
      fontSize: 11,
      color: '#333333',
      marginBottom: 1
    },
    salutation: {
      marginBottom: 15,
      fontSize: 11,
      color: '#333333'
    },
    subject: {
      marginBottom: 20,
      fontSize: 12,
      fontWeight: 'bold',
      color: primaryColor,
      textDecoration: 'underline'
    },
    bodyText: {
      fontSize: 11,
      marginBottom: 12,
      textAlign: 'justify',
      lineHeight: 1.6,
      color: '#333333'
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: 'bold',
      marginTop: 20,
      marginBottom: 12,
      color: primaryColor
    },
    bulletPoint: {
      fontSize: 11,
      marginLeft: 20,
      marginBottom: 6,
      color: '#333333'
    },
    riskBox: {
      marginTop: 15,
      marginBottom: 15,
      padding: 15,
      backgroundColor: '#f8f9fa',
      border: '1pt solid #dee2e6'
    },
    riskScore: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 5,
      color: primaryColor
    },
    riskCategory: {
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 5
    },
    chartContainer: {
      marginTop: 15,
      marginBottom: 15,
      height: 80
    },
    signatureSection: {
      marginTop: 40
    },
    signatureText: {
      fontSize: 11,
      marginBottom: 3,
      color: '#333333'
    },
    signatureName: {
      fontSize: 11,
      marginTop: 30,
      fontWeight: 'bold',
      color: '#333333'
    },
    signatureTitle: {
      fontSize: 11,
      color: '#666666'
    },
    footer: {
      position: 'absolute',
      bottom: 30,
      left: 40,
      right: 40,
      fontSize: 9,
      color: '#666666',
      textAlign: 'center',
      borderTop: '1pt solid #dee2e6',
      paddingTop: 10
    }
  })
}

// Helper function to format date
const formatDate = (dateString?: string): string => {
  if (!dateString) return new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

// Helper function to get assessment type display name
const getAssessmentTypeDisplay = (type: string): string => {
  const displayNames: Record<string, string> = {
    'suitability': 'Suitability Assessment',
    'atr': 'Attitude to Risk Assessment',
    'cfl': 'Capacity for Loss Assessment',
    'vulnerability': 'Vulnerability Assessment'
  }
  return displayNames[type] || 'Financial Assessment'
}

// Helper function to get risk color
const getRiskColor = (level?: number): string => {
  if (!level) return '#6c757d'
  if (level <= 2) return '#28a745'
  if (level <= 3) return '#ffc107'
  if (level <= 4) return '#fd7e14'
  return '#dc3545'
}

// Simple risk chart component
const RiskChart = ({ score, maxScore = 100 }: { score: number; maxScore?: number }) => {
  const percentage = (score / maxScore) * 100
  const barWidth = 400
  const barHeight = 20
  const filledWidth = (barWidth * percentage) / 100

  return (
    <Svg width={barWidth} height={barHeight} viewBox={`0 0 ${barWidth} ${barHeight}`}>
      {/* Background bar */}
      <Rect 
        x={0} 
        y={0} 
        width={barWidth} 
        height={barHeight} 
        fill="#e9ecef" 
        rx={3}
      />
      {/* Filled bar */}
      <Rect 
        x={0} 
        y={0} 
        width={filledWidth} 
        height={barHeight} 
        fill={percentage > 66 ? '#dc3545' : percentage > 33 ? '#ffc107' : '#28a745'} 
        rx={3}
      />
      {/* Score text */}
      <Text 
        x={barWidth / 2} 
        y={barHeight / 2 + 4} 
        style={{ fontSize: 10, fill: '#333333', textAnchor: 'middle' }}
      >
        {score} / {maxScore}
      </Text>
    </Svg>
  )
}

/**
 * Validate URL is safe for rendering (https only)
 */
const isValidLogoUrl = (url?: string): boolean => {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed.startsWith('https://')) return false
  try {
    new URL(trimmed)
    return true
  } catch {
    return false
  }
}

// Main PDF component
export const AssessmentLetter: React.FC<AssessmentLetterProps> = ({
  assessment,
  client,
  assessmentType,
  branding = {}
}) => {
  // Merge branding with defaults
  const effectiveBranding: AssessmentLetterBranding = {
    firmName: branding.firmName || DEFAULT_BRANDING.firmName,
    firmAddress: branding.firmAddress || DEFAULT_BRANDING.firmAddress,
    firmPhone: branding.firmPhone || DEFAULT_BRANDING.firmPhone,
    firmEmail: branding.firmEmail || DEFAULT_BRANDING.firmEmail,
    fcaNumber: branding.fcaNumber || DEFAULT_BRANDING.fcaNumber,
    logoUrl: isValidLogoUrl(branding.logoUrl) ? branding.logoUrl : undefined,
    primaryColor: branding.primaryColor || DEFAULT_BRANDING.primaryColor,
    accentColor: branding.accentColor || DEFAULT_BRANDING.accentColor,
    footerText: branding.footerText || DEFAULT_BRANDING.footerText,
    advisorName: branding.advisorName || DEFAULT_BRANDING.advisorName,
    advisorTitle: branding.advisorTitle || DEFAULT_BRANDING.advisorTitle,
    advisorPhone: branding.advisorPhone,
    advisorEmail: branding.advisorEmail
  }

  // Create styles based on branding
  const styles = createStyles(effectiveBranding)

  // Extract client details
  const clientTitle = client.personal_details?.title || ''
  const clientFirstName = client.personal_details?.firstName || ''
  const clientLastName = client.personal_details?.lastName || 'Client'
  const clientFullName = `${clientTitle} ${clientFirstName} ${clientLastName}`.trim()
  const clientAddress = client.contact_info?.address
  
  // Extract assessment details based on type
  const getAssessmentDetails = () => {
    const details: any = {
      score: assessment.total_score || 0,
      category: assessment.risk_category || 'Not Assessed',
      level: assessment.risk_level || 1,
      findings: [],
      recommendations: []
    }

    if (assessmentType === 'atr') {
      details.findings = [
        `Your risk tolerance score is ${assessment.total_score || 0} out of 100`,
        `This places you in the "${assessment.risk_category || 'Moderate'}" risk category`,
        `Your attitude to risk aligns with a ${assessment.attitude_to_risk || 'balanced'} investment approach`
      ]
      details.recommendations = assessment.recommendations || [
        'Consider a diversified portfolio matching your risk profile',
        'Review your risk tolerance annually or after major life events',
        'Ensure your investment timeline aligns with your risk capacity'
      ]
    } else if (assessmentType === 'cfl') {
      details.findings = [
        `Your capacity for loss score is ${assessment.total_score || 0} out of 100`,
        `Maximum acceptable loss: ${assessment.max_loss_percentage || 10}% of portfolio value`,
        `Risk capacity category: ${assessment.capacity_category || 'Moderate'}`
      ]
      details.recommendations = assessment.recommendations || [
        'Maintain emergency fund of 3-6 months expenses',
        'Consider protection against significant losses',
        'Review capacity for loss if financial circumstances change'
      ]
    } else if (assessmentType === 'vulnerability') {
      details.findings = [
        assessment.is_vulnerable 
          ? 'Vulnerability factors have been identified that require consideration'
          : 'No significant vulnerability factors identified at this time',
        'Regular review of circumstances recommended'
      ]
      if (assessment.vulnerability_factors && assessment.vulnerability_factors.length > 0) {
        details.findings.push(`Factors to monitor: ${assessment.vulnerability_factors.join(', ')}`)
      }
      details.recommendations = [
        'Maintain open communication about any changes in circumstances',
        'Consider additional safeguards where appropriate',
        'Schedule regular review meetings'
      ]
    } else if (assessmentType === 'suitability') {
      details.findings = [
        'Investment objectives and risk profile have been assessed',
        `Current risk profile: ${assessment.risk_assessment?.attitude_to_risk || 'Moderate'}`,
        `Investment timeline: ${assessment.objectives?.time_horizon || 'Medium term'}`
      ]
      details.recommendations = assessment.recommendations || [
        'Proceed with recommended investment strategy',
        'Review suitability assessment annually',
        'Monitor portfolio alignment with objectives'
      ]
    }

    return details
  }

  const assessmentDetails = getAssessmentDetails()

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Letterhead */}
        <View style={styles.letterhead}>
          {effectiveBranding.logoUrl && (
            <>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={effectiveBranding.logoUrl} style={styles.companyLogo} />
            </>
          )}
          <Text style={styles.companyName}>{effectiveBranding.firmName}</Text>
          {effectiveBranding.firmAddress && (
            <Text style={styles.companyDetails}>{effectiveBranding.firmAddress}</Text>
          )}
          {(effectiveBranding.firmPhone || effectiveBranding.firmEmail) && (
            <Text style={styles.companyDetails}>
              {[
                effectiveBranding.firmPhone ? `Tel: ${effectiveBranding.firmPhone}` : '',
                effectiveBranding.firmEmail ? `Email: ${effectiveBranding.firmEmail}` : ''
              ].filter(Boolean).join(' | ')}
            </Text>
          )}
          {effectiveBranding.fcaNumber && (
            <Text style={styles.companyDetails}>FCA Registration Number: {effectiveBranding.fcaNumber}</Text>
          )}
        </View>

        {/* Date */}
        <Text style={styles.date}>{formatDate(assessment.created_at)}</Text>

        {/* Recipient */}
        <View style={styles.recipientSection}>
          <Text style={styles.recipientName}>{clientFullName}</Text>
          {clientAddress && (
            <>
              {clientAddress.line1 && (
                <Text style={styles.recipientAddress}>{clientAddress.line1}</Text>
              )}
              {clientAddress.line2 && (
                <Text style={styles.recipientAddress}>{clientAddress.line2}</Text>
              )}
              {clientAddress.city && (
                <Text style={styles.recipientAddress}>{clientAddress.city}</Text>
              )}
              {clientAddress.postcode && (
                <Text style={styles.recipientAddress}>{clientAddress.postcode}</Text>
              )}
            </>
          )}
        </View>

        {/* Salutation */}
        <Text style={styles.salutation}>
          Dear {clientTitle} {clientLastName},
        </Text>

        {/* Subject */}
        <Text style={styles.subject}>
          RE: {getAssessmentTypeDisplay(assessmentType).toUpperCase()} - RESULTS AND RECOMMENDATIONS
        </Text>

        {/* Opening paragraph */}
        <Text style={styles.bodyText}>
          Thank you for completing your recent {getAssessmentTypeDisplay(assessmentType).toLowerCase()}. 
          This assessment forms an important part of our commitment to ensuring that any financial 
          advice and recommendations we provide are suitable for your individual circumstances.
        </Text>

        <Text style={styles.bodyText}>
          I am pleased to provide you with a comprehensive analysis of your assessment results, 
          along with our professional recommendations based on your responses.
        </Text>

        {/* Assessment Results Section */}
        <Text style={styles.sectionTitle}>YOUR ASSESSMENT RESULTS</Text>
        
        {/* Risk Score Box */}
        <View style={styles.riskBox}>
          <Text style={styles.riskScore}>Score: {assessmentDetails.score}/100</Text>
          <Text style={[styles.riskCategory, { color: getRiskColor(assessmentDetails.level) }]}>
            Risk Category: {assessmentDetails.category}
          </Text>
          <View style={styles.chartContainer}>
            <RiskChart score={assessmentDetails.score} />
          </View>
        </View>

        {/* Key Findings */}
        <Text style={styles.sectionTitle}>KEY FINDINGS</Text>
        {assessmentDetails.findings.map((finding: string, index: number) => (
          <Text key={index} style={styles.bulletPoint}>
            • {finding}
          </Text>
        ))}

        {/* Recommendations */}
        <Text style={styles.sectionTitle}>OUR RECOMMENDATIONS</Text>
        <Text style={styles.bodyText}>
          Based on your assessment results, we recommend the following:
        </Text>
        {assessmentDetails.recommendations.map((rec: string, index: number) => (
          <Text key={index} style={styles.bulletPoint}>
            • {rec}
          </Text>
        ))}

        {/* Next Steps */}
        <Text style={styles.sectionTitle}>NEXT STEPS</Text>
        <Text style={styles.bodyText}>
          I would welcome the opportunity to discuss these results with you in detail and answer 
          any questions you may have. Please contact me at your earliest convenience to arrange 
          a meeting where we can review your options and develop a tailored financial strategy 
          that aligns with your assessment results.
        </Text>

        {/* Closing */}
        <Text style={styles.bodyText}>
          Should you have any immediate questions or concerns, please do not hesitate to contact 
          me directly.
        </Text>

        {/* Signature */}
        <View style={styles.signatureSection}>
          <Text style={styles.signatureText}>Yours sincerely,</Text>
          <Text style={styles.signatureName}>{effectiveBranding.advisorName}</Text>
          {effectiveBranding.advisorTitle && (
            <Text style={styles.signatureTitle}>{effectiveBranding.advisorTitle}</Text>
          )}
          {effectiveBranding.advisorPhone && (
            <Text style={styles.signatureTitle}>Direct: {effectiveBranding.advisorPhone}</Text>
          )}
          {effectiveBranding.advisorEmail && (
            <Text style={styles.signatureTitle}>Email: {effectiveBranding.advisorEmail}</Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            {effectiveBranding.footerText}
            {effectiveBranding.fcaNumber && ` Regulated by the Financial Conduct Authority (${effectiveBranding.fcaNumber}).`}
            {!effectiveBranding.fcaNumber && ' Regulated by the Financial Conduct Authority.'}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
