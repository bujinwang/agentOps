import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ROIInvestment {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  expectedReturn: number;
  actualReturn?: number;
}

interface ROIMetrics {
  totalInvestment: number;
  totalReturns: number;
  netROI: number;
  annualizedROI: number;
  paybackPeriod: number;
  profitabilityIndex: number;
}

interface ROIAnalysisProps {
  investments: ROIInvestment[];
  timeRange: string;
}

const ROIAnalysis: React.FC<ROIAnalysisProps> = ({ investments, timeRange }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const calculateROIMetrics = (): ROIMetrics => {
    const filteredInvestments = selectedCategory === 'all'
      ? investments
      : investments.filter(inv => inv.category === selectedCategory);

    const totalInvestment = filteredInvestments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalReturns = filteredInvestments.reduce((sum, inv) => sum + (inv.actualReturn || inv.expectedReturn), 0);

    const netROI = totalInvestment > 0 ? ((totalReturns - totalInvestment) / totalInvestment) * 100 : 0;
    const annualizedROI = netROI / (parseInt(timeRange) / 12); // Assuming timeRange is in months
    const paybackPeriod = totalInvestment > 0 ? (totalInvestment / (totalReturns / (parseInt(timeRange) / 12))) : 0;
    const profitabilityIndex = totalInvestment > 0 ? totalReturns / totalInvestment : 0;

    return {
      totalInvestment,
      totalReturns,
      netROI,
      annualizedROI,
      paybackPeriod,
      profitabilityIndex
    };
  };

  const getCategories = (): string[] => {
    const categories = ['all', ...new Set(investments.map(inv => inv.category))];
    return categories;
  };

  const getROIColor = (roi: number): string => {
    if (roi >= 20) return '#28a745'; // Excellent
    if (roi >= 10) return '#007bff'; // Good
    if (roi >= 0) return '#ffc107'; // Break-even
    return '#dc3545'; // Loss
  };

  const getROIStatus = (roi: number): string => {
    if (roi >= 20) return 'Excellent';
    if (roi >= 10) return 'Good';
    if (roi >= 0) return 'Break-even';
    return 'Loss';
  };

  const metrics = calculateROIMetrics();
  const categories = getCategories();

  const renderInvestmentItem = (investment: ROIInvestment) => {
    const actualReturn = investment.actualReturn || investment.expectedReturn;
    const roi = ((actualReturn - investment.amount) / investment.amount) * 100;

    return (
      <View key={investment.id} style={styles.investmentItem}>
        <View style={styles.investmentHeader}>
          <View style={styles.investmentInfo}>
            <Text style={styles.investmentCategory}>{investment.category}</Text>
            <Text style={styles.investmentDescription}>{investment.description}</Text>
          </View>
          <View style={styles.investmentMetrics}>
            <Text style={styles.investmentAmount}>{formatCurrency(investment.amount)}</Text>
            <Text style={[styles.investmentROI, { color: getROIColor(roi) }]}>
              {formatPercentage(roi)} ROI
            </Text>
          </View>
        </View>

        <View style={styles.investmentDetails}>
          <Text style={styles.investmentDate}>
            {new Date(investment.date).toLocaleDateString()}
          </Text>
          <View style={styles.returnBreakdown}>
            <Text style={styles.returnLabel}>Expected: {formatCurrency(investment.expectedReturn)}</Text>
            {investment.actualReturn && (
              <Text style={styles.returnLabel}>Actual: {formatCurrency(investment.actualReturn)}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="chart-line-variant"
          size={24}
          color="#007AFF"
        />
        <Text style={styles.title}>ROI Analysis</Text>
        <Text style={styles.subtitle}>{timeRange} period</Text>
      </View>

      {/* Category Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterButton,
                selectedCategory === category && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedCategory === category && styles.filterButtonTextActive,
                ]}
              >
                {category === 'all' ? 'All Categories' : category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ROI Metrics Cards */}
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { borderLeftColor: getROIColor(metrics.netROI) }]}>
          <MaterialCommunityIcons name="percent" size={24} color={getROIColor(metrics.netROI)} />
          <View style={styles.metricContent}>
            <Text style={styles.metricValue}>{formatPercentage(metrics.netROI)}</Text>
            <Text style={styles.metricLabel}>Net ROI</Text>
            <Text style={[styles.metricStatus, { color: getROIColor(metrics.netROI) }]}>
              {getROIStatus(metrics.netROI)}
            </Text>
          </View>
        </View>

        <View style={[styles.metricCard, { borderLeftColor: '#007bff' }]}>
          <MaterialCommunityIcons name="cash-multiple" size={24} color="#007bff" />
          <View style={styles.metricContent}>
            <Text style={styles.metricValue}>{formatCurrency(metrics.totalReturns)}</Text>
            <Text style={styles.metricLabel}>Total Returns</Text>
            <Text style={styles.metricSubtext}>
              From {formatCurrency(metrics.totalInvestment)} invested
            </Text>
          </View>
        </View>

        <View style={[styles.metricCard, { borderLeftColor: '#ffc107' }]}>
          <MaterialCommunityIcons name="calendar-clock" size={24} color="#ffc107" />
          <View style={styles.metricContent}>
            <Text style={styles.metricValue}>{metrics.paybackPeriod.toFixed(1)}mo</Text>
            <Text style={styles.metricLabel}>Payback Period</Text>
            <Text style={styles.metricSubtext}>Time to recover investment</Text>
          </View>
        </View>

        <View style={[styles.metricCard, { borderLeftColor: '#6f42c1' }]}>
          <MaterialCommunityIcons name="trending-up" size={24} color="#6f42c1" />
          <View style={styles.metricContent}>
            <Text style={styles.metricValue}>{metrics.profitabilityIndex.toFixed(2)}</Text>
            <Text style={styles.metricLabel}>Profitability Index</Text>
            <Text style={styles.metricSubtext}>Returns per dollar invested</Text>
          </View>
        </View>
      </View>

      {/* Investment Performance */}
      <View style={styles.performanceSection}>
        <Text style={styles.sectionTitle}>Investment Performance</Text>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.investmentsContainer}
        >
          {investments
            .filter(inv => selectedCategory === 'all' || inv.category === selectedCategory)
            .map(investment => renderInvestmentItem(investment))
          }
        </ScrollView>
      </View>

      {/* ROI Insights */}
      <View style={styles.insightsSection}>
        <Text style={styles.sectionTitle}>ROI Insights</Text>

        <View style={styles.insightCard}>
          <MaterialCommunityIcons name="lightbulb" size={20} color="#ffc107" />
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>Performance Summary</Text>
            <Text style={styles.insightText}>
              {metrics.netROI >= 15
                ? 'Strong ROI performance indicates successful investment strategy'
                : metrics.netROI >= 5
                ? 'Moderate ROI suggests room for optimization'
                : 'ROI below expectations - review investment strategy'}
            </Text>
          </View>
        </View>

        <View style={styles.insightCard}>
          <MaterialCommunityIcons name="target" size={20} color="#28a745" />
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>Optimization Opportunities</Text>
            <Text style={styles.insightText}>
              {metrics.paybackPeriod <= 6
                ? 'Fast payback period - consider scaling successful investments'
                : 'Long payback period - focus on high-return opportunities'}
            </Text>
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
  filterContainer: {
    marginBottom: 20,
  },
  filterScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: '#fff',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#495057',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
  },
  metricContent: {
    marginLeft: 12,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  metricStatus: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  metricSubtext: {
    fontSize: 10,
    color: '#6c757d',
    marginTop: 2,
  },
  performanceSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  investmentsContainer: {
    paddingBottom: 10,
  },
  investmentItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  investmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  investmentInfo: {
    flex: 1,
  },
  investmentCategory: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
    marginBottom: 2,
  },
  investmentDescription: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '500',
  },
  investmentMetrics: {
    alignItems: 'flex-end',
  },
  investmentAmount: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '600',
  },
  investmentROI: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  investmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  investmentDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  returnBreakdown: {
    alignItems: 'flex-end',
  },
  returnLabel: {
    fontSize: 10,
    color: '#6c757d',
  },
  insightsSection: {
    marginTop: 10,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  insightContent: {
    flex: 1,
    marginLeft: 12,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 12,
    color: '#6c757d',
    lineHeight: 16,
  },
});

export default ROIAnalysis;