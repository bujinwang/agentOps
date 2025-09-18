import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Alert, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { exportService, ScheduledReport, ReportTemplate, ExportOptions } from '../services/exportService';
import { ConversionData } from '../services/exportService';

interface ReportSchedulerProps {
  conversionData: ConversionData;
  onScheduledReportCreated?: (report: ScheduledReport) => void;
  onScheduledReportUpdated?: (report: ScheduledReport) => void;
  onScheduledReportDeleted?: (id: string) => void;
}

const ReportScheduler: React.FC<ReportSchedulerProps> = ({
  conversionData,
  onScheduledReportCreated,
  onScheduledReportUpdated,
  onScheduledReportDeleted
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newReport, setNewReport] = useState<Partial<ScheduledReport>>({
    name: '',
    templateId: 'executive-summary',
    schedule: {
      frequency: 'weekly',
      time: '09:00',
      dayOfWeek: 1 // Monday
    },
    recipients: [],
    options: {
      format: 'pdf',
      includeCharts: true,
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      },
      filters: {}
    },
    enabled: true
  });

  const templates = exportService.getTemplates();

  useEffect(() => {
    loadScheduledReports();
  }, []);

  const loadScheduledReports = useCallback(async () => {
    try {
      const reports = exportService.getScheduledReports();
      setScheduledReports(reports);
    } catch (error) {
      console.error('Failed to load scheduled reports:', error);
    }
  }, []);

  const handleCreateReport = useCallback(async () => {
    if (!newReport.name || !newReport.templateId) {
      Alert.alert('Error', 'Please provide a name and select a template');
      return;
    }

    setIsCreating(true);
    try {
      const reportId = await exportService.scheduleReport(newReport as Omit<ScheduledReport, 'id' | 'nextRun'>);
      await loadScheduledReports();

      const createdReport = scheduledReports.find(r => r.id === reportId);
      if (createdReport) {
        onScheduledReportCreated?.(createdReport);
      }

      setNewReport({
        name: '',
        templateId: 'executive-summary',
        schedule: {
          frequency: 'weekly',
          time: '09:00',
          dayOfWeek: 1
        },
        recipients: [],
        options: {
          format: 'pdf',
          includeCharts: true,
          dateRange: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: new Date()
          },
          filters: {}
        },
        enabled: true
      });

      Alert.alert('Success', 'Scheduled report created successfully');
    } catch (error) {
      console.error('Failed to create scheduled report:', error);
      Alert.alert('Error', 'Failed to create scheduled report');
    } finally {
      setIsCreating(false);
    }
  }, [newReport, scheduledReports, loadScheduledReports, onScheduledReportCreated]);

  const handleToggleReport = useCallback(async (report: ScheduledReport) => {
    try {
      await exportService.updateScheduledReport(report.id, { enabled: !report.enabled });
      await loadScheduledReports();

      const updatedReport = scheduledReports.find(r => r.id === report.id);
      if (updatedReport) {
        onScheduledReportUpdated?.(updatedReport);
      }
    } catch (error) {
      console.error('Failed to toggle report:', error);
      Alert.alert('Error', 'Failed to update report status');
    }
  }, [loadScheduledReports, scheduledReports, onScheduledReportUpdated]);

  const handleDeleteReport = useCallback(async (reportId: string) => {
    Alert.alert(
      'Delete Report',
      'Are you sure you want to delete this scheduled report?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await exportService.deleteScheduledReport(reportId);
              await loadScheduledReports();
              onScheduledReportDeleted?.(reportId);
              Alert.alert('Success', 'Scheduled report deleted');
            } catch (error) {
              console.error('Failed to delete report:', error);
              Alert.alert('Error', 'Failed to delete report');
            }
          }
        }
      ]
    );
  }, [loadScheduledReports, onScheduledReportDeleted]);

  const formatNextRun = (nextRun: Date) => {
    return nextRun.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFrequencyLabel = (frequency: string, schedule: ScheduledReport['schedule']) => {
    switch (frequency) {
      case 'daily':
        return `Daily at ${schedule.time}`;
      case 'weekly':
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `Weekly on ${days[schedule.dayOfWeek || 0]} at ${schedule.time}`;
      case 'monthly':
        return `Monthly on day ${schedule.dayOfMonth || 1} at ${schedule.time}`;
      default:
        return frequency;
    }
  };

  const getTemplateName = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    return template?.name || templateId;
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsModalVisible(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#28A745',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 8
        }}
      >
        <MaterialIcons name="schedule" size={20} color="white" />
        <Text style={{ color: 'white', fontWeight: '600', marginLeft: 8 }}>
          Schedule Reports
        </Text>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 20,
            backgroundColor: 'white',
            borderBottomWidth: 1,
            borderBottomColor: '#E5E5E5'
          }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1C1C1E' }}>
              Scheduled Reports
            </Text>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              style={{ padding: 8 }}
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: 20 }}>
            {/* Existing Reports */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#1C1C1E' }}>
                Active Schedules ({scheduledReports.length})
              </Text>

              {scheduledReports.length === 0 ? (
                <View style={{
                  backgroundColor: 'white',
                  borderRadius: 8,
                  padding: 20,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#E5E5E5'
                }}>
                  <MaterialIcons name="schedule" size={48} color="#CCC" />
                  <Text style={{ fontSize: 16, color: '#666', marginTop: 12, textAlign: 'center' }}>
                    No scheduled reports yet
                  </Text>
                  <Text style={{ fontSize: 14, color: '#999', marginTop: 4, textAlign: 'center' }}>
                    Create your first automated report below
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {scheduledReports.map((report) => (
                    <View
                      key={report.id}
                      style={{
                        backgroundColor: 'white',
                        borderRadius: 8,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: '#E5E5E5'
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1C1C1E', marginBottom: 4 }}>
                            {report.name}
                          </Text>
                          <Text style={{ fontSize: 14, color: '#666' }}>
                            {getTemplateName(report.templateId)} • {report.options.format.toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Switch
                            value={report.enabled}
                            onValueChange={() => handleToggleReport(report)}
                            trackColor={{ false: '#CCC', true: '#28A745' }}
                            thumbColor={report.enabled ? '#FFF' : '#F4F3F4'}
                          />
                          <TouchableOpacity
                            onPress={() => handleDeleteReport(report.id)}
                            style={{ padding: 8 }}
                          >
                            <MaterialIcons name="delete" size={20} color="#FF5722" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={{ gap: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <MaterialIcons name="schedule" size={16} color="#666" />
                          <Text style={{ fontSize: 14, color: '#666', marginLeft: 8 }}>
                            {getFrequencyLabel(report.schedule.frequency, report.schedule)}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <MaterialIcons name="event" size={16} color="#666" />
                          <Text style={{ fontSize: 14, color: '#666', marginLeft: 8 }}>
                            Next run: {formatNextRun(report.nextRun)}
                          </Text>
                        </View>

                        {report.lastRun && (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialIcons name="history" size={16} color="#666" />
                            <Text style={{ fontSize: 14, color: '#666', marginLeft: 8 }}>
                              Last run: {formatNextRun(report.lastRun)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Create New Report */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#1C1C1E' }}>
                Create New Schedule
              </Text>

              <View style={{
                backgroundColor: 'white',
                borderRadius: 8,
                padding: 16,
                borderWidth: 1,
                borderColor: '#E5E5E5'
              }}>
                {/* Report Name */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1C1C1E', marginBottom: 8 }}>
                    Report Name
                  </Text>
                  <TouchableOpacity style={{
                    borderWidth: 1,
                    borderColor: '#E5E5E5',
                    borderRadius: 6,
                    padding: 12,
                    backgroundColor: '#FAFAFA'
                  }}>
                    <Text style={{ fontSize: 16, color: '#666' }}>
                      {newReport.name || 'Enter report name...'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Template Selection */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1C1C1E', marginBottom: 8 }}>
                    Template
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {templates.map((template) => (
                      <TouchableOpacity
                        key={template.id}
                        onPress={() => setNewReport(prev => ({ ...prev, templateId: template.id }))}
                        style={{
                          flex: 1,
                          padding: 12,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: newReport.templateId === template.id ? '#007AFF' : '#E5E5E5',
                          backgroundColor: newReport.templateId === template.id ? '#E3F2FD' : 'white'
                        }}
                      >
                        <Text style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: newReport.templateId === template.id ? '#007AFF' : '#1C1C1E',
                          textAlign: 'center'
                        }}>
                          {template.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Frequency */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1C1C1E', marginBottom: 8 }}>
                    Frequency
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                      <TouchableOpacity
                        key={freq}
                        onPress={() => setNewReport(prev => ({
                          ...prev,
                          schedule: { ...prev.schedule!, frequency: freq }
                        }))}
                        style={{
                          flex: 1,
                          padding: 12,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: newReport.schedule?.frequency === freq ? '#007AFF' : '#E5E5E5',
                          backgroundColor: newReport.schedule?.frequency === freq ? '#E3F2FD' : 'white'
                        }}
                      >
                        <Text style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: newReport.schedule?.frequency === freq ? '#007AFF' : '#1C1C1E',
                          textAlign: 'center',
                          textTransform: 'capitalize'
                        }}>
                          {freq}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Create Button */}
                <TouchableOpacity
                  onPress={handleCreateReport}
                  disabled={isCreating}
                  style={{
                    backgroundColor: isCreating ? '#CCC' : '#28A745',
                    borderRadius: 8,
                    padding: 16,
                    alignItems: 'center',
                    opacity: isCreating ? 0.6 : 1
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                    {isCreating ? 'Creating...' : 'Create Scheduled Report'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

export default ReportScheduler;