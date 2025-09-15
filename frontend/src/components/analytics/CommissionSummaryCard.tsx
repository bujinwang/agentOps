import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface CommissionSummaryCardProps {
  totalCommissions: number;
  paidCommissions: number;
  pendingCommissions: number;
  averageCommissionRate: number;
}

const CommissionSummaryCard: React.FC<CommissionSummaryCardProps> = ({
  totalCommissions,
  paidCommissions,
  pendingCommissions,
  averageCommissionRate
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const paidPercentage = totalCommissions > 0 ? (paidCommissions / totalCommissions) * 100 : 0;
  const pendingPercentage = totalCommissions > 0 ? (pendingCommissions / totalCommissions) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="account-cash"
          size={24}
          color="#007AFF"
        />
        <Text style={styles.title}>Commission Summary</Text>
      </View>

      <View style={styles.content}>
        {/* Total Commissions */}
        <View style={styles.metricRow}>
          <View style={styles.metricLabel}>
            <MaterialCommunityIcons
              name="cash-multiple"
              size={20}
              color="#28a745"
            />
            <Text style={styles.metricText}>Total Commissions</Text>
          </View>
          <Text style={styles.metricValue}>{formatCurrency(totalCommissions)}</Text>
        </View>

        {/* Paid vs Pending */}
        <View style={styles.statusContainer}>
          <View style={styles.statusItem}>
            <View style={[styles.statusIndicator, { backgroundColor: '#28a745' }]} />
            <View style={styles.statusContent}>
              <Text style={styles.statusLabel}>Paid</Text>
              <Text style={styles.statusValue}>
                {formatCurrency(paidCommissions)} ({paidPercentage.toFixed(1)}%)
              </Text>
            </View>
          </View>

          <View style={styles.statusItem}>
            <View style={[styles.statusIndicator, { backgroundColor: '#ffc107' }]} />
            <View style={styles.statusContent}>
              <Text style={styles.statusLabel}>Pending</Text>
              <Text style={styles.statusValue}>
                {formatCurrency(pendingCommissions)} ({pendingPercentage.toFixed(1)}%)
              </Text>
            </View>
          </View>
        </View>

        {/* Average Commission Rate */}
        <View style={styles.metricRow}>
          <View style={styles.metricLabel}>
            <MaterialCommunityIcons
              name="percent"
              size={20}
              color="#6f42c1"
            />
            <Text style={styles.metricText}>Avg Commission Rate</Text>
          </View>
          <Text style={styles.metricValue}>{averageCommissionRate.toFixed(2)}%</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressLabel}>Payment Progress</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${paidPercentage}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {paidPercentage.toFixed(1)}% of commissions paid
          </Text>
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
  content: {
    gap: 16,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  metricLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricText: {
    fontSize: 14,
    color: '#495057',
    marginLeft: 8,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  statusContainer: {
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#495057',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#28a745',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default CommissionSummaryCard;