import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MaterialColors } from '../../../styles/MaterialDesign';
import { Lead } from '../../../types/dashboard';
import { ModelPerformance } from '../../../types/dashboard';
import { exportService, ExportOptions, ReportTemplate } from '../../../services/exportService';

interface DashboardExportPanelProps {
  leads: Lead[];
  performance: ModelPerformance[];
  onExportComplete: (exportId: string, format: string) => void;
}

interface ExportJob {
  id: string;
  type: 'leads' | 'performance' | 'report';
  format: 'csv' | 'excel' | 'pdf';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  filename?: string;
  error?: string;
  createdAt: Date;
}

const DashboardExportPanel: React.FC<DashboardExportPanelProps> = ({
  leads,
  performance,
  onExportComplete,
}) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'advanced' | 'scheduled'>('quick');
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [currentJob, setCurrentJob] = useState<ExportJob | null>(null);

  // Quick Export Options
  const [quickOptions, setQuickOptions] = useState({
    format: 'csv' as 'csv' | 'excel' | 'pdf',
    includeCharts: false,
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date(),
    },
  });

  // Advanced Export Options
  const [advancedOptions, setAdvancedOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeCharts: true,
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    },
    filters: {
      leadScoreMin: undefined,
      leadScoreMax: undefined,
      conversionProbabilityMin: undefined,
      dealValueMin: undefined,
    },
  });

  // Scheduled Export Options
  const [scheduledOptions, setScheduledOptions] = useState({
    template: null as ReportTemplate | null,
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    time: '09:00',
    recipients: '',
    enabled: false,
  });

  const handleQuickExport = async (dataType: 'leads' | 'performance') => {
    try {
      const jobId = `export-${Date.now()}`;
      const job: ExportJob = {
        id: jobId,
        type: dataType,
        format: quickOptions.format,
        status: 'processing',
        progress: 0,
        createdAt: new Date(),
      };

      setCurrentJob(job);
      setExportJobs(prev => [job, ...prev]);

      if (dataType === 'leads') {
        await exportService.exportLeads(leads, {
          format: quickOptions.format,
          includeCharts: quickOptions.includeCharts,
          dateRange: quickOptions.dateRange,
          filters: {},
        });
      } else {
        await exportService.exportPerformance(performance, {
          format: quickOptions.format,
          includeCharts: quickOptions.includeCharts,
          dateRange: quickOptions.dateRange,
          filters: {},
        });
      }

      // Update job status
      setExportJobs(prev =>
        prev.map(j => j.id === jobId ? { ...j, status: 'completed', progress: 100 } : j)
      );
      setCurrentJob(null);

      onExportComplete(jobId, quickOptions.format);
      Alert.alert('Success', `${dataType} exported successfully!`);
    } catch (error) {
      console.error('Export failed:', error);
      setExportJobs(prev =>
        prev.map(j => j.id === currentJob?.id ? { ...j, status: 'failed', error: 'Export failed' } : j)
      );
      setCurrentJob(null);
      Alert.alert('Error', 'Export failed. Please try again.');
    }
  };

  const handleAdvancedExport = async () => {
    try {
      const jobId = `advanced-export-${Date.now()}`;
      const job: ExportJob = {
        id: jobId,
        type: 'report',
        format: advancedOptions.format,
        status: 'processing',
        progress: 0,
        createdAt: new Date(),
      };

      setCurrentJob(job);
      setExportJobs(prev => [job, ...prev]);

      // Create a simple report template
      const template: ReportTemplate = {
        id: 'custom-report',
        name: 'Custom Dashboard Report',
        description: 'Custom report with user-defined filters',
        sections: [
          {
            id: 'leads-section',
            title: 'Lead Analysis',
            type: 'leads',
            dataSource: 'leads',
            filters: advancedOptions.filters,
          },
          {
            id: 'performance-section',
            title: 'Model Performance',
            type: 'performance',
            dataSource: 'performance',
          },
        ],
      };

      await exportService.generateReport(template, leads, performance, advancedOptions);

      setExportJobs(prev =>
        prev.map(j => j.id === jobId ? { ...j, status: 'completed', progress: 100 } : j)
      );
      setCurrentJob(null);

      onExportComplete(jobId, advancedOptions.format);
      Alert.alert('Success', 'Advanced report generated successfully!');
    } catch (error) {
      console.error('Advanced export failed:', error);
      setExportJobs(prev =>
        prev.map(j => j.id === currentJob?.id ? { ...j, status: 'failed', error: 'Export failed' } : j)
      );
      setCurrentJob(null);
      Alert.alert('Error', 'Advanced export failed. Please try again.');
    }
  };

  const handleScheduleReport = async () => {
    if (!scheduledOptions.template) {
      Alert.alert('Error', 'Please select a report template');
      return;
    }

    try {
      const scheduleId = await exportService.scheduleReport(scheduledOptions.template, {
        frequency: scheduledOptions.frequency,
        time: scheduledOptions.time,
        recipients: scheduledOptions.recipients.split(',').map(email => email.trim()),
      });

      Alert.alert('Success', `Report scheduled successfully! Schedule ID: ${scheduleId}`);
    } catch (error) {
      console.error('Scheduling failed:', error);
      Alert.alert('Error', 'Failed to schedule report. Please try again.');
    }
  };

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return MaterialColors.secondary[500];
      case 'failed':
        return MaterialColors.error[500];
      case 'processing':
        return MaterialColors.primary[500];
      default:
        return MaterialColors.neutral[400];
    }
  };

  const getJobStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'check-circle';
      case 'failed':
        return 'error';
      case 'processing':
        return 'hourglass-empty';
      default:
        return 'schedule';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Export Dashboard Data</Text>
        <Text style={styles.subtitle}>Download insights and reports</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {(['quick', 'advanced', 'scheduled'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.tabActive,
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'quick' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Quick Export</Text>

            {/* Format Selection */}
            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>Export Format</Text>
              <View style={styles.formatOptions}>
                {(['csv', 'excel', 'pdf'] as const).map(format => (
                  <TouchableOpacity
                    key={format}
                    style={[
                      styles.formatOption,
                      quickOptions.format === format && styles.formatOptionActive,
                    ]}
                    onPress={() => setQuickOptions(prev => ({ ...prev, format }))}
                  >
                    <Text
                      style={[
                        styles.formatText,
                        quickOptions.format === format && styles.formatTextActive,
                      ]}
                    >
                      {format.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Include Charts */}
            <View style={styles.optionGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.optionLabel}>Include Charts</Text>
                <Switch
                  value={quickOptions.includeCharts}
                  onValueChange={(value) =>
                    setQuickOptions(prev => ({ ...prev, includeCharts: value }))
                  }
                  trackColor={{ false: MaterialColors.neutral[300], true: MaterialColors.primary[200] }}
                  thumbColor={quickOptions.includeCharts ? MaterialColors.primary[500] : MaterialColors.neutral[500]}
                />
              </View>
            </View>

            {/* Export Buttons */}
            <View style={styles.exportButtons}>
              <TouchableOpacity
                style={[styles.exportButton, styles.primaryButton]}
                onPress={() => handleQuickExport('leads')}
                disabled={currentJob !== null}
              >
                <MaterialIcons name="file-download" size={20} color={MaterialColors.onPrimary} />
                <Text style={styles.exportButtonText}>Export Leads</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.exportButton, styles.secondaryButton]}
                onPress={() => handleQuickExport('performance')}
                disabled={currentJob !== null}
              >
                <MaterialIcons name="analytics" size={20} color={MaterialColors.primary[500]} />
                <Text style={[styles.exportButtonText, styles.secondaryButtonText]}>Export Performance</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === 'advanced' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Advanced Export</Text>

            {/* Format Selection */}
            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>Report Format</Text>
              <View style={styles.formatOptions}>
                {(['pdf', 'csv', 'excel'] as const).map(format => (
                  <TouchableOpacity
                    key={format}
                    style={[
                      styles.formatOption,
                      advancedOptions.format === format && styles.formatOptionActive,
                    ]}
                    onPress={() => setAdvancedOptions(prev => ({ ...prev, format }))}
                  >
                    <Text
                      style={[
                        styles.formatText,
                        advancedOptions.format === format && styles.formatTextActive,
                      ]}
                    >
                      {format.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Filters */}
            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>Filters</Text>

              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Lead Score:</Text>
                <TextInput
                  style={styles.filterInput}
                  value={advancedOptions.filters.leadScoreMin?.toString() || ''}
                  onChangeText={(value) =>
                    setAdvancedOptions(prev => ({
                      ...prev,
                      filters: {
                        ...prev.filters,
                        leadScoreMin: value ? parseInt(value) : undefined,
                      },
                    }))
                  }
                  placeholder="Min"
                  keyboardType="numeric"
                />
                <Text style={styles.filterLabel}>to</Text>
                <TextInput
                  style={styles.filterInput}
                  value={advancedOptions.filters.leadScoreMax?.toString() || ''}
                  onChangeText={(value) =>
                    setAdvancedOptions(prev => ({
                      ...prev,
                      filters: {
                        ...prev.filters,
                        leadScoreMax: value ? parseInt(value) : undefined,
                      },
                    }))
                  }
                  placeholder="Max"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Conversion Probability:</Text>
                <TextInput
                  style={styles.filterInput}
                  value={advancedOptions.filters.conversionProbabilityMin?.toString() || ''}
                  onChangeText={(value) =>
                    setAdvancedOptions(prev => ({
                      ...prev,
                      filters: {
                        ...prev.filters,
                        conversionProbabilityMin: value ? parseFloat(value) : undefined,
                      },
                    }))
                  }
                  placeholder="Min %"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Generate Report Button */}
            <TouchableOpacity
              style={[styles.generateButton, currentJob && styles.generateButtonDisabled]}
              onPress={handleAdvancedExport}
              disabled={currentJob !== null}
            >
              <MaterialIcons name="description" size={20} color={MaterialColors.onPrimary} />
              <Text style={styles.generateButtonText}>Generate Advanced Report</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'scheduled' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Scheduled Reports</Text>

            {/* Frequency Selection */}
            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>Frequency</Text>
              <View style={styles.frequencyOptions}>
                {(['daily', 'weekly', 'monthly'] as const).map(freq => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyOption,
                      scheduledOptions.frequency === freq && styles.frequencyOptionActive,
                    ]}
                    onPress={() => setScheduledOptions(prev => ({ ...prev, frequency: freq }))}
                  >
                    <Text
                      style={[
                        styles.frequencyText,
                        scheduledOptions.frequency === freq && styles.frequencyTextActive,
                      ]}
                    >
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Time Selection */}
            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>Delivery Time</Text>
              <TextInput
                style={styles.timeInput}
                value={scheduledOptions.time}
                onChangeText={(value) => setScheduledOptions(prev => ({ ...prev, time: value }))}
                placeholder="09:00"
              />
            </View>

            {/* Recipients */}
            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>Recipients (comma-separated)</Text>
              <TextInput
                style={styles.recipientsInput}
                value={scheduledOptions.recipients}
                onChangeText={(value) => setScheduledOptions(prev => ({ ...prev, recipients: value }))}
                placeholder="email1@example.com, email2@example.com"
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Schedule Button */}
            <TouchableOpacity
              style={styles.scheduleButton}
              onPress={handleScheduleReport}
            >
              <MaterialIcons name="schedule" size={20} color={MaterialColors.onPrimary} />
              <Text style={styles.scheduleButtonText}>Schedule Report</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Export Jobs History */}
        {exportJobs.length > 0 && (
          <View style={styles.jobsSection}>
            <Text style={styles.sectionTitle}>Recent Exports</Text>
            {exportJobs.slice(0, 5).map(job => (
              <View key={job.id} style={styles.jobItem}>
                <View style={styles.jobInfo}>
                  <MaterialIcons
                    name={getJobStatusIcon(job.status)}
                    size={20}
                    color={getJobStatusColor(job.status)}
                  />
                  <View style={styles.jobDetails}>
                    <Text style={styles.jobTitle}>
                      {job.type} export ({job.format.toUpperCase()})
                    </Text>
                    <Text style={styles.jobTime}>
                      {job.createdAt.toLocaleTimeString()}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.jobStatus, { color: getJobStatusColor(job.status) }]}>
                  {job.status}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Current Job Progress */}
      {currentJob && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Exporting {currentJob.type}... {currentJob.progress}%
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${currentJob.progress}%` }]}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MaterialColors.surface,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: MaterialColors.neutral[200],
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: MaterialColors.onSurface,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: MaterialColors.neutral[600],
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: MaterialColors.neutral[200],
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  tabActive: {
    backgroundColor: MaterialColors.primary[500],
  },
  tabText: {
    fontSize: 14,
    color: MaterialColors.neutral[600],
    fontWeight: '500',
  },
  tabTextActive: {
    color: MaterialColors.onPrimary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  tabContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: MaterialColors.onSurface,
    marginBottom: 16,
  },
  optionGroup: {
    marginBottom: 20,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: MaterialColors.onSurface,
    marginBottom: 12,
  },
  formatOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  formatOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
  },
  formatOptionActive: {
    backgroundColor: MaterialColors.primary[500],
    borderColor: MaterialColors.primary[500],
  },
  formatText: {
    fontSize: 12,
    color: MaterialColors.neutral[600],
    fontWeight: '500',
  },
  formatTextActive: {
    color: MaterialColors.onPrimary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: MaterialColors.primary[500],
  },
  secondaryButton: {
    backgroundColor: MaterialColors.surface,
    borderWidth: 1,
    borderColor: MaterialColors.primary[500],
  },
  exportButtonText: {
    fontSize: 14,
    color: MaterialColors.onPrimary,
    fontWeight: '500',
  },
  secondaryButtonText: {
    color: MaterialColors.primary[500],
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    color: MaterialColors.neutral[700],
    minWidth: 120,
  },
  filterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: MaterialColors.onSurface,
    backgroundColor: MaterialColors.surface,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MaterialColors.primary[500],
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  generateButtonDisabled: {
    backgroundColor: MaterialColors.neutral[300],
  },
  generateButtonText: {
    fontSize: 16,
    color: MaterialColors.onPrimary,
    fontWeight: '500',
  },
  frequencyOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
  },
  frequencyOptionActive: {
    backgroundColor: MaterialColors.primary[500],
    borderColor: MaterialColors.primary[500],
  },
  frequencyText: {
    fontSize: 14,
    color: MaterialColors.neutral[600],
  },
  frequencyTextActive: {
    color: MaterialColors.onPrimary,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: MaterialColors.onSurface,
    backgroundColor: MaterialColors.surface,
  },
  recipientsInput: {
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: MaterialColors.onSurface,
    backgroundColor: MaterialColors.surface,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MaterialColors.secondary[500],
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  scheduleButtonText: {
    fontSize: 16,
    color: MaterialColors.onPrimary,
    fontWeight: '500',
  },
  jobsSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: MaterialColors.neutral[200],
  },
  jobItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: MaterialColors.surface,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[200],
  },
  jobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  jobDetails: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 14,
    color: MaterialColors.onSurface,
    fontWeight: '500',
  },
  jobTime: {
    fontSize: 12,
    color: MaterialColors.neutral[600],
  },
  jobStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: MaterialColors.neutral[200],
    backgroundColor: MaterialColors.surface,
  },
  progressText: {
    fontSize: 14,
    color: MaterialColors.onSurface,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: MaterialColors.neutral[200],
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: MaterialColors.primary[500],
    borderRadius: 2,
  },
});

export default DashboardExportPanel;