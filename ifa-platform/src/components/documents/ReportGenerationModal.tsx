// src/components/documents/ReportGenerationModal.tsx
import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Send, 
  Save,
  FileText,
  Edit3,
  Eye,
  Mail,
  CheckCircle,
  Upload,
  Building2,
  X,
  Loader2
} from 'lucide-react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useToast } from '@/components/ui/use-toast'
import { generatePDF } from '@/lib/pdf/generatePDF'
import { sendReportEmail } from '@/services/emailService'
import sanitizeHtml from 'sanitize-html'

const sanitizeReportHtml = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'style']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'width', 'height', 'style'],
      '*': ['style', 'class', 'id']
    }
  })

// Import types from your existing assessment types
import type { 
  SuitabilityData,
  SuitabilityDataEnhanced 
} from '@/types/assessment'

// Dynamic import Quill with proper typing
const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill')
    const QuillWrapper = (props: any) => <RQ {...props} />
    QuillWrapper.displayName = 'ReactQuill'
    return QuillWrapper
  },
  {
    ssr: false,
    loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded" />
  }
) as React.ComponentType<any>

// Import Quill styles
import 'react-quill/dist/quill.snow.css'

// ================================================================
// INTERFACES
// ================================================================

interface ReportGenerationModalProps {
  isOpen: boolean
  onClose: () => void
  assessmentData: any
  assessmentType: 'atr' | 'cfl' | 'suitability' | 'vulnerability' | 'combined'
  clientId: string
  clientName: string
  clientEmail?: string
}

interface ReportSection {
  id: string
  title: string
  content: string
  editable: boolean
  isCustom?: boolean
}

interface EmailFormData {
  to: string[]
  cc: string[]
  subject: string
  message: string
  attachPDF: boolean
}

interface FirmSettings {
  logoUrl?: string
  firmName: string
  firmAddress?: string
  firmPhone?: string
  firmEmail?: string
  primaryColor?: string
}

type WizardStep = 'edit' | 'preview' | 'send' | 'complete'

// ================================================================
// CUSTOM MODAL COMPONENT
// ================================================================

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

function Modal({ isOpen, onClose, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
      />
      
      {/* Modal Content */}
      <div className="absolute inset-0 bg-white">
        {children}
      </div>
    </div>
  )
}

// ================================================================
// MAIN COMPONENT
// ================================================================

export default function ReportGenerationModal({
  isOpen,
  onClose,
  assessmentData,
  assessmentType,
  clientId,
  clientName,
  clientEmail
}: ReportGenerationModalProps) {
  const { toast } = useToast()
  
  // State
  const [currentStep, setCurrentStep] = useState<WizardStep>('edit')
  const [reportSections, setReportSections] = useState<ReportSection[]>([])
  const [customSections, setCustomSections] = useState<ReportSection[]>([])
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [documentId, setDocumentId] = useState<string | null>(null)
  
  // Firm customization
  const [firmSettings, setFirmSettings] = useState<FirmSettings>({
    firmName: 'Financial Advisory Firm',
    logoUrl: undefined
  })
  
  // Email form
  const [emailForm, setEmailForm] = useState<EmailFormData>({
    to: clientEmail ? [clientEmail] : [],
    cc: [],
    subject: `${assessmentType.toUpperCase()} Assessment Report - ${clientName}`,
    message: `Dear ${clientName},\n\nPlease find attached your ${assessmentType.toUpperCase()} assessment report.\n\nBest regards,\nYour Financial Advisor`,
    attachPDF: true
  })

  // ================================================================
  // INITIALIZE REPORT SECTIONS
  // ================================================================
  
  const initializeReportSections = useCallback(() => {
    const sections = generateInitialSections(assessmentType, assessmentData, clientName)
    setReportSections(sections)
    setCustomSections([])
    setCurrentStep('edit')
    setPdfBlob(null)
    setDocumentId(null)
  }, [assessmentData, assessmentType, clientName])

  const loadFirmSettings = useCallback(async () => {
    // Load from localStorage or user settings
    const savedSettings = localStorage.getItem('firmSettings')
    if (savedSettings) {
      try {
        setFirmSettings(JSON.parse(savedSettings))
      } catch (e) {
        console.error('Failed to load firm settings')
      }
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      initializeReportSections()
      loadFirmSettings()
    }
  }, [isOpen, initializeReportSections, loadFirmSettings])

  // ================================================================
  // SECTION MANAGEMENT
  // ================================================================

  const updateSection = (sectionId: string, content: string) => {
    setReportSections(prev => 
      prev.map(section => 
        section.id === sectionId ? { ...section, content } : section
      )
    )
  }

  const addCustomSection = () => {
    const newSection: ReportSection = {
      id: `custom-${Date.now()}`,
      title: 'New Section',
      content: '<p>Enter your content here...</p>',
      editable: true,
      isCustom: true
    }
    setCustomSections(prev => [...prev, newSection])
  }

  const removeCustomSection = (sectionId: string) => {
    setCustomSections(prev => prev.filter(s => s.id !== sectionId))
  }

  const updateCustomSection = (sectionId: string, updates: Partial<ReportSection>) => {
    setCustomSections(prev =>
      prev.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    )
  }

  // ================================================================
  // LOGO UPLOAD
  // ================================================================

  const handleLogoUpload = async (file: File) => {
    try {
      const reader = new FileReader()
      reader.onloadend = () => {
        const logoUrl = reader.result as string
        const updatedSettings = { ...firmSettings, logoUrl }
        setFirmSettings(updatedSettings)
        localStorage.setItem('firmSettings', JSON.stringify(updatedSettings))
        toast({
          title: 'Logo uploaded',
          description: 'Your firm logo has been updated'
        })
      }
      reader.readAsDataURL(file)
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload logo',
        variant: 'destructive'
      })
    }
  }

  // ================================================================
  // PDF GENERATION
  // ================================================================

  const generatePDFDocument = async () => {
    setIsGenerating(true)
    try {
      const htmlContent = generateHTMLReport(
        reportSections.concat(customSections),
        firmSettings,
        clientName,
        assessmentType
      )
      
      const result = await generatePDF(htmlContent, `${assessmentType}_report_${clientName.replace(/\s+/g, '_')}.pdf`) as any
      
      // If we reached here, result should be a Blob since generatePDF doesn't throw
      if (result instanceof Blob) {
        setPdfBlob(result)
        setCurrentStep('preview')
      } else {
        throw new Error('PDF generation did not return a Blob')
      }
      
      toast({
        title: 'PDF Generated',
        description: 'Your report has been generated successfully'
      })
    } catch (error) {
      console.error('PDF generation error:', error)
      toast({
        title: 'Generation failed',
        description: 'Failed to generate PDF report',
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // ================================================================
  // EMAIL SENDING WITH UPDATED SERVICE
  // ================================================================

  const sendEmail = async () => {
    if (!pdfBlob) return
    
    setIsSending(true)
    try {
      // First save the document
      const savedDocId = await saveDocument()
      
      // Convert blob to base64 for sending
      const base64PDF = await blobToBase64(pdfBlob)
      
      // Send email with attachment using the email service
      await sendReportEmail({
        to: emailForm.to,
        cc: emailForm.cc,
        subject: emailForm.subject,
        message: emailForm.message,
        attachments: emailForm.attachPDF ? [{
          filename: `${assessmentType}_report_${clientName.replace(/\s+/g, '_')}.pdf`,
          content: base64PDF
        }] : undefined
      })
      
      setCurrentStep('complete')
      setDocumentId(savedDocId)
      
      toast({
        title: 'Email sent',
        description: 'Report has been sent successfully'
      })
    } catch (error) {
      console.error('Email error:', error)
      toast({
        title: 'Send failed',
        description: error instanceof Error ? error.message : 'Failed to send email',
        variant: 'destructive'
      })
    } finally {
      setIsSending(false)
    }
  }

  // ================================================================
  // DOCUMENT SAVING
  // ================================================================

  const saveDocument = async (): Promise<string> => {
    if (!pdfBlob) throw new Error('No PDF to save')
    
    try {
      const base64PDF = await blobToBase64(pdfBlob)
      
      const response = await fetch('/api/documents/save-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          assessmentType,
          assessmentId: assessmentData.id,
          fileName: `${assessmentType}_report_${Date.now()}.pdf`,
          fileBlob: base64PDF,
          metadata: {
            generatedBy: 'report_wizard',
            firmSettings: {
              firmName: firmSettings.firmName,
              hasLogo: !!firmSettings.logoUrl
            },
            customSections: customSections.length,
            clientName,
            clientEmail
          }
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save document')
      }
      
      const { documentId } = await response.json()
      return documentId
    } catch (error) {
      console.error('Failed to save document:', error)
      throw error
    }
  }

  // ================================================================
  // NAVIGATION
  // ================================================================

  const canGoNext = () => {
    switch (currentStep) {
      case 'edit':
        return reportSections.length > 0
      case 'preview':
        return pdfBlob !== null
      case 'send':
        return emailForm.to.length > 0 && emailForm.to[0].includes('@')
      default:
        return false
    }
  }

  const handleNext = () => {
    switch (currentStep) {
      case 'edit':
        generatePDFDocument()
        break
      case 'preview':
        setCurrentStep('send')
        break
      case 'send':
        sendEmail()
        break
    }
  }

  const handleBack = () => {
    switch (currentStep) {
      case 'preview':
        setCurrentStep('edit')
        break
      case 'send':
        setCurrentStep('preview')
        break
    }
  }

  // ================================================================
  // RENDER STEPS
  // ================================================================

  const renderEditStep = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h2 className="text-2xl font-bold">Edit Report Content</h2>
          <p className="text-gray-600 mt-1">Customize the report before generating</p>
        </div>
        
        {/* Logo Upload */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-600">Firm Logo</p>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
              />
              <div className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
                <Upload className="h-4 w-4" />
                <span className="text-sm">{firmSettings.logoUrl ? 'Change' : 'Upload'}</span>
              </div>
            </label>
          </div>
          {firmSettings.logoUrl && (
            <Image
              src={firmSettings.logoUrl}
              alt="Firm logo"
              width={120}
              height={48}
              className="h-12 w-auto object-contain"
              unoptimized
            />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Firm Name Input */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Firm Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Firm Name</label>
                <input
                  type="text"
                  value={firmSettings.firmName}
                  onChange={(e) => {
                    const updated = { ...firmSettings, firmName: e.target.value }
                    setFirmSettings(updated)
                    localStorage.setItem('firmSettings', JSON.stringify(updated))
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </Card>

          {/* Standard Sections */}
          {reportSections.map((section) => (
            <Card key={section.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold">{section.title}</h3>
                {!section.editable && (
                  <Badge variant="secondary">Auto-generated</Badge>
                )}
              </div>
              
              {section.editable ? (
                <ReactQuill
                  value={section.content}
                  onChange={(content: string) => updateSection(section.id, content)}
                  theme="snow"
                  modules={{
                    toolbar: [
                      [{ header: [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline'],
                      [{ list: 'ordered' }, { list: 'bullet' }],
                      ['link', 'clean']
                    ]
                  }}
                  className="bg-white"
                />
              ) : (
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeReportHtml(section.content) }}
                />
              )}
            </Card>
          ))}

          {/* Custom Sections */}
          {customSections.map((section) => (
            <Card key={section.id} className="p-6 border-blue-200">
              <div className="flex items-start justify-between mb-4">
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => updateCustomSection(section.id, { title: e.target.value })}
                  className="text-lg font-semibold bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none"
                  placeholder="Section Title"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeCustomSection(section.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </Button>
              </div>
              
              <ReactQuill
                value={section.content}
                onChange={(content: string) => updateCustomSection(section.id, { content })}
                theme="snow"
                modules={{
                  toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline'],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    ['link', 'blockquote', 'clean']
                  ]
                }}
                className="bg-white"
              />
            </Card>
          ))}

          {/* Add Custom Section Button */}
          <Button
            variant="outline"
            onClick={addCustomSection}
            className="w-full border-dashed"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Add Custom Section
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t bg-gray-50">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleNext}
            disabled={!canGoNext() || isGenerating}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Generate PDF
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )

  const renderPreviewStep = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h2 className="text-2xl font-bold">Preview Report</h2>
          <p className="text-gray-600 mt-1">Review the generated PDF</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => pdfBlob && downloadPDF(pdfBlob, `${assessmentType}_report.pdf`)}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* PDF Preview */}
      <div className="flex-1 overflow-hidden p-6 bg-gray-100">
        <div className="h-full flex items-center justify-center">
          {pdfBlob ? (
            <iframe
              src={URL.createObjectURL(pdfBlob)}
              className="w-full h-full rounded-lg shadow-lg"
              title="PDF Preview"
            />
          ) : (
            <div className="text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Loading preview...</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t bg-gray-50">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Edit
          </Button>
          <Button 
            onClick={handleNext}
            className="flex items-center gap-2"
          >
            Send Report
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  const renderSendStep = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h2 className="text-2xl font-bold">Send Report</h2>
          <p className="text-gray-600 mt-1">Email the report to your client</p>
        </div>
      </div>

      {/* Email Form */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Email Details</h3>
            
            <div className="space-y-4">
              {/* To Field */}
              <div>
                <label className="block text-sm font-medium mb-1">To</label>
                <input
                  type="text"
                  value={emailForm.to.join(', ')}
                  onChange={(e) => setEmailForm(prev => ({
                    ...prev,
                    to: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                  }))}
                  placeholder="client@example.com"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* CC Field */}
              <div>
                <label className="block text-sm font-medium mb-1">CC (Optional)</label>
                <input
                  type="text"
                  value={emailForm.cc.join(', ')}
                  onChange={(e) => setEmailForm(prev => ({
                    ...prev,
                    cc: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                  }))}
                  placeholder="additional@example.com"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <textarea
                  value={emailForm.message}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={6}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Attach PDF */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="attachPDF"
                  checked={emailForm.attachPDF}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, attachPDF: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="attachPDF" className="text-sm cursor-pointer">
                  Attach PDF report
                </label>
              </div>
            </div>
          </Card>

          {/* Preview */}
          <Card className="p-6 bg-gray-50">
            <h4 className="font-medium mb-2">Email Preview</h4>
            <div className="text-sm space-y-2">
              <p><strong>To:</strong> {emailForm.to.join(', ') || 'No recipients'}</p>
              {emailForm.cc.length > 0 && (
                <p><strong>CC:</strong> {emailForm.cc.join(', ')}</p>
              )}
              <p><strong>Subject:</strong> {emailForm.subject}</p>
              {emailForm.attachPDF && (
                <p className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  PDF Report will be attached
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t bg-gray-50">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Preview
          </Button>
          <Button 
            onClick={handleNext}
            disabled={!canGoNext() || isSending}
            className="flex items-center gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )

  const renderCompleteStep = () => (
    <div className="flex flex-col h-full items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
        
        <h2 className="text-2xl font-bold mb-2">Report Sent Successfully!</h2>
        <p className="text-gray-600 mb-6">
          The {assessmentType.toUpperCase()} assessment report has been sent to {emailForm.to.join(', ')}
        </p>
        
        <div className="space-y-3">
          {documentId && (
            <Button
              variant="outline"
              onClick={() => window.open(`/documents/${documentId}`, '_blank')}
              className="w-full"
            >
              View in Documents
            </Button>
          )}
          
          <Button
            onClick={onClose}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )

  // ================================================================
  // MAIN RENDER
  // ================================================================

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="h-full flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Progress Bar */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-center gap-4">
            {(['edit', 'preview', 'send', 'complete'] as WizardStep[]).map((step, index) => (
              <React.Fragment key={step}>
                <div className="flex items-center gap-2">
                  <div className={`
                    h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                    ${currentStep === step ? 'bg-blue-600 text-white' : 
                      getStepIndex(currentStep) > index ? 'bg-green-600 text-white' : 
                      'bg-gray-200 text-gray-600'}
                  `}>
                    {getStepIndex(currentStep) > index ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className={`text-sm hidden sm:inline ${
                    currentStep === step ? 'font-medium' : 'text-gray-600'
                  }`}>
                    {step.charAt(0).toUpperCase() + step.slice(1)}
                  </span>
                </div>
                {index < 3 && (
                  <div className={`w-8 sm:w-16 h-0.5 transition-colors ${
                    getStepIndex(currentStep) > index ? 'bg-green-600' : 'bg-gray-300'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-hidden">
          {currentStep === 'edit' && renderEditStep()}
          {currentStep === 'preview' && renderPreviewStep()}
          {currentStep === 'send' && renderSendStep()}
          {currentStep === 'complete' && renderCompleteStep()}
        </div>
      </div>
    </Modal>
  )
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function getStepIndex(step: WizardStep): number {
  const steps: WizardStep[] = ['edit', 'preview', 'send', 'complete']
  return steps.indexOf(step)
}

function generateInitialSections(
  assessmentType: string,
  assessmentData: any,
  clientName: string
): ReportSection[] {
  // Generate sections based on assessment type
  const baseSection: ReportSection = {
    id: 'header',
    title: 'Report Header',
    content: `<h1>${assessmentType.toUpperCase()} Assessment Report</h1>
              <p>Prepared for: ${clientName}</p>
              <p>Date: ${new Date().toLocaleDateString('en-GB')}</p>`,
    editable: false
  }

  const recommendationsSection: ReportSection = {
    id: 'recommendations',
    title: 'Recommendations',
    content: '<p>Based on our assessment, we recommend the following:</p><ul><li>Consider your current risk profile when making investment decisions</li><li>Review your portfolio allocation regularly</li><li>Maintain open communication with your advisor</li></ul>',
    editable: true
  }

  // Add type-specific sections
  let typeSections: ReportSection[] = []

  switch (assessmentType) {
    case 'atr':
      typeSections = [
        {
          id: 'risk-profile',
          title: 'Risk Profile Summary',
          content: generateATRSummary(assessmentData),
          editable: false
        },
        {
          id: 'risk-analysis',
          title: 'Risk Analysis',
          content: generateATRAnalysis(assessmentData),
          editable: false
        }
      ]
      break
      
    case 'cfl':
      typeSections = [
        {
          id: 'capacity-summary',
          title: 'Capacity for Loss Summary',
          content: generateCFLSummary(assessmentData),
          editable: false
        },
        {
          id: 'financial-analysis',
          title: 'Financial Analysis',
          content: generateCFLAnalysis(assessmentData),
          editable: false
        }
      ]
      break
      
    case 'suitability':
      typeSections = [
        {
          id: 'suitability-summary',
          title: 'Suitability Assessment Summary',
          content: generateSuitabilitySummary(assessmentData),
          editable: false
        },
        {
          id: 'objectives',
          title: 'Investment Objectives',
          content: generateObjectivesSection(assessmentData),
          editable: false
        }
      ]
      break
      
    case 'vulnerability':
      typeSections = [
        {
          id: 'vulnerability-status',
          title: 'Vulnerability Assessment',
          content: generateVulnerabilitySummary(assessmentData),
          editable: false
        }
      ]
      break
  }

  const disclaimerSection: ReportSection = {
    id: 'disclaimer',
    title: 'Important Information',
    content: '<p><small>This report is confidential and has been prepared for the exclusive use of the named client. The information contained in this report is based on the data provided at the time of assessment and may be subject to change.</small></p>',
    editable: true
  }

  return [baseSection, ...typeSections, recommendationsSection, disclaimerSection]
}

function generateATRSummary(data: any): string {
  return `
    <div>
      <p><strong>Overall Risk Score:</strong> ${data.total_score || 0}/100</p>
      <p><strong>Risk Category:</strong> ${data.risk_category || 'Not assessed'}</p>
      <p><strong>Risk Level:</strong> ${data.risk_level || 'Medium'}</p>
      <br/>
      <h4>Category Scores:</h4>
      <ul>
        <li>Attitude to Risk: ${data.category_scores?.attitude || 0}/100</li>
        <li>Investment Experience: ${data.category_scores?.experience || 0}/100</li>
        <li>Financial Knowledge: ${data.category_scores?.knowledge || 0}/100</li>
        <li>Emotional Resilience: ${data.category_scores?.emotional || 0}/100</li>
      </ul>
    </div>
  `
}

function generateATRAnalysis(data: any): string {
  const riskLevel = data.risk_level || 3
  const riskDescription = riskLevel <= 2 ? 'conservative' : riskLevel >= 4 ? 'aggressive' : 'moderate'
  
  return `
    <div>
      <p>Based on your responses, your risk profile indicates a ${riskDescription} approach to investment risk.</p>
      <p>This assessment takes into account:</p>
      <ul>
        <li>Your comfort level with investment volatility</li>
        <li>Your investment time horizon</li>
        <li>Your financial knowledge and experience</li>
        <li>Your emotional response to market fluctuations</li>
      </ul>
    </div>
  `
}

function generateCFLSummary(data: any): string {
  return `
    <div>
      <p><strong>Capacity Score:</strong> ${data.total_score || 0}/100</p>
      <p><strong>Maximum Loss Tolerance:</strong> ${data.max_loss_percentage || 0}%</p>
      <p><strong>Confidence Level:</strong> ${data.confidence_level || 'Medium'}</p>
      <br/>
      <h4>Financial Summary:</h4>
      <ul>
        <li>Monthly Income: £${(data.monthly_income || 0).toLocaleString()}</li>
        <li>Monthly Expenses: £${(data.monthly_expenses || 0).toLocaleString()}</li>
        <li>Emergency Fund: £${(data.emergency_fund || 0).toLocaleString()}</li>
        <li>Other Investments: £${(data.other_investments || 0).toLocaleString()}</li>
      </ul>
    </div>
  `
}

function generateCFLAnalysis(data: any): string {
  const hasEmergencyFund = (data.emergency_fund || 0) >= (data.monthly_expenses || 1) * 3
  const cashFlow = (data.monthly_income || 0) - (data.monthly_expenses || 0)
  
  return `
    <div>
      <p>Your capacity for loss assessment indicates:</p>
      <ul>
        <li>Monthly cash flow: £${cashFlow.toLocaleString()} ${cashFlow > 0 ? '(positive)' : '(negative)'}</li>
        <li>Emergency fund coverage: ${hasEmergencyFund ? 'Adequate' : 'Needs attention'}</li>
        <li>Investment diversification: ${(data.other_investments || 0) > 0 ? 'Some diversification present' : 'Limited diversification'}</li>
      </ul>
      ${!hasEmergencyFund ? '<p><strong>Note:</strong> We recommend building an emergency fund of at least 3-6 months of expenses before making significant investments.</p>' : ''}
    </div>
  `
}

function generateSuitabilitySummary(data: any): string {
  return `
    <div>
      <p><strong>Assessment Date:</strong> ${new Date().toLocaleDateString('en-GB')}</p>
      <p><strong>Investment Objectives:</strong> ${data.objectives?.primary_objective || 'Not specified'}</p>
      <p><strong>Investment Horizon:</strong> ${data.objectives?.time_horizon || 'Not specified'}</p>
      <p><strong>Risk Profile:</strong> ${data.risk_assessment?.attitude_to_risk || 'Moderate'}</p>
    </div>
  `
}

function generateObjectivesSection(data: any): string {
  return `
    <div>
      <p>Your stated investment objectives include:</p>
      <ul>
        <li>Primary objective: ${data.objectives?.primary_objective || 'Capital growth'}</li>
        <li>Time horizon: ${data.objectives?.time_horizon || 'Medium term (3-5 years)'}</li>
        <li>Income requirements: ${data.objectives?.income_required ? 'Yes' : 'No'}</li>
      </ul>
    </div>
  `
}

function generateVulnerabilitySummary(data: any): string {
  const isVulnerable = data.is_vulnerable || false
  
  return `
    <div>
      <p><strong>Vulnerability Status:</strong> ${isVulnerable ? 'Vulnerable Client Identified' : 'No Vulnerabilities Identified'}</p>
      ${isVulnerable && data.vulnerability_factors ? `
        <p><strong>Identified Factors:</strong></p>
        <ul>
          ${data.vulnerability_factors.map((factor: string) => `<li>${factor}</li>`).join('')}
        </ul>
      ` : ''}
      <p><strong>Next Review Date:</strong> ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')}</p>
    </div>
  `
}

function generateHTMLReport(
  sections: ReportSection[],
  firmSettings: FirmSettings,
  clientName: string,
  assessmentType: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            margin: 20mm;
            size: A4;
          }
          
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333;
            margin: 0;
            padding: 0;
          }
          
          .header { 
            text-align: center; 
            margin-bottom: 40px; 
            padding: 20px;
            border-bottom: 2px solid ${firmSettings.primaryColor || '#2563eb'};
          }
          
          .logo { 
            max-height: 60px; 
            margin-bottom: 20px; 
          }
          
          .section { 
            margin-bottom: 30px; 
            page-break-inside: avoid; 
          }
          
          .section h2 { 
            color: ${firmSettings.primaryColor || '#2563eb'};
            margin-bottom: 15px;
          }
          
          .section h3, .section h4 {
            color: #1f2937;
            margin-top: 15px;
            margin-bottom: 10px;
          }
          
          .section ul {
            margin-left: 20px;
          }
          
          .section li {
            margin-bottom: 5px;
          }
          
          .footer { 
            text-align: center; 
            margin-top: 50px; 
            padding-top: 20px; 
            border-top: 1px solid #ddd;
            color: #6b7280;
            font-size: 12px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          
          th, td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          
          th {
            background-color: #f3f4f6;
            font-weight: bold;
          }
          
          .highlight {
            background-color: #fef3c7;
            padding: 15px;
            border-left: 4px solid #f59e0b;
            margin: 15px 0;
          }
          
          .success {
            color: #059669;
          }
          
          .warning {
            color: #d97706;
          }
          
          .error {
            color: #dc2626;
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${firmSettings.logoUrl ? `<img src="${firmSettings.logoUrl}" class="logo" alt="${firmSettings.firmName}" />` : ''}
          <h1>${firmSettings.firmName}</h1>
          ${firmSettings.firmAddress ? `<p style="margin: 5px 0;">${firmSettings.firmAddress}</p>` : ''}
          ${firmSettings.firmPhone ? `<p style="margin: 5px 0;">Tel: ${firmSettings.firmPhone}</p>` : ''}
          ${firmSettings.firmEmail ? `<p style="margin: 5px 0;">Email: ${firmSettings.firmEmail}</p>` : ''}
        </div>
        
        ${sections.map(section => `
          <div class="section">
            ${section.title !== 'Report Header' ? `<h2>${section.title}</h2>` : ''}
            ${section.content}
          </div>
        `).join('')}
        
        <div class="footer">
          <p>This report is confidential and prepared for ${clientName}</p>
          <p>&copy; ${new Date().getFullYear()} ${firmSettings.firmName}. All rights reserved.</p>
          <p>Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}</p>
        </div>
      </body>
    </html>
  `
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
