import React, { useState } from 'react';
import { View, StyleSheet, Alert, Share } from 'react-native';
import { Card, Text, Button, Chip, ProgressBar, List } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ComparativeMarketAnalysis, CMAExportFormat } from '../types/cma';

interface CMAReportGeneratorProps {
  cma: ComparativeMarketAnalysis;
  onGenerateReport?: (format: CMAExportFormat) => void;
}

const CMAReportGenerator: React.FC<CMAReportGeneratorProps> = ({
  cma,
  onGenerateReport,
}) => {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedReports, setGeneratedReports] = useState<string[]>([]);

  const handleGenerateReport = async (format: CMAExportFormat) => {
    setGenerating(true);
    setProgress(0);

    try {
      // Simulate report generation progress
      const steps = [
        'Analyzing market data...',
        'Processing comparables...',
        'Calculating statistics...',
        'Generating visualizations...',
        'Formatting report...',
        'Finalizing export...'
      ];

      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setProgress((i + 1) / steps.length);
      }

      if (onGenerateReport) {
        onGenerateReport(format);
      }

      const reportName = `CMA_Report_${cma.subject_property.address.street.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${format}`;
      setGeneratedReports(prev => [...prev, reportName]);

      Alert.alert(
        'Report Generated',
        `CMA report has been generated successfully in ${format.toUpperCase()} format.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate CMA report. Please try again.');
    } finally {
      setGenerating(false);
      setProgress(0);
    }
  };

  const handleShareReport = async (reportName: string) => {
    try {
      await Share.share({
        message: `CMA Report: ${reportName}`,
        title: 'Comparative Market Analysis Report',
      });
    } catch (error) {
      console.error('Error sharing report:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getReportSections = () => [
    {
      title: 'Executive Summary',
      description: 'Market analysis overview and key findings',
      included: true,
    },
    {
      title: 'Subject Property Analysis',
      description: 'Detailed analysis of the subject property',
      included: true,
    },
    {
      title: 'Comparable Properties',
      description: 'Analysis of selected comparable properties',
      included: true,
    },
    {
      title: 'Market Statistics',
      description: 'Comprehensive market statistics and trends',
      included: true,
    },
    {
      title: 'Price Range Analysis',
      description: 'Estimated value range with confidence intervals',
      included: true,
    },
    {
      title: 'Market Trends',
      description: 'Historical market trends and forecasting',
      included: cma.market_trends.length > 0,
    },
    {
      title: 'Neighborhood Analysis',
      description: 'Local market conditions and demographics',
      included: true,
    },
    {
      title: 'Recommendations',
      description: 'Pricing and marketing recommendations',
      included: cma.recommendations.length > 0,
    },
  ];

  return (
    <View style={styles.container}>
      {/* Report Configuration */}
      <Card style={styles.card}>
        <Card.Title
          title="CMA Report Generator"
          subtitle="Generate comprehensive market analysis reports"
          left={(props) => <MaterialCommunityIcons {...props} name="file-chart" />}
        />
        <Card.Content>
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyTitle}>
              {cma.subject_property.address.street}
            </Text>
            <Text style={styles.propertySubtitle}>
              {cma.subject_property.address.city}, {cma.subject_property.address.state}
            </Text>
            <Text style={styles.analysisDate}>
              Analysis Date: {new Date(cma.analysis_date).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.statsOverview}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{cma.comparables.length}</Text>
              <Text style={styles.statLabel}>Comparables</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {formatCurrency(cma.price_range.estimated_value_range.low)} - {formatCurrency(cma.price_range.estimated_value_range.high)}
              </Text>
              <Text style={styles.statLabel}>Price Range</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{cma.price_range.confidence_score}%</Text>
              <Text style={styles.statLabel}>Confidence</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Report Sections */}
      <Card style={styles.card}>
        <Card.Title
          title="Report Sections"
          subtitle="Sections included in the generated report"
        />
        <Card.Content>
          {getReportSections().map((section, index) => (
            <List.Item
              key={index}
              title={section.title}
              description={section.description}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={section.included ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  color={section.included ? '#4CAF50' : '#CCCCCC'}
                />
              )}
            />
          ))}
        </Card.Content>
      </Card>

      {/* Export Options */}
      <Card style={styles.card}>
        <Card.Title
          title="Export Options"
          subtitle="Choose your preferred report format"
        />
        <Card.Content>
          {generating && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>Generating report...</Text>
              <ProgressBar progress={progress} style={styles.progressBar} />
            </View>
          )}

          <View style={styles.formatButtons}>
            {[
              { format: 'pdf' as CMAExportFormat, label: 'PDF Report', icon: 'file-pdf-box', color: '#FF5722' },
              { format: 'excel' as CMAExportFormat, label: 'Excel Spreadsheet', icon: 'file-excel', color: '#4CAF50' },
              { format: 'word' as CMAExportFormat, label: 'Word Document', icon: 'file-word', color: '#1976D2' },
            ].map((option) => (
              <Button
                key={option.format}
                mode="outlined"
                onPress={() => handleGenerateReport(option.format)}
                disabled={generating}
                style={[styles.formatButton, { borderColor: option.color }]}
                icon={option.icon}
                labelStyle={{ color: option.color }}
              >
                {option.label}
              </Button>
            ))}
          </View>

          <Text style={styles.formatNote}>
            PDF format includes charts and visualizations. Excel format provides raw data for further analysis.
          </Text>
        </Card.Content>
      </Card>

      {/* Generated Reports */}
      {generatedReports.length > 0 && (
        <Card style={styles.card}>
          <Card.Title
            title="Generated Reports"
            subtitle="Recently created CMA reports"
          />
          <Card.Content>
            {generatedReports.map((report, index) => (
              <View key={index} style={styles.generatedReport}>
                <View style={styles.reportInfo}>
                  <MaterialCommunityIcons name="file-chart" size={24} color="#1976D2" />
                  <View style={styles.reportDetails}>
                    <Text style={styles.reportName}>{report}</Text>
                    <Text style={styles.reportTimestamp}>
                      Generated {new Date().toLocaleTimeString()}
                    </Text>
                  </View>
                </View>
                <Button
                  mode="text"
                  onPress={() => handleShareReport(report)}
                  icon="share"
                >
                  Share
                </Button>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Report Templates */}
      <Card style={styles.card}>
        <Card.Title
          title="Report Templates"
          subtitle="Choose from pre-configured report styles"
        />
        <Card.Content>
          <View style={styles.templates}>
            {[
              { name: 'Standard', description: 'Complete market analysis with all sections', recommended: true },
              { name: 'Executive', description: 'High-level summary for decision makers', recommended: false },
              { name: 'Detailed', description: 'In-depth analysis with additional metrics', recommended: false },
              { name: 'Custom', description: 'Configure sections and formatting', recommended: false },
            ].map((template, index) => (
              <View key={index} style={styles.template}>
                <View style={styles.templateHeader}>
                  <Text style={styles.templateName}>{template.name}</Text>
                  {template.recommended && (
                    <Chip mode="outlined" style={styles.recommendedChip}>
                      Recommended
                    </Chip>
                  )}
                </View>
                <Text style={styles.templateDescription}>{template.description}</Text>
                <Button
                  mode="text"
                  onPress={() => Alert.alert('Template Selected', `Selected ${template.name} template`)}
                  style={styles.templateButton}
                >
                  Use Template
                </Button>
              </View>
            ))}
          </View>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  propertyInfo: {
    marginBottom: 16,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  propertySubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  analysisDate: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
  },
  statsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
  },
  formatButtons: {
    gap: 12,
  },
  formatButton: {
    marginVertical: 4,
  },
  formatNote: {
    fontSize: 12,
    color: '#666666',
    marginTop: 12,
    fontStyle: 'italic',
  },
  generatedReport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  reportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reportDetails: {
    marginLeft: 12,
    flex: 1,
  },
  reportName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  reportTimestamp: {
    fontSize: 12,
    color: '#666666',
  },
  templates: {
    gap: 16,
  },
  template: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  templateName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  recommendedChip: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  templateDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  templateButton: {
    alignSelf: 'flex-start',
  },
});

export default CMAReportGenerator;