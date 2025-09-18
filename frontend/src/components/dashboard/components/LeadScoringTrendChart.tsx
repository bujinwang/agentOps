import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { MaterialColors, MaterialSpacing, MaterialTypography } from '../../../styles/MaterialDesign';
import { LeadInsights, ScoreHistoryPoint } from '../../../types/dashboard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LeadScoringTrendChartProps {
  leads: LeadInsights[];
  timeRange: '7d' | '30d' | '90d' | '1y';
  height?: number;
  loading?: boolean;
  onLeadSelect?: (leadId: number) => void;
  onTimeRangeChange?: (range: '7d' | '30d' | '90d' | '1y') => void;
}

interface TrendData {
  leadId: number;
  name: string;
  scores: Array<{ date: string; score: number; confidence: number }>;
  color: string;
  trend: 'up' | 'down' | 'stable';
  avgScore: number;
  scoreChange: number;
}

const LeadScoringTrendChart: React.FC<LeadScoringTrendChartProps> = ({
  leads,
  timeRange = '30d',
  height = 300,
  loading = false,
  onLeadSelect,
  onTimeRangeChange,
}) => {
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [hoveredPoint, setHoveredPoint] = useState<{ leadId: number; index: number } | null>(null);

  // Process trend data
  const trendData = useMemo(() => {
    const colors = [
      MaterialColors.primary[500],
      MaterialColors.secondary[500],
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#96CEB4',
      '#FFEAA7',
      '#DDA0DD',
    ];

    return leads.slice(0, 8).map((lead, index) => {
      const scores = lead.scoreHistory
        .filter(point => {
          const pointDate = new Date(point.timestamp);
          const now = new Date();
          const daysDiff = (now.getTime() - pointDate.getTime()) / (1000 * 60 * 60 * 24);

          switch (timeRange) {
            case '7d': return daysDiff <= 7;
            case '30d': return daysDiff <= 30;
            case '90d': return daysDiff <= 90;
            case '1y': return daysDiff <= 365;
            default: return daysDiff <= 30;
          }
        })
        .map(point => ({
          date: point.timestamp,
          score: point.score,
          confidence: point.confidence,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length || 0;
      const firstScore = scores[0]?.score || 0;
      const lastScore = scores[scores.length - 1]?.score || 0;
      const scoreChange = lastScore - firstScore;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (scoreChange > 5) trend = 'up';
      else if (scoreChange < -5) trend = 'down';

      return {
        leadId: lead.leadId,
        name: lead.name,
        scores,
        color: colors[index % colors.length],
        trend,
        avgScore,
        scoreChange,
      };
    });
  }, [leads, timeRange]);

  // Calculate chart dimensions
  const chartWidth = SCREEN_WIDTH - 80;
  const chartHeight = height - 100;
  const padding = 40;

  // Find min/max values for scaling
  const allScores = trendData.flatMap(lead => lead.scores.map(s => s.score));
  const minScore = Math.min(...allScores, 0);
  const maxScore = Math.max(...allScores, 100);

  const scaleX = (chartWidth - padding * 2) / Math.max(trendData[0]?.scores.length || 1, 1);
  const scaleY = (chartHeight - padding * 2) / (maxScore - minScore);

  const getPointPosition = (leadIndex: number, scoreIndex: number) => {
    const lead = trendData[leadIndex];
    if (!lead || !lead.scores[scoreIndex]) return { x: 0, y: 0 };

    const score = lead.scores[scoreIndex].score;
    const x = padding + scoreIndex * scaleX;
    const y = chartHeight - padding - ((score - minScore) * scaleY);

    return { x, y };
  };

  const renderTrendLine = (lead: TrendData, index: number) => {
    if (lead.scores.length < 2) return null;

    const points = lead.scores.map((_, scoreIndex) => {
      const pos = getPointPosition(index, scoreIndex);
      return `${pos.x},${pos.y}`;
    }).join(' ');

    return (
      <View key={lead.leadId}>
        {/* Trend line */}
        <View style={styles.trendLine}>
          {lead.scores.map((score, scoreIndex) => {
            if (scoreIndex === 0) return null;
            const startPos = getPointPosition(index, scoreIndex - 1);
            const endPos = getPointPosition(index, scoreIndex);
            const distance = Math.sqrt(
              Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2)
            );
            const angle = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x) * 180 / Math.PI;

            return (
              <View
                key={scoreIndex}
                style={[
                  styles.lineSegment,
                  {
                    left: startPos.x,
                    top: startPos.y,
                    width: distance,
                    height: 2,
                    backgroundColor: lead.color,
                    transform: [{ rotate: `${angle}deg` }],
                    transformOrigin: '0 0',
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Data points */}
        {lead.scores.map((score, scoreIndex) => {
          const pos = getPointPosition(index, scoreIndex);
          const isHovered = hoveredPoint?.leadId === lead.leadId && hoveredPoint?.index === scoreIndex;

          return (
            <TouchableOpacity
              key={scoreIndex}
              style={[
                styles.dataPoint,
                {
                  left: pos.x - 4,
                  top: pos.y - 4,
                  backgroundColor: lead.color,
                  borderColor: isHovered ? MaterialColors.primary[700] : lead.color,
                  borderWidth: isHovered ? 2 : 0,
                },
              ]}
              onPress={() => setHoveredPoint({ leadId: lead.leadId, index: scoreIndex })}
            >
              {isHovered && (
                <View style={styles.tooltip}>
                  <Text style={styles.tooltipText}>
                    {lead.name}: {score.score.toFixed(1)}
                  </Text>
                  <Text style={styles.tooltipDate}>
                    {new Date(score.date).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const timeRangeOptions = [
    { label: '7D', value: '7d' as const },
    { label: '30D', value: '30d' as const },
    { label: '90D', value: '90d' as const },
    { label: '1Y', value: '1y' as const },
  ];

  if (loading) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.title}>Lead Scoring Trends</Text>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading trend data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Lead Scoring Trends</Text>
        <View style={styles.timeRangeContainer}>
          {timeRangeOptions.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.timeRangeButton,
                timeRange === option.value && styles.timeRangeButtonActive,
              ]}
              onPress={() => onTimeRangeChange?.(option.value)}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  timeRange === option.value && styles.timeRangeTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.chartContainer, { width: Math.max(chartWidth, SCREEN_WIDTH - 40) }]}>
          {/* Y-axis labels */}
          <View style={styles.yAxis}>
            {[100, 75, 50, 25, 0].map(score => (
              <Text key={score} style={styles.axisLabel}>
                {score}
              </Text>
            ))}
          </View>

          {/* Chart area */}
          <View style={[styles.chart, { height: chartHeight, width: chartWidth }]}>
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(score => (
              <View
                key={score}
                style={[
                  styles.gridLine,
                  {
                    top: chartHeight - padding - ((score - minScore) * scaleY),
                  },
                ]}
              />
            ))}

            {/* Trend lines */}
            {trendData.map((lead, index) => renderTrendLine(lead, index))}

            {/* X-axis labels */}
            {trendData[0]?.scores.map((_, index) => {
              const pos = getPointPosition(0, index);
              return (
                <Text
                  key={index}
                  style={[styles.xAxisLabel, { left: pos.x - 20 }]}
                  numberOfLines={1}
                >
                  {new Date(trendData[0].scores[index].date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Legend */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.legendContainer}>
        {trendData.map(lead => (
          <TouchableOpacity
            key={lead.leadId}
            style={[
              styles.legendItem,
              selectedLeads.has(lead.leadId) && styles.legendItemSelected,
            ]}
            onPress={() => {
              const newSelected = new Set(selectedLeads);
              if (newSelected.has(lead.leadId)) {
                newSelected.delete(lead.leadId);
              } else {
                newSelected.add(lead.leadId);
              }
              setSelectedLeads(newSelected);
            }}
          >
            <View style={[styles.legendColor, { backgroundColor: lead.color }]} />
            <Text style={styles.legendText} numberOfLines={1}>
              {lead.name}
            </Text>
            <Text style={styles.legendScore}>
              {lead.avgScore.toFixed(1)}
            </Text>
            <Text style={[
              styles.legendTrend,
              lead.trend === 'up' && styles.trendUp,
              lead.trend === 'down' && styles.trendDown,
            ]}>
              {lead.trend === 'up' ? '↗' : lead.trend === 'down' ? '↘' : '→'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    marginHorizontal: MaterialSpacing.sm,
    marginVertical: MaterialSpacing.xs,
    padding: MaterialSpacing.md,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.md,
  },
  title: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: MaterialColors.neutral[100],
    borderRadius: 8,
    padding: 2,
  },
  timeRangeButton: {
    paddingHorizontal: MaterialSpacing.sm,
    paddingVertical: MaterialSpacing.xs,
    borderRadius: 6,
  },
  timeRangeButtonActive: {
    backgroundColor: MaterialColors.primary[500],
  },
  timeRangeText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[700],
  },
  timeRangeTextActive: {
    color: MaterialColors.onPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
  },
  chartContainer: {
    flexDirection: 'row',
  },
  yAxis: {
    width: 30,
    justifyContent: 'space-between',
    paddingRight: MaterialSpacing.xs,
  },
  axisLabel: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[600],
    textAlign: 'right',
  },
  chart: {
    position: 'relative',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: MaterialColors.neutral[300],
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: MaterialColors.neutral[200],
  },
  trendLine: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  lineSegment: {
    position: 'absolute',
  },
  dataPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    elevation: 3,
  },
  tooltip: {
    position: 'absolute',
    bottom: 20,
    left: -40,
    backgroundColor: MaterialColors.neutral[900],
    borderRadius: 6,
    padding: MaterialSpacing.sm,
    minWidth: 120,
  },
  tooltipText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.onPrimary,
  },
  tooltipDate: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[400],
    marginTop: 2,
  },
  xAxisLabel: {
    position: 'absolute',
    bottom: -20,
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[600],
    width: 40,
  },
  legendContainer: {
    marginTop: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MaterialColors.neutral[50],
    borderRadius: 20,
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.xs,
    marginRight: MaterialSpacing.sm,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[200],
  },
  legendItemSelected: {
    backgroundColor: MaterialColors.primary[50],
    borderColor: MaterialColors.primary[300],
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: MaterialSpacing.sm,
  },
  legendText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[800],
    marginRight: MaterialSpacing.sm,
    maxWidth: 80,
  },
  legendScore: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.neutral[600],
    marginRight: MaterialSpacing.sm,
  },
  legendTrend: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.neutral[500],
  },
  trendUp: {
    color: MaterialColors.secondary[600],
  },
  trendDown: {
    color: MaterialColors.error[500],
  },
});

export default LeadScoringTrendChart;