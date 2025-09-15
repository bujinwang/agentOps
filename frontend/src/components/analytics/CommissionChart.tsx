import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface CommissionAnalytics {
  totalCommissionAmount: number;
  paidCommissions: number;
  pendingCommissions: number;
  avgCommissionRate: number;
}

interface CommissionChartProps {
  data: CommissionAnalytics | null;
  timeRange: string;
}

const CommissionChart: React.FC<CommissionChartProps> = ({ data, timeRange }) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!data) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="chart-pie"
            size={24}
            color="#007AFF"
          />
          <Text style={styles.title}>Commission Distribution</Text>
        </View>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="chart-pie"
            size={48}
            color="#6c757d"
          />
          <Text style={styles.emptyText}>No commission data available</Text>
        </View>
      </View>
    );
  }

  const paidPercentage = data.totalCommissionAmount > 0
    ? (data.paidCommissions / data.totalCommissionAmount) * 100
    : 0;

  const pendingPercentage = data.totalCommissionAmount > 0
    ? (data.pendingCommissions / data.totalCommissionAmount) * 100
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="chart-pie"
          size={24}
          color="#007AFF"
        />
        <Text style={styles.title}>Commission Distribution</Text>
      </View>

      <View style={styles.content}>
        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <MaterialCommunityIcons
              name="cash-multiple"
              size={24}
              color="#28a745"
            />
            <Text style={styles.summaryValue}>
              {formatCurrency(data.totalCommissionAmount)}
            </Text>
            <Text style={styles.summaryLabel}>Total Commissions</Text>
          </View>

          <View style={styles.summaryCard}>
            <MaterialCommunityIcons
              name="check-circle"
              size={24}
              color="#007bff"
            />
            <Text style={styles.summaryValue}>
              {formatCurrency(data.paidCommissions)}
            </Text>
            <Text style={styles.summaryLabel}>Paid</Text>
          </View>

          <View style={styles.summaryCard}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={24}
              color="#ffc107"
            />
            <Text style={styles.summaryValue}>
              {formatCurrency(data.pendingCommissions)}
            </Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>

          <View style={styles.summaryCard}>
            <MaterialCommunityIcons
              name="percent"
              size={24}
              color="#6f42c1"
            />
            <Text style={styles.summaryValue}>
              {data.avgCommissionRate.toFixed(1)}%
            </Text>
            <Text style={styles.summaryLabel}>Avg Rate</Text>
          </View>
        </View>

        {/* Visual Distribution */}
        <View style={styles.distributionContainer}>
          <Text style={styles.distributionTitle}>Payment Status Distribution</Text>

          {/* Progress Bars */}
          <View style={styles.progressItem}>
            <View style={styles.progressLabel}>
              <View style={[styles.statusDot, { backgroundColor: '#28a745' }]} />
              <Text style={styles.progressText}>Paid Commissions</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${paidPercentage}%`, backgroundColor: '#28a745' }
                ]}
              />
            </View>
            <Text style={styles.progressValue}>
              {paidPercentage.toFixed(1)}%
            </Text>
          </View>

          <View style={styles.progressItem}>
            <View style={styles.progressLabel}>
              <View style={[styles.statusDot, { backgroundColor: '#ffc107' }]} />
              <Text style={styles.progressText}>Pending Commissions</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${pendingPercentage}%`, backgroundColor: '#ffc107' }
                ]}
              />
            </View>
            <Text style={styles.progressValue}>
              {pendingPercentage.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Commission Rate Analysis */}
        <View style={styles.rateAnalysis}>
          <Text style={styles.analysisTitle}>Commission Rate Analysis</Text>
          <View style={styles.rateGrid}>
            <View style={styles.rateItem}>
              <Text style={styles.rateLabel}>Average Rate</Text>
              <Text style={styles.rateValue}>{data.avgCommissionRate.toFixed(2)}%</Text>
            </View>
            <View style={styles.rateItem}>
              <Text style={styles.rateLabel}>Total Paid</Text>
              <Text style={styles.rateValue}>
                {formatCurrency(data.paidCommissions)}
              </Text>
            </View>
            <View style={styles.rateItem}>
              <Text style={styles.rateLabel}>Outstanding</Text>
              <Text style={styles.rateValue}>
                {formatCurrency(data.pendingCommissions)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 8,
  },
  content: {
    gap: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
    textAlign: 'center',
  },
  distributionContainer: {
    marginTop: 8,
  },
  distributionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  progressItem: {
    marginBottom: 16,
  },
  progressLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#495057',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressValue: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
    textAlign: 'right',
  },
  rateAnalysis: {
    marginTop: 8,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  rateGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rateItem: {
    alignItems: 'center',
    flex: 1,
  },
  rateLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  rateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
});

export default CommissionChart;