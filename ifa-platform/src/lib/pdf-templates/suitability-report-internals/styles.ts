import { StyleSheet } from '@react-pdf/renderer'

export const defaultSuitabilityBrand = {
  firmName: 'IFA Professional Portal',
  primaryColor: '#1e3a5f',
  accentColor: '#2563eb',
  footerText: 'Confidential - Prepared for the client'
}

export type SuitabilityBranding = {
  firmName?: string
  logoUrl?: string
  primaryColor?: string
  accentColor?: string
  footerText?: string
}

export const createSuitabilityStyles = (brand: SuitabilityBranding = defaultSuitabilityBrand) =>
  StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 10,
      fontFamily: 'Helvetica',
      color: '#1a1a1a'
    },
    header: {
      borderBottom: `2pt solid ${brand.accentColor}`,
      paddingBottom: 12,
      marginBottom: 16
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    firmName: {
      fontSize: 14,
      fontWeight: 'bold',
      color: brand.primaryColor
    },
    reportTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: brand.primaryColor,
      marginTop: 20,
      marginBottom: 8,
      textAlign: 'center'
    },
    subtitle: {
      fontSize: 12,
      color: '#666',
      textAlign: 'center',
      marginBottom: 20
    },
    section: {
      marginTop: 16,
      marginBottom: 8
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: brand.primaryColor,
      marginBottom: 10,
      borderBottom: `1pt solid ${brand.accentColor}`,
      paddingBottom: 4
    },
    subsection: {
      marginTop: 10,
      marginBottom: 6
    },
    subsectionTitle: {
      fontSize: 11,
      fontWeight: 'bold',
      color: '#333',
      marginBottom: 6
    },
    text: {
      fontSize: 10,
      lineHeight: 1.5,
      color: '#333',
      marginBottom: 4
    },
    boldText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#1a1a1a'
    },
    label: {
      fontSize: 9,
      color: '#666',
      marginBottom: 2
    },
    value: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#1a1a1a',
      marginBottom: 6
    },
    card: {
      border: '1pt solid #e0e0e0',
      borderRadius: 4,
      padding: 12,
      marginBottom: 10,
      backgroundColor: '#fafafa'
    },
    warningCard: {
      border: '1pt solid #f59e0b',
      borderRadius: 4,
      padding: 12,
      marginBottom: 10,
      backgroundColor: '#fef3c7'
    },
    successCard: {
      border: '1pt solid #10b981',
      borderRadius: 4,
      padding: 12,
      marginBottom: 10,
      backgroundColor: '#d1fae5'
    },
    infoCard: {
      border: '1pt solid #3b82f6',
      borderRadius: 4,
      padding: 12,
      marginBottom: 10,
      backgroundColor: '#dbeafe'
    },
    grid2: {
      flexDirection: 'row',
      flexWrap: 'wrap'
    },
    gridCol2: {
      width: '48%',
      marginRight: '2%'
    },
    grid3: {
      flexDirection: 'row',
      flexWrap: 'wrap'
    },
    gridCol3: {
      width: '31%',
      marginRight: '2%'
    },
    table: {
      marginTop: 8
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: brand.primaryColor,
      padding: 6
    },
    tableHeaderCell: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 9,
      flex: 1
    },
    tableRow: {
      flexDirection: 'row',
      borderBottom: '1pt solid #e0e0e0',
      padding: 6
    },
    tableCell: {
      fontSize: 9,
      flex: 1,
      color: '#333'
    },
    bulletList: {
      marginLeft: 10,
      marginTop: 4
    },
    bulletItem: {
      flexDirection: 'row',
      marginBottom: 4
    },
    bullet: {
      width: 12,
      fontSize: 10
    },
    bulletText: {
      flex: 1,
      fontSize: 10,
      lineHeight: 1.4
    },
    footer: {
      position: 'absolute',
      bottom: 30,
      left: 40,
      right: 40,
      borderTop: '1pt solid #e0e0e0',
      paddingTop: 8,
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
    footerText: {
      fontSize: 8,
      color: '#666'
    },
    pageNumber: {
      fontSize: 8,
      color: '#666'
    },
    riskIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10
    },
    riskBar: {
      height: 12,
      flex: 1,
      flexDirection: 'row',
      borderRadius: 6,
      overflow: 'hidden'
    },
    riskSegment: {
      flex: 1
    },
    coverPage: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 100
    },
    coverTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: brand.primaryColor,
      textAlign: 'center',
      marginBottom: 20
    },
    coverSubtitle: {
      fontSize: 16,
      color: '#666',
      textAlign: 'center',
      marginBottom: 40
    },
    coverClientName: {
      fontSize: 20,
      fontWeight: 'bold',
      color: brand.accentColor,
      textAlign: 'center',
      marginBottom: 10
    },
    signatureBlock: {
      marginTop: 30,
      paddingTop: 20,
      borderTop: '1pt solid #e0e0e0'
    },
    signatureLine: {
      borderBottom: '1pt solid #333',
      marginTop: 40,
      marginBottom: 4,
      width: '60%'
    },
    complianceBox: {
      border: '2pt solid #ef4444',
      borderRadius: 4,
      padding: 12,
      marginTop: 16,
      backgroundColor: '#fef2f2'
    },
    complianceTitle: {
      fontSize: 11,
      fontWeight: 'bold',
      color: '#b91c1c',
      marginBottom: 6
    },
    chartImage: {
      width: 200,
      height: 150,
      marginVertical: 10
    }
  })
