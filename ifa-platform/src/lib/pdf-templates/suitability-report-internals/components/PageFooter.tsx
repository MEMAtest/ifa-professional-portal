import React from 'react'
import { Text, View } from '@react-pdf/renderer'
import type { SuitabilityBranding } from '../styles'

interface PageFooterProps {
  styles: Record<string, any>
  brand: SuitabilityBranding
}

export const PageFooter: React.FC<PageFooterProps> = ({ styles, brand }) => {
  // Build footer left text: Firm Name | FCA: 123456 | Custom footer text
  const footerParts: string[] = []
  if (brand.firmName) footerParts.push(brand.firmName)
  if (brand.fcaNumber) footerParts.push(`FCA: ${brand.fcaNumber}`)
  if (brand.footerText) footerParts.push(brand.footerText)

  const footerLeftText = footerParts.length > 0
    ? footerParts.join(' | ')
    : 'Confidential - Prepared for the client'

  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>{footerLeftText}</Text>
      <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  )
}

