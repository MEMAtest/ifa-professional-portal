import { FileText, FileSpreadsheet, Mail, Image, File, FileType } from 'lucide-react'

export const TYPE_CONFIG: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  pdf: { icon: FileText, label: 'PDF', color: 'text-red-600 bg-red-50' },
  word: { icon: FileType, label: 'Word', color: 'text-blue-600 bg-blue-50' },
  email: { icon: Mail, label: 'Email', color: 'text-purple-600 bg-purple-50' },
  spreadsheet: { icon: FileSpreadsheet, label: 'Spreadsheet', color: 'text-green-600 bg-green-50' },
  image: { icon: Image, label: 'Image', color: 'text-amber-600 bg-amber-50' },
  text: { icon: FileText, label: 'Text', color: 'text-gray-600 bg-gray-50' },
  upload: { icon: File, label: 'File', color: 'text-gray-600 bg-gray-50' },
}

export const CLASSIFICATION_LABELS: Record<string, string> = {
  pension_statement: 'Pension Statement',
  bank_statement: 'Bank Statement',
  investment_report: 'Investment Report',
  insurance_policy: 'Insurance Policy',
  tax_document: 'Tax Document',
  identity_document: 'Identity Document',
  correspondence: 'Correspondence',
  transfer_form: 'Transfer Form',
  valuation_report: 'Valuation Report',
  fund_factsheet: 'Fund Factsheet',
  application_form: 'Application Form',
  meeting_notes: 'Meeting Notes',
  compliance_document: 'Compliance Document',
  other: 'Other',
}
