import React from 'react'
import { Text, View } from '@react-pdf/renderer'

type TableHeader = {
  label: string
  style?: any
}

type TableCell = {
  value: string | number
  numeric?: boolean
  style?: any
}

type TableRow = {
  cells: TableCell[]
  style?: any
}

export const Table: React.FC<{ headers: TableHeader[]; rows: TableRow[]; styles: any }> = ({ headers, rows, styles }) => (
  <View style={styles.table}>
    <View style={styles.tableHeader}>
      {headers.map((header, index) => (
        <Text key={index} style={[styles.tableHeaderCell, header.style]}>
          {header.label}
        </Text>
      ))}
    </View>
    {rows.map((row, rowIndex) => (
      <View key={rowIndex} style={[rowIndex % 2 === 0 ? styles.tableRow : styles.tableRowAlt, row.style]}>
        {row.cells.map((cell, cellIndex) => (
          <Text key={cellIndex} style={[styles.tableCell, cell.numeric ? styles.tableCellNumeric : null, cell.style]}>
            {cell.value}
          </Text>
        ))}
      </View>
    ))}
  </View>
)

