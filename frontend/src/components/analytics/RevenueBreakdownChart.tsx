import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface RevenueBreakdown {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
  color: string;
}

interface RevenueSummary {
  totalRevenue: number;
  totalExpenses: number;
  totalCommissions: number;
  netIncome: number;
}

interface RevenueBreakdownChartProps {
  data: RevenueSummary | null;
  timeRange: string;
}

const RevenueBreakdownChart: React.FC<RevenueBreakdownChartProps> = ({ data, timeRange }) => {
  // Mock data - in real app, this would come from API
  const mockBreakdown: RevenueBreakdown[] = [
    {
      category: 'Residential Sales',
      amount: 450000,
      percentage: 45.0,
      transactionCount: 12,
      color: '#28a745'
    },
    {
      category: 'Commercial Sales',
      amount: 320000,
      percentage: 32.0,
      transactionCount: 8,
      color: '#007bff'
    },
    {
      category: 'Rental Income',
      amount: 150000,
      percentage: 15.0,
      transactionCount: 25,
      color: '#ffc107'
    },
    {
      category: 'Property Management',
      amount: 80000,
      percentage: 8.0,
      transactionCount: 15,
      color: '#6f42c1'
    }
  ];

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderBreakdownItem = (item: RevenueBreakdown, index: number) => (
    <View key={index} style={styles.breakdownItem}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryInfo}>
          <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
          <Text style={styles.categoryName}>{item.category}</Text>
        </View>
        <Text style={styles.categoryAmount}>{formatCurrency(item.amount)}</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${item.percentage}%`, backgroundColor: item.color }
            ]}
          />
        </View>
        <Text style={styles.percentageText}>{item.percentage.toFixed(1)}%</Text>
      </View>

      <View style={styles.transactionInfo}>
        <Text style={styles.transactionCount}>
          {item.transactionCount} transactions
        </Text>
        <Text style={styles.avgTransaction}>
          Avg: {formatCurrency(item.amount / item.transactionCount)}
        </Text>
      </View>
    </View>
  );

  const totalRevenue = mockBreakdown.reduce((sum, item) => sum + item.amount, 0);
  const totalTransactions = mockBreakdown.reduce((sum, item) => sum + item.transactionCount, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="chart-donut"
          size={24}
          color="#007AFF"
        />
        <Text style={styles.title}>Revenue Breakdown</Text>
        <Text style={styles.subtitle}>{timeRange} period</Text>
      </View>

      <View style={styles.summaryStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatCurrency(totalRevenue)}</Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalTransactions}</Text>
          <Text style={styles.statLabel}>Transactions</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatCurrency(totalRevenue / totalTransactions)}
          </Text>
          <Text style={styles.statLabel}>Avg per Transaction</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.breakdownContainer}
      >
        {mockBreakdown.map((item, index) => renderBreakdownItem(item, index))}
      </ScrollView>

      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Category Performance</Text>
        <View style={styles.legendGrid}>
          {mockBreakdown.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: item.color }]} />
              <View style={styles.legendText}>
                <Text style={styles.legendCategory}>{item.category}</Text>
                <Text style={styles.legendPercentage}>{item.percentage.toFixed(1)}%</Text>
              </View>
            </View>
          ))}
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
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
    textAlign: 'center',
  },
  breakdownContainer: {
    paddingBottom: 10,
  },
  breakdownItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    minWidth: 40,
    textAlign: 'right',
  },
  transactionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  transactionCount: {
    fontSize: 12,
    color: '#6c757d',
  },
  avgTransaction: {
    fontSize: 12,
    color: '#6c757d',
  },
  legendContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
  },
  legendCategory: {
    fontSize: 12,
    color: '#495057',
  },
  legendPercentage: {
    fontSize: 10,
    color: '#6c757d',
    marginTop: 2,
  },
});

export default RevenueBreakdownChart;