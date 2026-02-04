'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Clock,
  AlertTriangle,
  DollarSign,
  Coins,
  Activity,
  Percent,
  Droplets,
  BarChart3,
  HelpCircle,
  Building2
} from 'lucide-react'
import clientLogger from '@/lib/logging/clientLogger'
import { FirmAnalyticsService, type MarketConditions } from '@/services/FirmAnalyticsService'

// Tooltip explanations for each metric
const METRIC_EXPLANATIONS = {
  ftse100: {
    title: 'FTSE 100 Index',
    description: 'The Financial Times Stock Exchange 100 Index tracks the 100 largest companies listed on the London Stock Exchange by market capitalisation.',
    interpretation: (value: number, change: number) => {
      if (change > 1) return `At ${value.toLocaleString()}, the market is up ${change.toFixed(2)}% today, indicating positive investor sentiment.`
      if (change < -1) return `At ${value.toLocaleString()}, the market is down ${Math.abs(change).toFixed(2)}% today, suggesting caution among investors.`
      return `At ${value.toLocaleString()}, the market is relatively flat today (${change >= 0 ? '+' : ''}${change.toFixed(2)}%), indicating stable conditions.`
    },
    impact: 'Affects equity portions of client portfolios. Falling markets may trigger review for cautious clients.'
  },
  boeRate: {
    title: 'Bank of England Base Rate',
    description: 'The interest rate set by the BoE Monetary Policy Committee. This is the rate at which banks borrow from the BoE overnight.',
    interpretation: (value: number) => {
      if (value >= 5) return `At ${value.toFixed(2)}%, rates are elevated. Savers benefit, but mortgage holders and borrowers face higher costs.`
      if (value >= 4) return `At ${value.toFixed(2)}%, rates are moderately high. Fixed income yields are attractive.`
      if (value <= 2) return `At ${value.toFixed(2)}%, rates are low. Income-seekers may need alternative strategies.`
      return `At ${value.toFixed(2)}%, rates are in a neutral zone.`
    },
    impact: 'Directly affects mortgage rates, savings rates, and bond prices. Higher rates mean lower bond values but better cash returns.'
  },
  cpi: {
    title: 'UK Consumer Price Index (CPI)',
    description: 'Annual inflation rate measuring the change in prices of goods and services. The BoE targets 2% inflation.',
    interpretation: (value: number) => {
      if (value > 3) return `At ${value.toFixed(1)}%, inflation is above the 2% target. Purchasing power is eroding faster than normal.`
      if (value > 2.5) return `At ${value.toFixed(1)}%, inflation is slightly above target. The BoE may consider rate adjustments.`
      if (value < 1) return `At ${value.toFixed(1)}%, inflation is very low. Deflation risks may prompt BoE action.`
      return `At ${value.toFixed(1)}%, inflation is near the 2% target, indicating price stability.`
    },
    impact: 'High inflation erodes real returns, especially on cash and bonds. Clients may need inflation-protected assets.'
  },
  gbpUsd: {
    title: 'GBP/USD Exchange Rate',
    description: 'How many US dollars one British pound can buy. A higher rate means a stronger pound.',
    interpretation: (value: number) => {
      if (value > 1.35) return `At $${value.toFixed(4)}, the pound is relatively strong against the dollar.`
      if (value < 1.20) return `At $${value.toFixed(4)}, the pound is weak. US investments are more expensive.`
      return `At $${value.toFixed(4)}, the GBP/USD rate is in a normal range.`
    },
    impact: 'Affects returns on US investments. A weaker pound boosts returns from US holdings when converted back to GBP.'
  },
  gbpEur: {
    title: 'GBP/EUR Exchange Rate',
    description: 'How many euros one British pound can buy. Important for European investments and travel.',
    interpretation: (value: number) => {
      if (value > 1.18) return `At €${value.toFixed(4)}, the pound is strong against the euro.`
      if (value < 1.10) return `At €${value.toFixed(4)}, the pound is weak. European investments cost more.`
      return `At €${value.toFixed(4)}, the GBP/EUR rate is in a normal range.`
    },
    impact: 'Affects returns on European investments and property. Important for clients with Eurozone exposure.'
  },
  gold: {
    title: 'Gold Price (per oz, GBP)',
    description: 'The spot price of one troy ounce of gold in British pounds. Gold is often seen as a safe-haven asset.',
    interpretation: (value: number) => {
      return `At £${value.toLocaleString()}/oz, gold serves as a hedge against inflation and market volatility.`
    },
    impact: 'Gold typically rises during uncertainty. A small allocation (5-10%) can provide portfolio diversification.'
  },
  ftse250: {
    title: 'FTSE 250 Index',
    description: 'Tracks the 101st to 350th largest companies on the LSE. More domestically focused than FTSE 100.',
    interpretation: (value: number, change: number) => {
      return `At ${value.toLocaleString()} (${change >= 0 ? '+' : ''}${change.toFixed(2)}%), the mid-cap index shows UK domestic economy health.`
    },
    impact: 'More sensitive to UK economic conditions than the FTSE 100. Often a better gauge of UK-specific sentiment.'
  },
  sp500: {
    title: 'S&P 500 Index',
    description: 'The benchmark US equity index tracking 500 of the largest US companies. The world\'s most watched index.',
    interpretation: (value: number, change: number) => {
      return `At ${value.toLocaleString()} (${change >= 0 ? '+' : ''}${change.toFixed(2)}%), US large-cap equities are ${change > 0 ? 'advancing' : change < 0 ? 'declining' : 'stable'}.`
    },
    impact: 'US equities often lead global markets. Many UK clients have significant US exposure through global funds.'
  },
  vix: {
    title: 'VIX (Fear Index)',
    description: 'The CBOE Volatility Index measures expected market volatility over the next 30 days. Often called the "fear gauge".',
    interpretation: (value: number) => {
      if (value > 30) return `At ${value.toFixed(1)}, the VIX indicates extreme fear and high expected volatility.`
      if (value > 25) return `At ${value.toFixed(1)}, the VIX shows elevated fear. Markets may be choppy.`
      if (value > 20) return `At ${value.toFixed(1)}, the VIX is moderately elevated. Some caution warranted.`
      if (value < 12) return `At ${value.toFixed(1)}, the VIX is very low. Markets are complacent - can precede corrections.`
      return `At ${value.toFixed(1)}, the VIX is in a normal range (15-20), indicating calm markets.`
    },
    impact: 'Low VIX can signal complacency; high VIX may present buying opportunities for long-term investors.'
  },
  us10yr: {
    title: 'US 10-Year Treasury Yield',
    description: 'The yield on US government 10-year bonds. A global benchmark for "risk-free" returns.',
    interpretation: (value: number) => {
      if (value > 4.5) return `At ${value.toFixed(2)}%, yields are high historically. Bonds face price pressure but income is attractive.`
      if (value > 4) return `At ${value.toFixed(2)}%, yields are elevated. Fixed income becoming more attractive.`
      if (value < 2) return `At ${value.toFixed(2)}%, yields are very low. Income seekers need alternatives.`
      return `At ${value.toFixed(2)}%, yields are in a moderate range.`
    },
    impact: 'Rising yields typically pressure equity valuations and boost the dollar. Affects all global markets.'
  },
  brentOil: {
    title: 'Brent Crude Oil',
    description: 'The international benchmark price for crude oil, priced in US dollars per barrel.',
    interpretation: (value: number) => {
      if (value > 100) return `At $${value.toFixed(2)}/barrel, oil is expensive. Inflationary pressure likely.`
      if (value > 80) return `At $${value.toFixed(2)}/barrel, oil is moderately priced.`
      if (value < 50) return `At $${value.toFixed(2)}/barrel, oil is cheap. Good for consumers, challenging for energy sector.`
      return `At $${value.toFixed(2)}/barrel, oil is in a normal range.`
    },
    impact: 'Oil prices drive inflation expectations and energy sector performance. High oil can hurt consumer spending.'
  }
}

interface MarketConditionsWidgetProps {
  onRefresh?: () => void
  compact?: boolean // For dashboard homepage
}

export function MarketConditionsWidget({
  onRefresh,
  compact = false
}: MarketConditionsWidgetProps) {
  const [marketData, setMarketData] = useState<MarketConditions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchMarketData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await FirmAnalyticsService.getMarketConditions()
      setMarketData(data)
      setLastRefresh(new Date())
      onRefresh?.()
    } catch (err) {
      setError('Failed to load market data')
      clientLogger.error('Error fetching market data:', err)
    } finally {
      setLoading(false)
    }
  }, [onRefresh])

  useEffect(() => {
    fetchMarketData()
  }, [fetchMarketData])

  const formatTime = (dateStr: string) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-600'
    if (value < 0) return 'text-red-600'
    return 'text-gray-500'
  }

  if (loading && !marketData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Live Market Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !marketData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Live Market Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-red-600 mb-2">{error}</p>
            <Button onClick={fetchMarketData} variant="secondary" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render a data card with tooltip
  const DataCard = ({
    metricKey,
    label,
    value,
    numericValue,
    changeValue,
    subValue,
    source,
    lastUpdated,
    isStale,
    hasError,
    icon,
    statusColor,
    statusLabel,
    isHighlighted,
    highlightColor
  }: {
    metricKey: keyof typeof METRIC_EXPLANATIONS
    label: string
    value: string
    numericValue?: number
    changeValue?: number
    subValue?: string
    source: string
    lastUpdated: string
    isStale?: boolean
    hasError?: string
    icon?: React.ReactNode
    statusColor?: string
    statusLabel?: string
    isHighlighted?: boolean
    highlightColor?: string
  }) => {
    const explanation = METRIC_EXPLANATIONS[metricKey]

    const tooltipContent = (
      <div className="space-y-2">
        <p className="font-bold text-white">{explanation?.title || label}</p>
        <p className="text-gray-300 text-xs">{explanation?.description}</p>
        {numericValue !== undefined && explanation?.interpretation && (
          <p className="text-white text-xs mt-2 pt-2 border-t border-gray-600">
            {explanation.interpretation(numericValue, changeValue || 0)}
          </p>
        )}
        <p className="text-amber-300 text-xs mt-2 pt-2 border-t border-gray-600">
          <strong>Client Impact:</strong> {explanation?.impact}
        </p>
      </div>
    )

    const cardClasses = isHighlighted
      ? `rounded-lg p-4 border-2 shadow-md ${highlightColor || 'border-blue-500 bg-blue-50'}`
      : 'bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow'

    return (
      <Tooltip content={tooltipContent} position="bottom" maxWidth={320}>
        <div className={`${cardClasses} cursor-help relative group`}>
          <HelpCircle className="absolute top-2 right-2 h-3 w-3 text-gray-300 group-hover:text-gray-500 transition-colors" />
          <div className="flex items-center justify-between mb-1">
            <span className={`text-sm font-medium ${isHighlighted ? 'text-blue-800' : 'text-gray-600'}`}>{label}</span>
            {isStale && <AlertTriangle className="h-4 w-4 text-amber-500" />}
            {!isStale && icon}
            {!isStale && !icon && statusColor && (
              <div className={`w-2 h-2 rounded-full ${statusColor}`} />
            )}
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`text-2xl font-bold ${hasError ? 'text-red-500' : isHighlighted ? 'text-blue-900' : 'text-gray-900'}`}>
              {hasError ? 'Error' : value}
            </span>
            {subValue && !hasError && (
              <span className={`text-sm font-medium ${getTrendColor(parseFloat(subValue) || 0)}`}>
                {subValue}
              </span>
            )}
            {statusLabel && !hasError && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                statusColor?.includes('red') ? 'bg-red-100 text-red-700' :
                statusColor?.includes('amber') ? 'bg-amber-100 text-amber-700' :
                'bg-green-100 text-green-700'
              }`}>
                {statusLabel}
              </span>
            )}
          </div>
          {!compact && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                {source}
                {isStale && <span className="text-amber-600"> (Cached)</span>}
              </p>
              <p className="text-xs text-gray-400">
                Updated: {formatTime(lastUpdated)}
              </p>
            </div>
          )}
        </div>
      </Tooltip>
    )
  }

  // Compact view for dashboard homepage
  if (compact) {
    return (
      <Card className="border-blue-200">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Market Snapshot
            </CardTitle>
            <Button
              onClick={fetchMarketData}
              variant="ghost"
              size="sm"
              disabled={loading}
              className="h-6 px-2"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-3">
            {/* FTSE 100 */}
            <DataCard
              metricKey="ftse100"
              label="FTSE 100"
              value={marketData?.ftse100.value?.toLocaleString('en-GB', { maximumFractionDigits: 0 }) || '—'}
              numericValue={marketData?.ftse100.value}
              changeValue={marketData?.ftse100.changePercent}
              subValue={marketData?.ftse100.changePercent !== undefined
                ? `${marketData.ftse100.changePercent >= 0 ? '+' : ''}${marketData.ftse100.changePercent.toFixed(2)}%`
                : undefined}
              source={marketData?.ftse100.source || 'Unknown'}
              lastUpdated={marketData?.ftse100.lastUpdated || ''}
              isStale={marketData?.ftse100.isStale}
              hasError={marketData?.ftse100.error}
              icon={getTrendIcon(marketData?.ftse100.changePercent || 0)}
            />

            {/* BoE Base Rate - HIGHLIGHTED */}
            <DataCard
              metricKey="boeRate"
              label="BoE Rate"
              value={marketData?.boeRate.value !== undefined ? `${marketData.boeRate.value.toFixed(2)}%` : '—'}
              numericValue={marketData?.boeRate.value}
              source={marketData?.boeRate.source || 'Unknown'}
              lastUpdated={marketData?.boeRate.lastUpdated || ''}
              isStale={marketData?.boeRate.isStale}
              hasError={marketData?.boeRate.error}
              icon={<Building2 className="h-4 w-4 text-blue-600" />}
              isHighlighted={true}
              highlightColor="border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50"
            />

            {/* UK CPI */}
            <DataCard
              metricKey="cpi"
              label="UK CPI"
              value={marketData?.inflation.value !== undefined ? `${marketData.inflation.value.toFixed(1)}%` : '—'}
              numericValue={marketData?.inflation.value}
              source={marketData?.inflation.source || 'Unknown'}
              lastUpdated={marketData?.inflation.lastUpdated || ''}
              isStale={marketData?.inflation.isStale}
              hasError={marketData?.inflation.error}
              statusColor={
                (marketData?.inflation.value || 0) > 3 ? 'bg-red-400' :
                (marketData?.inflation.value || 0) > 2 ? 'bg-amber-400' : 'bg-green-400'
              }
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-white">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Live Market Conditions
            <span className="text-xs font-normal text-gray-500 ml-2">(hover for details)</span>
          </CardTitle>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Fetched {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <Button
              onClick={fetchMarketData}
              variant="ghost"
              size="sm"
              disabled={loading}
              className="h-8 px-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* FTSE 100 */}
          <DataCard
            metricKey="ftse100"
            label="FTSE 100"
            value={marketData?.ftse100.value?.toLocaleString('en-GB', { maximumFractionDigits: 0 }) || '—'}
            numericValue={marketData?.ftse100.value}
            changeValue={marketData?.ftse100.changePercent}
            subValue={marketData?.ftse100.changePercent !== undefined
              ? `${marketData.ftse100.changePercent >= 0 ? '+' : ''}${marketData.ftse100.changePercent.toFixed(2)}%`
              : undefined}
            source={marketData?.ftse100.source || 'Unknown'}
            lastUpdated={marketData?.ftse100.lastUpdated || ''}
            isStale={marketData?.ftse100.isStale}
            hasError={marketData?.ftse100.error}
            icon={getTrendIcon(marketData?.ftse100.changePercent || 0)}
          />

          {/* BoE Base Rate - HIGHLIGHTED as most important */}
          <DataCard
            metricKey="boeRate"
            label="BoE Base Rate"
            value={marketData?.boeRate.value !== undefined ? `${marketData.boeRate.value.toFixed(2)}%` : '—'}
            numericValue={marketData?.boeRate.value}
            source={marketData?.boeRate.source || 'Unknown'}
            lastUpdated={marketData?.boeRate.lastUpdated || ''}
            isStale={marketData?.boeRate.isStale}
            hasError={marketData?.boeRate.error}
            icon={<Building2 className="h-4 w-4 text-blue-600" />}
            isHighlighted={true}
            highlightColor="border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50"
          />

          {/* UK CPI */}
          <DataCard
            metricKey="cpi"
            label="UK CPI"
            value={marketData?.inflation.value !== undefined ? `${marketData.inflation.value.toFixed(1)}%` : '—'}
            numericValue={marketData?.inflation.value}
            source={marketData?.inflation.source || 'Unknown'}
            lastUpdated={marketData?.inflation.lastUpdated || ''}
            isStale={marketData?.inflation.isStale}
            hasError={marketData?.inflation.error}
            statusColor={
              (marketData?.inflation.value || 0) > 3 ? 'bg-red-400' :
              (marketData?.inflation.value || 0) > 2 ? 'bg-amber-400' : 'bg-green-400'
            }
            statusLabel={
              marketData?.inflation.value !== undefined
                ? (marketData.inflation.value > 3 ? 'Above Target' :
                   marketData.inflation.value > 2 ? 'Near Target' : 'Below Target')
                : undefined
            }
          />

          {/* GBP/USD */}
          {marketData?.forex && (
            <DataCard
              metricKey="gbpUsd"
              label="GBP/USD"
              value={marketData.forex.gbpUsd?.toFixed(4) || '—'}
              numericValue={marketData.forex.gbpUsd}
              source={marketData.forex.source || 'Unknown'}
              lastUpdated={marketData.forex.lastUpdated || ''}
              isStale={marketData.forex.isStale}
              hasError={marketData.forex.error}
              icon={<DollarSign className="h-4 w-4 text-green-500" />}
            />
          )}

          {/* GBP/EUR */}
          {marketData?.forex && (
            <DataCard
              metricKey="gbpEur"
              label="GBP/EUR"
              value={marketData.forex.gbpEur?.toFixed(4) || '—'}
              numericValue={marketData.forex.gbpEur}
              source={marketData.forex.source || 'Unknown'}
              lastUpdated={marketData.forex.lastUpdated || ''}
              isStale={marketData.forex.isStale}
              hasError={marketData.forex.error}
              icon={<span className="text-sm font-bold text-blue-500">€</span>}
            />
          )}

          {/* Gold */}
          {marketData?.gold && (
            <DataCard
              metricKey="gold"
              label="Gold (GBP)"
              value={marketData.gold.value ? `£${marketData.gold.value.toLocaleString('en-GB', { maximumFractionDigits: 0 })}` : '—'}
              numericValue={marketData.gold.value}
              source={marketData.gold.source || 'Unknown'}
              lastUpdated={marketData.gold.lastUpdated || ''}
              isStale={marketData.gold.isStale}
              hasError={marketData.gold.error}
              icon={<Coins className="h-4 w-4 text-yellow-500" />}
            />
          )}
        </div>

        {/* Row 2: Global Context */}
        {(marketData?.ftse250 || marketData?.sp500 || marketData?.vix || marketData?.us10yr || marketData?.brentOil) && (
          <>
            <div className="mt-4 mb-2">
              <h4 className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Global Market Context
                <span className="text-xs font-normal text-gray-400">(hover for details)</span>
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* FTSE 250 */}
              {marketData?.ftse250 && (
                <DataCard
                  metricKey="ftse250"
                  label="FTSE 250"
                  value={marketData.ftse250.value?.toLocaleString('en-GB', { maximumFractionDigits: 0 }) || '—'}
                  numericValue={marketData.ftse250.value}
                  changeValue={marketData.ftse250.changePercent}
                  subValue={marketData.ftse250.changePercent !== undefined
                    ? `${marketData.ftse250.changePercent >= 0 ? '+' : ''}${marketData.ftse250.changePercent.toFixed(2)}%`
                    : undefined}
                  source={marketData.ftse250.source || 'Unknown'}
                  lastUpdated={marketData.ftse250.lastUpdated || ''}
                  isStale={marketData.ftse250.isStale}
                  hasError={marketData.ftse250.error}
                  icon={getTrendIcon(marketData.ftse250.changePercent || 0)}
                />
              )}

              {/* S&P 500 */}
              {marketData?.sp500 && (
                <DataCard
                  metricKey="sp500"
                  label="S&P 500"
                  value={marketData.sp500.value?.toLocaleString('en-US', { maximumFractionDigits: 0 }) || '—'}
                  numericValue={marketData.sp500.value}
                  changeValue={marketData.sp500.changePercent}
                  subValue={marketData.sp500.changePercent !== undefined
                    ? `${marketData.sp500.changePercent >= 0 ? '+' : ''}${marketData.sp500.changePercent.toFixed(2)}%`
                    : undefined}
                  source={marketData.sp500.source || 'Unknown'}
                  lastUpdated={marketData.sp500.lastUpdated || ''}
                  isStale={marketData.sp500.isStale}
                  hasError={marketData.sp500.error}
                  icon={getTrendIcon(marketData.sp500.changePercent || 0)}
                />
              )}

              {/* VIX */}
              {marketData?.vix && (
                <DataCard
                  metricKey="vix"
                  label="VIX"
                  value={marketData.vix.value?.toFixed(2) || '—'}
                  numericValue={marketData.vix.value}
                  source={marketData.vix.source || 'Unknown'}
                  lastUpdated={marketData.vix.lastUpdated || ''}
                  isStale={marketData.vix.isStale}
                  hasError={marketData.vix.error}
                  icon={<Activity className="h-4 w-4 text-purple-500" />}
                  statusColor={
                    (marketData.vix.value || 0) > 25 ? 'bg-red-400' :
                    (marketData.vix.value || 0) > 20 ? 'bg-amber-400' : 'bg-green-400'
                  }
                  statusLabel={
                    marketData.vix.value !== undefined
                      ? (marketData.vix.value > 25 ? 'High Fear' :
                         marketData.vix.value > 20 ? 'Elevated' : 'Low Fear')
                      : undefined
                  }
                />
              )}

              {/* US 10Y Treasury */}
              {marketData?.us10yr && (
                <DataCard
                  metricKey="us10yr"
                  label="US 10Y Yield"
                  value={marketData.us10yr.value ? `${marketData.us10yr.value.toFixed(2)}%` : '—'}
                  numericValue={marketData.us10yr.value}
                  source={marketData.us10yr.source || 'Unknown'}
                  lastUpdated={marketData.us10yr.lastUpdated || ''}
                  isStale={marketData.us10yr.isStale}
                  hasError={marketData.us10yr.error}
                  icon={<Percent className="h-4 w-4 text-blue-500" />}
                />
              )}

              {/* Brent Oil */}
              {marketData?.brentOil && (
                <DataCard
                  metricKey="brentOil"
                  label="Brent Crude"
                  value={marketData.brentOil.value ? `$${marketData.brentOil.value.toFixed(2)}` : '—'}
                  numericValue={marketData.brentOil.value}
                  source={marketData.brentOil.source || 'Unknown'}
                  lastUpdated={marketData.brentOil.lastUpdated || ''}
                  isStale={marketData.brentOil.isStale}
                  hasError={marketData.brentOil.error}
                  icon={<Droplets className="h-4 w-4 text-gray-700" />}
                />
              )}
            </div>
          </>
        )}

        {/* Market Commentary */}
        {marketData && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-1">Market Summary</h4>
            <p className="text-sm text-gray-600">
              {generateMarketSummary(marketData)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function generateMarketSummary(market: MarketConditions): string {
  const parts: string[] = []

  // FTSE commentary
  if (market.ftse100.changePercent > 1) {
    parts.push('UK equities showing positive momentum')
  } else if (market.ftse100.changePercent < -1) {
    parts.push('UK equities experiencing volatility')
  } else {
    parts.push('UK equities trading sideways')
  }

  // Rate commentary
  if (market.boeRate.value >= 5) {
    parts.push('elevated interest rates favouring fixed income')
  } else if (market.boeRate.value <= 2) {
    parts.push('low rate environment challenging for income seekers')
  }

  // Inflation commentary
  if (market.inflation.value > 3) {
    parts.push('inflation above BoE target requiring attention')
  } else if (market.inflation.value <= 2) {
    parts.push('inflation well contained')
  }

  // VIX commentary
  if (market.vix?.value) {
    if (market.vix.value > 25) {
      parts.push('VIX elevated indicating market uncertainty')
    } else if (market.vix.value < 15) {
      parts.push('VIX low suggesting market complacency')
    }
  }

  // S&P 500 commentary (global context)
  if (market.sp500?.changePercent) {
    if (Math.abs(market.sp500.changePercent) > 1) {
      parts.push(market.sp500.changePercent > 0
        ? 'US markets rallying'
        : 'US markets under pressure')
    }
  }

  return parts.join(', ') + '.'
}

export default MarketConditionsWidget
