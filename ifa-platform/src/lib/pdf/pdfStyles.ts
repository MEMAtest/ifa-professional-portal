import { StyleSheet } from '@react-pdf/renderer'

export const colors = {
  primary: '#1e40af',
  secondary: '#3b82f6',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  text: '#1f2937',
  textLight: '#6b7280',
  border: '#e5e7eb',
  background: '#f9fafb',
  white: '#ffffff',
};

export const baseStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: colors.text,
    backgroundColor: colors.white,
  },
  header: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 20,
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  headerColumn: {
    width: '30%',
  },
  label: {
    fontSize: 8,
    color: colors.textLight,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 10,
    color: colors.text,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 8,
    color: colors.text,
  },
  // Table styles
  table: {
    width: '100%',
    marginVertical: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 25,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: colors.background,
  },
  tableCell: {
    padding: 6,
    fontSize: 9,
  },
  tableCellHeader: {
    padding: 8,
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.text,
  },
  // Metric cards
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 15,
  },
  metricCard: {
    width: '23%',
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 4,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 8,
    color: colors.textLight,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  // Risk indicators
  riskLow: {
    color: colors.success,
    fontWeight: 'bold',
  },
  riskMedium: {
    color: colors.warning,
    fontWeight: 'bold',
  },
  riskHigh: {
    color: colors.danger,
    fontWeight: 'bold',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 8,
    color: colors.textLight,
    textAlign: 'center',
  },
  pageNumber: {
    fontSize: 8,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 5,
  },
  // Lists
  listItem: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 10,
  },
  listBullet: {
    width: 15,
    fontSize: 10,
    color: colors.primary,
  },
  listContent: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.4,
  },
});
