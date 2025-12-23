// ================================================================
// src/lib/pdf/PDFCharts.tsx
// SVG-based Charts for @react-pdf/renderer
// Pure SVG implementation - works server-side and client-side
// ================================================================

/* eslint-disable react/no-children-prop */
// Note: @react-pdf/renderer SVG components use children prop pattern

import React from 'react';
import { Svg, G, Path, Line, Text, Rect, Circle, Polygon } from '@react-pdf/renderer';

// ================================================================
// TYPE DEFINITIONS
// ================================================================

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface LineChartDataPoint {
  x: number | string;
  y: number;
  label?: string;
}

export interface MultiLineData {
  name: string;
  data: LineChartDataPoint[];
  color: string;
}

export interface ChartDimensions {
  width: number;
  height: number;
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

// ================================================================
// COLOR PALETTES
// ================================================================

export const chartColors = {
  primary: '#1e40af',
  secondary: '#3b82f6',
  success: '#059669',
  warning: '#f59e0b',
  danger: '#dc2626',
  purple: '#7c3aed',
  pink: '#ec4899',
  teal: '#14b8a6',
  gray: '#6b7280',
  lightGray: '#e5e7eb',
  text: '#374151',
  textLight: '#9ca3af',
};

export const defaultPalette = [
  chartColors.primary,
  chartColors.success,
  chartColors.warning,
  chartColors.danger,
  chartColors.purple,
  chartColors.pink,
  chartColors.teal,
  chartColors.secondary,
];

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toFixed(0);
};

const formatCurrency = (num: number): string => {
  if (num >= 1000000) return `£${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `£${(num / 1000).toFixed(0)}K`;
  return `£${num.toFixed(0)}`;
};

// ================================================================
// LINE CHART COMPONENT
// ================================================================

interface LineChartProps {
  data: LineChartDataPoint[];
  dimensions?: ChartDimensions;
  title?: string;
  color?: string;
  showArea?: boolean;
  showDots?: boolean;
  showGrid?: boolean;
  yAxisLabel?: string;
  formatYAxis?: (value: number) => string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  dimensions = { width: 400, height: 200 },
  title,
  color = chartColors.primary,
  showArea = true,
  showDots = true,
  showGrid = true,
  yAxisLabel,
  formatYAxis = formatCurrency,
}) => {
  const padding = {
    top: title ? 35 : 20,
    right: 20,
    bottom: 40,
    left: 55,
    ...dimensions.padding,
  };

  const chartWidth = dimensions.width - padding.left - padding.right;
  const chartHeight = dimensions.height - padding.top - padding.bottom;

  // Calculate scales
  const values = data.map(d => d.y);
  const minY = Math.min(0, ...values);
  const maxY = Math.max(...values) * 1.1; // 10% padding at top
  const yRange = maxY - minY;

  const xStep = chartWidth / (data.length - 1 || 1);
  const yScale = (value: number) => chartHeight - ((value - minY) / yRange) * chartHeight;

  // Generate path
  const linePath = data.map((point, i) => {
    const x = padding.left + i * xStep;
    const y = padding.top + yScale(point.y);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Area path (for filled area under line)
  const areaPath = showArea ? `${linePath} L ${padding.left + (data.length - 1) * xStep} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z` : '';

  // Y-axis ticks
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => minY + (yRange / yTicks) * i);

  return (
    <Svg width={dimensions.width} height={dimensions.height}>
      {/* Title */}
      {title && (
        <Text x={dimensions.width / 2} y={15} style={{ fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' }}>
          {title}
        </Text>
      )}

      {/* Grid lines */}
      {showGrid && yTickValues.map((tick, i) => (
        <Line
          key={`grid-${i}`}
          x1={padding.left}
          y1={padding.top + yScale(tick)}
          x2={padding.left + chartWidth}
          y2={padding.top + yScale(tick)}
          stroke={chartColors.lightGray}
          strokeWidth={0.5}
        />
      ))}

      {/* Y-axis */}
      <Line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={padding.top + chartHeight}
        stroke={chartColors.gray}
        strokeWidth={1}
      />

      {/* X-axis */}
      <Line
        x1={padding.left}
        y1={padding.top + chartHeight}
        x2={padding.left + chartWidth}
        y2={padding.top + chartHeight}
        stroke={chartColors.gray}
        strokeWidth={1}
      />

      {/* Y-axis labels */}
      {yTickValues.map((tick, i) => (
        <Text
          key={`ylabel-${i}`}
          x={padding.left - 5}
          y={padding.top + yScale(tick) + 3}
          style={{ fontSize: 7, textAnchor: 'end', fill: chartColors.gray }}
        >
          {formatYAxis(tick)}
        </Text>
      ))}

      {/* Y-axis title */}
      {yAxisLabel && (
        <Text
          x={12}
          y={padding.top + chartHeight / 2}
          style={{ fontSize: 8, fill: chartColors.gray }}
          transform={`rotate(-90, 12, ${padding.top + chartHeight / 2})`}
        >
          {yAxisLabel}
        </Text>
      )}

      {/* X-axis labels */}
      {data.filter((_, i) => i % Math.ceil(data.length / 8) === 0 || i === data.length - 1).map((point, idx, arr) => {
        const originalIndex = data.indexOf(point);
        return (
          <Text
            key={`xlabel-${originalIndex}`}
            x={padding.left + originalIndex * xStep}
            y={padding.top + chartHeight + 15}
            style={{ fontSize: 7, textAnchor: 'middle', fill: chartColors.gray }}
          >
            {point.label || String(point.x)}
          </Text>
        );
      })}

      {/* Area fill */}
      {showArea && (
        <Path
          d={areaPath}
          fill={color}
          fillOpacity={0.15}
        />
      )}

      {/* Line */}
      <Path
        d={linePath}
        stroke={color}
        strokeWidth={2}
        fill="none"
      />

      {/* Data points */}
      {showDots && data.map((point, i) => (
        <Circle
          key={`dot-${i}`}
          cx={padding.left + i * xStep}
          cy={padding.top + yScale(point.y)}
          r={3}
          fill="white"
          stroke={color}
          strokeWidth={2}
        />
      ))}
    </Svg>
  );
};

// ================================================================
// MULTI-LINE CHART COMPONENT
// ================================================================

interface MultiLineChartProps {
  data: MultiLineData[];
  dimensions?: ChartDimensions;
  title?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  formatYAxis?: (value: number) => string;
}

export const MultiLineChart: React.FC<MultiLineChartProps> = ({
  data,
  dimensions = { width: 400, height: 220 },
  title,
  showGrid = true,
  showLegend = true,
  formatYAxis = formatCurrency,
}) => {
  const padding = {
    top: title ? 35 : 20,
    right: 20,
    bottom: showLegend ? 55 : 40,
    left: 55,
  };

  const chartWidth = dimensions.width - padding.left - padding.right;
  const chartHeight = dimensions.height - padding.top - padding.bottom;

  // Flatten all values to find min/max
  const allValues = data.flatMap(series => series.data.map(d => d.y));
  const minY = Math.min(0, ...allValues);
  const maxY = Math.max(...allValues) * 1.1;
  const yRange = maxY - minY;

  // Assume all series have same x values
  const xLength = data[0]?.data.length || 1;
  const xStep = chartWidth / (xLength - 1 || 1);
  const yScale = (value: number) => chartHeight - ((value - minY) / yRange) * chartHeight;

  // Y-axis ticks
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => minY + (yRange / yTicks) * i);

  return (
    <Svg width={dimensions.width} height={dimensions.height}>
      {/* Title */}
      {title && (
        <Text x={dimensions.width / 2} y={15} style={{ fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' }}>
          {title}
        </Text>
      )}

      {/* Grid lines */}
      {showGrid && yTickValues.map((tick, i) => (
        <Line
          key={`grid-${i}`}
          x1={padding.left}
          y1={padding.top + yScale(tick)}
          x2={padding.left + chartWidth}
          y2={padding.top + yScale(tick)}
          stroke={chartColors.lightGray}
          strokeWidth={0.5}
        />
      ))}

      {/* Axes */}
      <Line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartHeight} stroke={chartColors.gray} strokeWidth={1} />
      <Line x1={padding.left} y1={padding.top + chartHeight} x2={padding.left + chartWidth} y2={padding.top + chartHeight} stroke={chartColors.gray} strokeWidth={1} />

      {/* Y-axis labels */}
      {yTickValues.map((tick, i) => (
        <Text key={`ylabel-${i}`} x={padding.left - 5} y={padding.top + yScale(tick) + 3} style={{ fontSize: 7, textAnchor: 'end', fill: chartColors.gray }}>
          {formatYAxis(tick)}
        </Text>
      ))}

      {/* X-axis labels */}
      {data[0]?.data.filter((_, i) => i % Math.ceil(xLength / 6) === 0 || i === xLength - 1).map((point, _, arr) => {
        const originalIndex = data[0].data.indexOf(point);
        return (
          <Text key={`xlabel-${originalIndex}`} x={padding.left + originalIndex * xStep} y={padding.top + chartHeight + 15} style={{ fontSize: 7, textAnchor: 'middle', fill: chartColors.gray }}>
            {point.label || String(point.x)}
          </Text>
        );
      })}

      {/* Lines */}
      {data.map((series, seriesIdx) => {
        const linePath = series.data.map((point, i) => {
          const x = padding.left + i * xStep;
          const y = padding.top + yScale(point.y);
          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');

        return (
          <Path key={`line-${seriesIdx}`} d={linePath} stroke={series.color} strokeWidth={2} fill="none" />
        );
      })}

      {/* Legend */}
      {showLegend && (
        <G>
          {data.map((series, i) => {
            const legendX = padding.left + (i * (chartWidth / data.length));
            const legendY = dimensions.height - 15;
            return (
              <G key={`legend-${i}`}>
                <Rect x={legendX} y={legendY - 6} width={12} height={3} fill={series.color} />
                <Text x={legendX + 16} y={legendY} style={{ fontSize: 7, fill: chartColors.gray }}>
                  {series.name}
                </Text>
              </G>
            );
          })}
        </G>
      )}
    </Svg>
  );
};

// ================================================================
// BAR CHART COMPONENT
// ================================================================

interface BarChartProps {
  data: ChartDataPoint[];
  dimensions?: ChartDimensions;
  title?: string;
  horizontal?: boolean;
  showValues?: boolean;
  formatValue?: (value: number) => string;
  barColor?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  dimensions = { width: 400, height: 200 },
  title,
  horizontal = false,
  showValues = true,
  formatValue = formatCurrency,
  barColor,
}) => {
  const padding = {
    top: title ? 35 : 20,
    right: 20,
    bottom: 50,
    left: horizontal ? 80 : 55,
  };

  const chartWidth = dimensions.width - padding.left - padding.right;
  const chartHeight = dimensions.height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map(d => Math.abs(d.value))) * 1.1;
  const barGap = 0.2;

  if (horizontal) {
    const barHeight = (chartHeight / data.length) * (1 - barGap);
    const barSpacing = chartHeight / data.length;

    return (
      <Svg width={dimensions.width} height={dimensions.height}>
        {title && (
          <Text x={dimensions.width / 2} y={15} style={{ fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' }}>
            {title}
          </Text>
        )}

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
          <Line
            key={`grid-${i}`}
            x1={padding.left + chartWidth * pct}
            y1={padding.top}
            x2={padding.left + chartWidth * pct}
            y2={padding.top + chartHeight}
            stroke={chartColors.lightGray}
            strokeWidth={0.5}
          />
        ))}

        {/* Bars */}
        {data.map((item, i) => {
          const barWidth = (item.value / maxValue) * chartWidth;
          const y = padding.top + i * barSpacing + (barSpacing - barHeight) / 2;
          const color = item.color || barColor || defaultPalette[i % defaultPalette.length];

          return (
            <G key={`bar-${i}`}>
              <Rect
                x={padding.left}
                y={y}
                width={Math.max(0, barWidth)}
                height={barHeight}
                fill={color}
                rx={2}
              />
              {/* Label */}
              <Text x={padding.left - 5} y={y + barHeight / 2 + 3} style={{ fontSize: 8, textAnchor: 'end', fill: chartColors.text }}>
                {item.label}
              </Text>
              {/* Value */}
              {showValues && (
                <Text x={padding.left + barWidth + 5} y={y + barHeight / 2 + 3} style={{ fontSize: 8, fill: chartColors.gray }}>
                  {formatValue(item.value)}
                </Text>
              )}
            </G>
          );
        })}
      </Svg>
    );
  }

  // Vertical bars
  const barWidth = (chartWidth / data.length) * (1 - barGap);
  const barSpacing = chartWidth / data.length;

  return (
    <Svg width={dimensions.width} height={dimensions.height}>
      {title && (
        <Text x={dimensions.width / 2} y={15} style={{ fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' }}>
          {title}
        </Text>
      )}

      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
        <Line
          key={`grid-${i}`}
          x1={padding.left}
          y1={padding.top + chartHeight * (1 - pct)}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight * (1 - pct)}
          stroke={chartColors.lightGray}
          strokeWidth={0.5}
        />
      ))}

      {/* Y-axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
        <Text
          key={`ylabel-${i}`}
          x={padding.left - 5}
          y={padding.top + chartHeight * (1 - pct) + 3}
          style={{ fontSize: 7, textAnchor: 'end', fill: chartColors.gray }}
        >
          {formatValue(maxValue * pct)}
        </Text>
      ))}

      {/* Bars */}
      {data.map((item, i) => {
        const barHeight = (item.value / maxValue) * chartHeight;
        const x = padding.left + i * barSpacing + (barSpacing - barWidth) / 2;
        const y = padding.top + chartHeight - barHeight;
        const color = item.color || barColor || defaultPalette[i % defaultPalette.length];

        return (
          <G key={`bar-${i}`}>
            <Rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(0, barHeight)}
              fill={color}
              rx={2}
            />
            {/* Label */}
            <Text
              x={x + barWidth / 2}
              y={padding.top + chartHeight + 15}
              style={{ fontSize: 7, textAnchor: 'middle', fill: chartColors.text }}
            >
              {item.label}
            </Text>
            {/* Value */}
            {showValues && (
              <Text
                x={x + barWidth / 2}
                y={y - 5}
                style={{ fontSize: 7, textAnchor: 'middle', fill: chartColors.gray }}
              >
                {formatValue(item.value)}
              </Text>
            )}
          </G>
        );
      })}
    </Svg>
  );
};

// ================================================================
// STACKED BAR CHART COMPONENT
// ================================================================

interface StackedBarData {
  label: string;
  values: { name: string; value: number; color: string }[];
}

interface StackedBarChartProps {
  data: StackedBarData[];
  dimensions?: ChartDimensions;
  title?: string;
  showLegend?: boolean;
  formatValue?: (value: number) => string;
}

export const StackedBarChart: React.FC<StackedBarChartProps> = ({
  data,
  dimensions = { width: 400, height: 220 },
  title,
  showLegend = true,
  formatValue = formatCurrency,
}) => {
  const padding = {
    top: title ? 35 : 20,
    right: 20,
    bottom: showLegend ? 60 : 50,
    left: 55,
  };

  const chartWidth = dimensions.width - padding.left - padding.right;
  const chartHeight = dimensions.height - padding.top - padding.bottom;

  // Calculate max total
  const maxTotal = Math.max(...data.map(d => d.values.reduce((sum, v) => sum + v.value, 0))) * 1.1;

  const barGap = 0.2;
  const barWidth = (chartWidth / data.length) * (1 - barGap);
  const barSpacing = chartWidth / data.length;

  // Get unique categories for legend
  const categories = data[0]?.values.map(v => ({ name: v.name, color: v.color })) || [];

  return (
    <Svg width={dimensions.width} height={dimensions.height}>
      {title && (
        <Text x={dimensions.width / 2} y={15} style={{ fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' }}>
          {title}
        </Text>
      )}

      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
        <G key={`grid-${i}`}>
          <Line
            x1={padding.left}
            y1={padding.top + chartHeight * (1 - pct)}
            x2={padding.left + chartWidth}
            y2={padding.top + chartHeight * (1 - pct)}
            stroke={chartColors.lightGray}
            strokeWidth={0.5}
          />
          <Text
            x={padding.left - 5}
            y={padding.top + chartHeight * (1 - pct) + 3}
            style={{ fontSize: 7, textAnchor: 'end', fill: chartColors.gray }}
          >
            {formatValue(maxTotal * pct)}
          </Text>
        </G>
      ))}

      {/* Stacked bars */}
      {data.map((item, i) => {
        const x = padding.left + i * barSpacing + (barSpacing - barWidth) / 2;
        let yOffset = 0;

        return (
          <G key={`stack-${i}`}>
            {item.values.map((segment, j) => {
              const segmentHeight = (segment.value / maxTotal) * chartHeight;
              const y = padding.top + chartHeight - yOffset - segmentHeight;
              yOffset += segmentHeight;

              return (
                <Rect
                  key={`segment-${i}-${j}`}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(0, segmentHeight)}
                  fill={segment.color}
                />
              );
            })}
            {/* Label */}
            <Text
              x={x + barWidth / 2}
              y={padding.top + chartHeight + 15}
              style={{ fontSize: 7, textAnchor: 'middle', fill: chartColors.text }}
            >
              {item.label}
            </Text>
          </G>
        );
      })}

      {/* Legend */}
      {showLegend && (
        <G>
          {categories.map((cat, i) => {
            const legendX = padding.left + (i * 80);
            const legendY = dimensions.height - 12;
            return (
              <G key={`legend-${i}`}>
                <Rect x={legendX} y={legendY - 6} width={10} height={10} fill={cat.color} rx={2} />
                <Text x={legendX + 14} y={legendY + 2} style={{ fontSize: 7, fill: chartColors.gray }}>
                  {cat.name}
                </Text>
              </G>
            );
          })}
        </G>
      )}
    </Svg>
  );
};

// ================================================================
// PIE/DONUT CHART COMPONENT
// ================================================================

interface PieChartProps {
  data: ChartDataPoint[];
  dimensions?: ChartDimensions;
  title?: string;
  donut?: boolean;
  showLabels?: boolean;
  showLegend?: boolean;
  showPercentages?: boolean;
  formatValue?: (value: number) => string;
  formatTotal?: (total: number) => string;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  dimensions = { width: 250, height: 200 },
  title,
  donut = false,
  showLabels = false,
  showLegend = true,
  showPercentages = true,
  formatValue = formatCurrency,
  formatTotal = formatCurrency,
}) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const centerX = showLegend ? dimensions.width * 0.35 : dimensions.width / 2;
  const centerY = (dimensions.height + (title ? 20 : 0)) / 2;
  const radius = Math.min(centerX - 20, (dimensions.height - (title ? 40 : 20)) / 2) - 10;
  const innerRadius = donut ? radius * 0.6 : 0;

  // Generate pie slices
  let currentAngle = -90; // Start from top

  const slices = data.map((item, i) => {
    const sliceAngle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    // Convert angles to radians
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    // Calculate arc points
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    // Inner points for donut
    const ix1 = centerX + innerRadius * Math.cos(startRad);
    const iy1 = centerY + innerRadius * Math.sin(startRad);
    const ix2 = centerX + innerRadius * Math.cos(endRad);
    const iy2 = centerY + innerRadius * Math.sin(endRad);

    const largeArc = sliceAngle > 180 ? 1 : 0;

    // Build path
    let path: string;
    if (donut) {
      path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;
    } else {
      path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    }

    // Label position
    const midAngle = ((startAngle + endAngle) / 2 * Math.PI) / 180;
    const labelRadius = radius * 0.7;
    const labelX = centerX + labelRadius * Math.cos(midAngle);
    const labelY = centerY + labelRadius * Math.sin(midAngle);

    return {
      path,
      color: item.color || defaultPalette[i % defaultPalette.length],
      label: item.label,
      value: item.value,
      percentage: ((item.value / total) * 100).toFixed(1),
      labelX,
      labelY,
    };
  });

  const children: React.ReactElement[] = []

  if (title) {
    children.push(
      <Text
        key="title"
        x={dimensions.width / 2}
        y={15}
        style={{ fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' }}
      >
        {title}
      </Text>
    )
  }

  children.push(
    ...slices.map((slice, i) => {
      const sliceChildren: Array<React.ReactElement | null> = [
        <Path key="path" d={slice.path} fill={slice.color} />
      ]
      if (showLabels && parseFloat(slice.percentage) > 5) {
        sliceChildren.push(
          <Text
            key="label"
            x={slice.labelX}
            y={slice.labelY}
            style={{ fontSize: 7, textAnchor: 'middle', fill: 'white', fontWeight: 'bold' }}
          >
            {showPercentages ? `${slice.percentage}%` : slice.label}
          </Text>
        )
      }

      return (
        <G key={`slice-${i}`}>{sliceChildren.filter(Boolean) as React.ReactElement[]}</G>
      )
    })
  )

  if (donut) {
    children.push(
      <G
        key="donut"
        children={[
          <Text
            key="donut-title"
            x={centerX}
            y={centerY - 5}
            style={{ fontSize: 10, textAnchor: 'middle', fontWeight: 'bold', fill: chartColors.text }}
          >
            Total
          </Text>,
          <Text
            key="donut-total"
            x={centerX}
            y={centerY + 10}
            style={{ fontSize: 9, textAnchor: 'middle', fill: chartColors.gray }}
          >
            {formatTotal(total)}
          </Text>
        ]}
      />
    )
  }

  if (showLegend) {
    const legendItems = slices.map((slice, i) => {
      const legendX = dimensions.width * 0.62
      const legendY = (title ? 35 : 15) + i * 18

      return (
        <G
          key={`legend-${i}`}
          children={[
            <Rect key="swatch" x={legendX} y={legendY} width={10} height={10} fill={slice.color} rx={2} />,
            <Text key="label" x={legendX + 14} y={legendY + 8} style={{ fontSize: 8, fill: chartColors.text }}>
              {slice.label}
            </Text>,
            <Text key="value" x={legendX + 14} y={legendY + 16} style={{ fontSize: 7, fill: chartColors.gray }}>
              {formatValue(slice.value)} ({slice.percentage}%)
            </Text>
          ]}
        />
      )
    })

    children.push(<G key="legend" children={legendItems} />)
  }

  return <Svg width={dimensions.width} height={dimensions.height} children={children} />
};

// ================================================================
// GAUGE CHART COMPONENT (for risk scores, etc.)
// ================================================================

interface GaugeChartProps {
  value: number; // 0-100 or 0-10
  maxValue?: number;
  dimensions?: ChartDimensions;
  title?: string;
  label?: string;
  colors?: { low: string; medium: string; high: string };
}

export const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  maxValue = 10,
  dimensions = { width: 180, height: 120 },
  title,
  label,
  colors = { low: chartColors.success, medium: chartColors.warning, high: chartColors.danger },
}) => {
  const centerX = dimensions.width / 2;
  const centerY = dimensions.height - 20;
  const radius = Math.min(centerX - 10, dimensions.height - (title ? 50 : 30)) - 10;
  const innerRadius = radius * 0.7;

  // Normalize value to 0-1
  const normalizedValue = Math.min(1, Math.max(0, value / maxValue));

  // Angle range: -150 to 150 (180 degrees arc at bottom)
  const startAngle = -150;
  const endAngle = 150;
  const angleRange = endAngle - startAngle;
  const valueAngle = startAngle + normalizedValue * angleRange;

  // Helper to get point on arc
  const getPoint = (angle: number, r: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: centerX + r * Math.cos(rad),
      y: centerY + r * Math.sin(rad),
    };
  };

  // Background arc
  const bgStart = getPoint(startAngle, radius);
  const bgEnd = getPoint(endAngle, radius);
  const bgInnerStart = getPoint(startAngle, innerRadius);
  const bgInnerEnd = getPoint(endAngle, innerRadius);

  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${radius} ${radius} 0 1 1 ${bgEnd.x} ${bgEnd.y} L ${bgInnerEnd.x} ${bgInnerEnd.y} A ${innerRadius} ${innerRadius} 0 1 0 ${bgInnerStart.x} ${bgInnerStart.y} Z`;

  // Value arc
  const valEnd = getPoint(valueAngle, radius);
  const valInnerEnd = getPoint(valueAngle, innerRadius);
  const largeArc = normalizedValue > 0.5 ? 1 : 0;

  const valPath = normalizedValue > 0
    ? `M ${bgStart.x} ${bgStart.y} A ${radius} ${radius} 0 ${largeArc} 1 ${valEnd.x} ${valEnd.y} L ${valInnerEnd.x} ${valInnerEnd.y} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${bgInnerStart.x} ${bgInnerStart.y} Z`
    : '';

  // Determine color based on value
  const getColor = () => {
    if (normalizedValue < 0.33) return colors.low;
    if (normalizedValue < 0.67) return colors.medium;
    return colors.high;
  };

  const children: React.ReactElement[] = []

  if (title) {
    children.push(
      <Text
        key="title"
        x={centerX}
        y={15}
        style={{ fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' }}
      >
        {title}
      </Text>
    )
  }

  children.push(<Path key="bg" d={bgPath} fill={chartColors.lightGray} />)

  if (valPath) {
    children.push(<Path key="val" d={valPath} fill={getColor()} />)
  }

  children.push(
    <Text
      key="value"
      x={centerX}
      y={centerY - 10}
      style={{ fontSize: 20, fontWeight: 'bold', textAnchor: 'middle', fill: getColor() }}
    >
      {value}
    </Text>
  )

  children.push(
    <Text
      key="max"
      x={centerX}
      y={centerY + 5}
      style={{ fontSize: 8, textAnchor: 'middle', fill: chartColors.gray }}
    >
      / {maxValue}
    </Text>
  )

  if (label) {
    children.push(
      <Text
        key="label"
        x={centerX}
        y={dimensions.height - 5}
        style={{ fontSize: 8, textAnchor: 'middle', fill: chartColors.text }}
      >
        {label}
      </Text>
    )
  }

  return <Svg width={dimensions.width} height={dimensions.height} children={children} />
};

// ================================================================
// EXPORT ALL
// ================================================================

export default {
  LineChart,
  MultiLineChart,
  BarChart,
  StackedBarChart,
  PieChart,
  GaugeChart,
  chartColors,
  defaultPalette,
};
