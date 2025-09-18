import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialColors, MaterialSpacing, MaterialTypography } from '../../../styles/MaterialDesign';
import { ABTestResult, ABTest } from '../../../types/ml';

const { width: screenWidth } = Dimensions.get('window');

interface ABTestingResultsVisualizationProps {
  testResults: ABTestResult[];
  activeTests: ABTest[];
  onTestSelect: (testId: string) => void;
  onImplementWinner: (testId: string, winner: 'champion' | 'challenger') => void;
  onStopTest: (testId: string) => void;
}

interface TestResultCardProps {
  result: ABTestResult;
  onPress: () => void;
  onImplementWinner: () => void;
  onStopTest: () => void;
}

const TestResultCard: React.FC<TestResultCardProps> = ({
  result,
  onPress,
  onImplementWinner,
  onStopTest
}) => {
  const getWinnerColor = (winner: string) => {
    switch (winner) {
      case 'champion':
        return MaterialColors.secondary[600];
      case 'challenger':
        return MaterialColors.primary[500];
      default:
        return MaterialColors.neutral[500];
    }
  };

  const getWinnerIcon = (winner: string) => {
    switch (winner) {
      case 'champion':
        return '🏆';
      case 'challenger':
        return '🚀';
      default:
        return '⚖️';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.95) return MaterialColors.secondary[600];
    if (confidence >= 0.90) return MaterialColors.primary[500];
    if (confidence >= 0.80) return MaterialColors.primary[400];
    return MaterialColors.error[500];
  };

  const formatDuration = (days: number) => {
    if (days < 1) return `${Math.round(days * 24)}h`;
    return `${Math.round(days)}d`;
  };

  const getRecommendationAction = (recommendation: string) => {
    if (recommendation.includes('implement')) return 'implement_winner';
    if (recommendation.includes('continue')) return 'continue_testing';
    return 'no_clear_winner';
  };

  return (
    <TouchableOpacity style={styles.testCard} onPress={onPress}>
      <View style={styles.testHeader}>
        <Text style={styles.testId}>Test #{result.testId}</Text>
        <View style={[styles.winnerBadge, { backgroundColor: getWinnerColor(result.winner) }]}>
          <Text style={styles.winnerIcon}>{getWinnerIcon(result.winner)}</Text>
          <Text style={styles.winnerText}>
            {result.winner === 'champion' ? 'Champion' :
             result.winner === 'challenger' ? 'Challenger' : 'Tie'}
          </Text>
        </View>
      </View>

      <View style={styles.testMetrics}>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Improvement:</Text>
          <Text style={[styles.metricValue, {
            color: result.improvement >= 0 ? MaterialColors.secondary[600] : MaterialColors.error[500]
          }]}>
            {result.improvement >= 0 ? '+' : ''}{result.improvement.toFixed(1)}%
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Confidence:</Text>
          <Text style={[styles.metricValue, { color: getConfidenceColor(result.confidence) }]}>
            {(result.confidence * 100).toFixed(1)}%
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Duration:</Text>
          <Text style={styles.metricValue}>
            {formatDuration(result.duration)}
          </Text>
        </View>
      </View>

      <View style={styles.variantComparison}>
        <View style={styles.variant}>
          <Text style={styles.variantLabel}>Champion (A)</Text>
          <Text style={styles.variantRate}>
            {result.championResults.conversionRate.toFixed(1)}%
          </Text>
          <Text style={styles.variantCount}>
            {result.championResults.conversions}/{result.championResults.requests}
          </Text>
        </View>
        <View style={styles.variant}>
          <Text style={styles.variantLabel}>Challenger (B)</Text>
          <Text style={styles.variantRate}>
            {result.challengerResults.conversionRate.toFixed(1)}%
          </Text>
          <Text style={styles.variantCount}>
            {result.challengerResults.conversions}/{result.challengerResults.requests}
          </Text>
        </View>
      </View>

      <View style={styles.testActions}>
        {getRecommendationAction(result.recommendation) === 'implement_winner' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.implementButton]}
            onPress={onImplementWinner}
          >
            <Text style={styles.implementButtonText}>Implement Winner</Text>
          </TouchableOpacity>
        )}
        {getRecommendationAction(result.recommendation) === 'continue_testing' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.continueButton]}
            onPress={() => {}}
          >
            <Text style={styles.continueButtonText}>Continue Testing</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.stopButton]}
          onPress={onStopTest}
        >
          <Text style={styles.stopButtonText}>Stop Test</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.recommendation}>
        {getRecommendationAction(result.recommendation) === 'implement_winner' && 'Ready to implement winner'}
        {getRecommendationAction(result.recommendation) === 'continue_testing' && 'Continue testing for more data'}
        {getRecommendationAction(result.recommendation) === 'no_clear_winner' && 'No clear winner - consider stopping'}
      </Text>
    </TouchableOpacity>
  );
};

interface ActiveTestCardProps {
  test: ABTest;
  onPress: () => void;
}

const ActiveTestCard: React.FC<ActiveTestCardProps> = ({ test, onPress }) => {
  const progress = Math.min((Date.now() - new Date(test.startTime).getTime()) /
                           (test.config.testDuration * 24 * 60 * 60 * 1000), 1);

  const daysRemaining = Math.max(0,
    Math.ceil((new Date(test.endTime).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  );

  return (
    <TouchableOpacity style={styles.activeTestCard} onPress={onPress}>
      <View style={styles.activeTestHeader}>
        <Text style={styles.activeTestId}>Test #{test.id}</Text>
        <Text style={styles.activeTestStatus}>{test.status.toUpperCase()}</Text>
      </View>

      <View style={styles.progressSection}>
        <Text style={styles.progressLabel}>Progress: {(progress * 100).toFixed(0)}%</Text>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${progress * 100}%` }]}
          />
        </View>
        <Text style={styles.daysRemaining}>
          {daysRemaining} days remaining
        </Text>
      </View>

      <View style={styles.trafficSplit}>
        <Text style={styles.trafficLabel}>Traffic Split:</Text>
        <Text style={styles.trafficValue}>{test.trafficSplit}% / {(100 - test.trafficSplit)}%</Text>
      </View>

      <View style={styles.currentResults}>
        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>Champion:</Text>
          <Text style={styles.resultValue}>
            {test.championResults.conversionRate.toFixed(1)}%
          </Text>
        </View>
        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>Challenger:</Text>
          <Text style={styles.resultValue}>
            {test.challengerResults.conversionRate.toFixed(1)}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

interface ConfidenceIntervalChartProps {
  result: ABTestResult;
}

const ConfidenceIntervalChart: React.FC<ConfidenceIntervalChartProps> = ({ result }) => {
  const chartWidth = screenWidth - 80;
  const centerX = chartWidth / 2;
  const intervalWidth = 100; // Fixed width for visualization since confidenceInterval doesn't exist
  const championX = centerX - (result.improvement * 10); // Scale improvement for visualization
  const challengerX = centerX + (result.improvement * 10);

  return (
    <View style={styles.confidenceChart}>
      <Text style={styles.chartTitle}>Improvement Comparison</Text>
      <View style={styles.chartArea}>
        {/* Improvement visualization bar */}
        <View style={[styles.confidenceBar, {
          left: centerX - intervalWidth / 2,
          width: intervalWidth,
        }]}>
          <Text style={styles.confidenceRange}>
            Improvement: {result.improvement.toFixed(2)}%
          </Text>
        </View>

        {/* Champion point */}
        <View style={[styles.variantPoint, styles.championPoint, { left: championX - 6 }]}>
          <Text style={styles.pointLabel}>A</Text>
        </View>

        {/* Challenger point */}
        <View style={[styles.variantPoint, styles.challengerPoint, { left: challengerX - 6 }]}>
          <Text style={styles.pointLabel}>B</Text>
        </View>

        {/* Zero line */}
        <View style={[styles.zeroLine, { left: centerX }]} />
      </View>

      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, styles.championColor]} />
          <Text style={styles.legendText}>Champion (A)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, styles.challengerColor]} />
          <Text style={styles.legendText}>Challenger (B)</Text>
        </View>
      </View>
    </View>
  );
};

export const ABTestingResultsVisualization: React.FC<ABTestingResultsVisualizationProps> = ({
  testResults,
  activeTests,
  onTestSelect,
  onImplementWinner,
  onStopTest,
}) => {
  const [selectedView, setSelectedView] = useState<'completed' | 'active'>('completed');
  const [selectedTest, setSelectedTest] = useState<ABTestResult | null>(null);

  const stats = useMemo(() => {
    const completedTests = testResults.length;
    const championWins = testResults.filter(t => t.winner === 'champion').length;
    const challengerWins = testResults.filter(t => t.winner === 'challenger').length;
    const ties = testResults.filter(t => t.winner === null).length;
    const avgImprovement = testResults.length > 0
      ? testResults.reduce((sum, t) => sum + t.improvement, 0) / testResults.length
      : 0;

    return {
      completedTests,
      championWins,
      challengerWins,
      ties,
      avgImprovement,
      winRate: completedTests > 0 ? (championWins + challengerWins) / completedTests : 0,
    };
  }, [testResults]);

  const sortedResults = useMemo(() => {
    return [...testResults].sort((a, b) => b.confidence - a.confidence);
  }, [testResults]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>A/B Testing Results</Text>
        <Text style={styles.subtitle}>
          {stats.completedTests} completed • {activeTests.length} active
        </Text>
      </View>

      {/* View Toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.toggleButton, selectedView === 'completed' && styles.toggleButtonActive]}
          onPress={() => setSelectedView('completed')}
        >
          <Text style={[styles.toggleButtonText, selectedView === 'completed' && styles.toggleButtonTextActive]}>
            Completed Tests ({stats.completedTests})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, selectedView === 'active' && styles.toggleButtonActive]}
          onPress={() => setSelectedView('active')}
        >
          <Text style={[styles.toggleButtonText, selectedView === 'active' && styles.toggleButtonTextActive]}>
            Active Tests ({activeTests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      {selectedView === 'completed' && (
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Overall Performance</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.championWins}</Text>
              <Text style={styles.statLabel}>Champion Wins</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.challengerWins}</Text>
              <Text style={styles.statLabel}>Challenger Wins</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.ties}</Text>
              <Text style={styles.statLabel}>Ties</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{(stats.avgImprovement).toFixed(1)}%</Text>
              <Text style={styles.statLabel}>Avg Improvement</Text>
            </View>
          </View>
        </View>
      )}

      {/* Test Results */}
      {selectedView === 'completed' && (
        <View style={styles.resultsSection}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          {sortedResults.map(result => (
            <TestResultCard
              key={result.testId}
              result={result}
              onPress={() => {
                setSelectedTest(result);
                onTestSelect(result.testId);
              }}
              onImplementWinner={() => onImplementWinner(result.testId, result.winner as 'champion' | 'challenger')}
              onStopTest={() => onStopTest(result.testId)}
            />
          ))}
        </View>
      )}

      {/* Active Tests */}
      {selectedView === 'active' && (
        <View style={styles.activeSection}>
          <Text style={styles.sectionTitle}>Active Tests</Text>
          {activeTests.map(test => (
            <ActiveTestCard
              key={test.id}
              test={test}
              onPress={() => onTestSelect(test.id)}
            />
          ))}
        </View>
      )}

      {/* Detailed View */}
      {selectedTest && (
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Detailed Analysis</Text>
          <ConfidenceIntervalChart result={selectedTest} />

          <View style={styles.detailStats}>
            <Text style={styles.detailTitle}>Confidence Level</Text>
            <Text style={styles.detailValue}>
              {(selectedTest.confidence * 100).toFixed(1)}%
            </Text>
    
            <Text style={styles.detailTitle}>Sample Size</Text>
            <Text style={styles.detailValue}>
              {selectedTest.championResults.requests + selectedTest.challengerResults.requests} total
            </Text>
    
            <Text style={styles.detailTitle}>Test Duration</Text>
            <Text style={styles.detailValue}>
              {selectedTest.duration.toFixed(1)} days
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MaterialColors.neutral[50],
  },
  header: {
    padding: MaterialSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: MaterialColors.neutral[200],
  },
  title: {
    ...MaterialTypography.headlineSmall,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.xs,
  },
  subtitle: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
  },
  viewToggle: {
    flexDirection: 'row',
    padding: MaterialSpacing.lg,
    gap: MaterialSpacing.sm,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: MaterialSpacing.sm,
    paddingHorizontal: MaterialSpacing.md,
    borderRadius: 8,
    backgroundColor: MaterialColors.neutral[100],
    borderWidth: 1,
    borderColor: MaterialColors.neutral[200],
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: MaterialColors.primary[500],
    borderColor: MaterialColors.primary[500],
  },
  toggleButtonText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.neutral[700],
  },
  toggleButtonTextActive: {
    color: MaterialColors.onPrimary,
    fontWeight: '600',
  },
  statsSection: {
    padding: MaterialSpacing.lg,
  },
  sectionTitle: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: MaterialSpacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: 80,
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.md,
    alignItems: 'center',
    elevation: 2,
  },
  statValue: {
    ...MaterialTypography.headlineSmall,
    color: MaterialColors.neutral[900],
    fontWeight: 'bold',
  },
  statLabel: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
    marginTop: MaterialSpacing.xs,
  },
  resultsSection: {
    padding: MaterialSpacing.lg,
  },
  testCard: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.lg,
    marginBottom: MaterialSpacing.md,
    elevation: 2,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.md,
  },
  testId: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    fontWeight: '600',
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: MaterialSpacing.sm,
    paddingVertical: MaterialSpacing.xs,
    borderRadius: 16,
  },
  winnerIcon: {
    fontSize: 16,
    marginRight: MaterialSpacing.xs,
  },
  winnerText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.onPrimary,
    fontWeight: '600',
  },
  testMetrics: {
    marginBottom: MaterialSpacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.xs,
  },
  metricLabel: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[700],
  },
  metricValue: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[900],
    fontWeight: '600',
  },
  variantComparison: {
    flexDirection: 'row',
    marginBottom: MaterialSpacing.md,
  },
  variant: {
    flex: 1,
    alignItems: 'center',
    padding: MaterialSpacing.sm,
  },
  variantLabel: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
    marginBottom: MaterialSpacing.xs,
  },
  variantRate: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    fontWeight: 'bold',
    marginBottom: MaterialSpacing.xs,
  },
  variantCount: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[500],
  },
  testActions: {
    flexDirection: 'row',
    gap: MaterialSpacing.sm,
    marginBottom: MaterialSpacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: MaterialSpacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  implementButton: {
    backgroundColor: MaterialColors.secondary[100],
  },
  implementButtonText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.secondary[700],
  },
  continueButton: {
    backgroundColor: MaterialColors.primary[100],
  },
  continueButtonText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.primary[700],
  },
  stopButton: {
    backgroundColor: MaterialColors.error[100],
  },
  stopButtonText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.error[700],
  },
  recommendation: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
    fontStyle: 'italic',
  },
  activeSection: {
    padding: MaterialSpacing.lg,
  },
  activeTestCard: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    padding: MaterialSpacing.lg,
    marginBottom: MaterialSpacing.md,
    elevation: 2,
  },
  activeTestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.md,
  },
  activeTestId: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    fontWeight: '600',
  },
  activeTestStatus: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.primary[600],
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: MaterialSpacing.md,
  },
  progressLabel: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[700],
    marginBottom: MaterialSpacing.xs,
  },
  progressBar: {
    height: 8,
    backgroundColor: MaterialColors.neutral[200],
    borderRadius: 4,
    marginBottom: MaterialSpacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: MaterialColors.primary[500],
    borderRadius: 4,
  },
  daysRemaining: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
  },
  trafficSplit: {
    marginBottom: MaterialSpacing.md,
  },
  trafficLabel: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[700],
  },
  trafficValue: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[900],
    fontWeight: '600',
  },
  currentResults: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resultItem: {
    alignItems: 'center',
  },
  resultLabel: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
  },
  resultValue: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[900],
    fontWeight: '600',
  },
  detailSection: {
    padding: MaterialSpacing.lg,
    backgroundColor: MaterialColors.surface,
    margin: MaterialSpacing.md,
    borderRadius: 12,
    elevation: 2,
  },
  confidenceChart: {
    marginBottom: MaterialSpacing.lg,
  },
  chartTitle: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.md,
  },
  chartArea: {
    height: 100,
    backgroundColor: MaterialColors.neutral[50],
    borderRadius: 8,
    position: 'relative',
    marginBottom: MaterialSpacing.md,
  },
  confidenceBar: {
    position: 'absolute',
    top: 40,
    height: 20,
    backgroundColor: MaterialColors.primary[200],
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confidenceRange: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.primary[800],
    fontWeight: '600',
  },
  variantPoint: {
    position: 'absolute',
    top: 30,
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  championPoint: {
    backgroundColor: MaterialColors.secondary[600],
  },
  challengerPoint: {
    backgroundColor: MaterialColors.primary[500],
  },
  pointLabel: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.onPrimary,
    fontWeight: 'bold',
  },
  zeroLine: {
    position: 'absolute',
    top: 20,
    bottom: 20,
    width: 1,
    backgroundColor: MaterialColors.neutral[400],
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: MaterialSpacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: MaterialSpacing.sm,
  },
  championColor: {
    backgroundColor: MaterialColors.secondary[600],
  },
  challengerColor: {
    backgroundColor: MaterialColors.primary[500],
  },
  legendText: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[700],
  },
  detailStats: {
    gap: MaterialSpacing.sm,
  },
  detailTitle: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[700],
  },
  detailValue: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[900],
    fontWeight: '600',
    marginBottom: MaterialSpacing.sm,
  },
});

export default ABTestingResultsVisualization;