import React from 'react'
import { Text, View } from '@react-pdf/renderer'

export const PageFooter: React.FC<{ styles: any; brand: any }> = ({ styles, brand }) => (
  <View style={styles.footer}>
    <Text style={styles.footerText}>{brand.footerText}</Text>
    <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
  </View>
)

