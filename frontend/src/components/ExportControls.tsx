import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, ActivityIndicator, Share } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { exportService, ExportOptions, ReportTemplate } from '../services/exportService';
import { ConversionData } from '../services/exportService';
import { ConversionTrackingState } from '../hooks/useConversionTracking';

interface ExportControlsProps {
  conversionData: ConversionData;
  isLoading?: boolean;
  onExportStart?: () => void;
  onExportComplete?: (success: boolean, message: string) => void;
}

interface DateRange {
  start: Date;
  end: Date;
}

const ExportControls: React.FC<ExportControlsProps> = ({
  conversionData,
  isLoading = false,
  onExportStart,
  onExportComplete
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date()
  });
  const [selectedTemplate, setSelectedTemplate] = useState<string>('executive-summary');

  const templates = exportService.getTemplates();

  const handleExport = useCallback(async () => {
    if (isExporting) return;

    setIsExporting(true);
    onExportStart?.();

    try {
      const options: ExportOptions = {
        format: selectedFormat,
        includeCharts,
        dateRange,
        filters: {}
      };

      const result = await exportService.exportData(conversionData, options);

      // In a real app, you might want to save to device or share
      // For now, we'll just show success
      Alert.alert(
        'Export Complete',
        `Report exported successfully as ${result.filename}`,
        [{ text: 'OK' }]
      );

      onExportComplete?.(true, `Exported ${result.filename}`);
      setIsModalVisible(false);

    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert(
        'Export Failed',
        'Failed to export report. Please try again.',
        [{ text: 'OK' }]
      );
      onExportComplete?.(false, 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [selectedFormat, includeCharts, dateRange, conversionData, onExportStart, onExportComplete, isExporting]);

  const handleTemplateExport = useCallback(async (templateId: string) => {
    if (isExporting) return;

    setIsExporting(true);
    onExportStart?.();

    try {
      const customOptions: Partial<ExportOptions> = {
        dateRange,
        filters: {}
      };

      const result = await exportService.generateReportFromTemplate(templateId, conversionData, customOptions);

      Alert.alert(
        'Template Export Complete',
        `Report exported successfully as ${result.filename}`,
        [{ text: 'OK' }]
      );

      onExportComplete?.(true, `Template exported ${result.filename}`);
      setIsModalVisible(false);

    } catch (error) {
      console.error('Template export failed:', error);
      Alert.alert(
        'Export Failed',
        'Failed to export template report. Please try again.',
        [{ text: 'OK' }]
      );
      onExportComplete?.(false, 'Template export failed');
    } finally {
      setIsExporting(false);
    }
  }, [dateRange, conversionData, onExportStart, onExportComplete, isExporting]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf': return 'picture-as-pdf';
      case 'excel': return 'table-chart';
      case 'csv': return 'file-download';
      default: return 'file-present';
    }
  };

  const getFormatColor = (format: string) => {
    switch (format) {
      case 'pdf': return '#FF5722';
      case 'excel': return '#4CAF50';
      case 'csv': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsModalVisible(true)}
        disabled={isLoading}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#007AFF',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 8,
          opacity: isLoading ? 0.6 : 1
        }}
      >
        <MaterialIcons name="file-download" size={20} color="white" />
        <Text style={{ color: 'white', fontWeight: '600', marginLeft: 8 }}>
          Export Report
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
              Export Conversion Report
            </Text>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              style={{ padding: 8 }}
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, padding: 20 }}>
            {/* Date Range */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#1C1C1E' }}>
                Date Range
              </Text>
              <View style={{
                backgroundColor: 'white',
                borderRadius: 8,
                padding: 16,
                borderWidth: 1,
                borderColor: '#E5E5E5'
              }}>
                <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                  {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
                </Text>
                <Text style={{ fontSize: 12, color: '#999' }}>
                  Tap to change date range
                </Text>
              </View>
            </View>

            {/* Export Format */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#1C1C1E' }}>
                Export Format
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {(['pdf', 'excel', 'csv'] as const).map((format) => (
                  <TouchableOpacity
                    key={format}
                    onPress={() => setSelectedFormat(format)}
                    style={{
                      flex: 1,
                      backgroundColor: selectedFormat === format ? getFormatColor(format) : 'white',
                      borderRadius: 8,
                      padding: 16,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: selectedFormat === format ? getFormatColor(format) : '#E5E5E5'
                    }}
                  >
                    <MaterialIcons
                      name={getFormatIcon(format)}
                      size={24}
                      color={selectedFormat === format ? 'white' : getFormatColor(format)}
                    />
                    <Text style={{
                      marginTop: 8,
                      fontSize: 12,
                      fontWeight: '600',
                      color: selectedFormat === format ? 'white' : '#1C1C1E',
                      textTransform: 'uppercase'
                    }}>
                      {format}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Options */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#1C1C1E' }}>
                Options
              </Text>
              <View style={{
                backgroundColor: 'white',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#E5E5E5'
              }}>
                <TouchableOpacity
                  onPress={() => setIncludeCharts(!includeCharts)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F0F0F0'
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons
                      name={includeCharts ? 'check-box' : 'check-box-outline-blank'}
                      size={20}
                      color={includeCharts ? '#007AFF' : '#666'}
                    />
                    <Text style={{ marginLeft: 12, fontSize: 14, color: '#1C1C1E' }}>
                      Include Charts
                    </Text>
                  </View>
                  <MaterialIcons name="bar-chart" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Templates */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#1C1C1E' }}>
                Quick Templates
              </Text>
              <View style={{ gap: 8 }}>
                {templates.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    onPress={() => handleTemplateExport(template.id)}
                    disabled={isExporting}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: 8,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: '#E5E5E5',
                      opacity: isExporting ? 0.6 : 1
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#1C1C1E', marginBottom: 4 }}>
                          {template.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#666' }}>
                          {template.description}
                        </Text>
                      </View>
                      <MaterialIcons name="arrow-forward" size={20} color="#666" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Export Button */}
            <View style={{ marginTop: 'auto' }}>
              <TouchableOpacity
                onPress={handleExport}
                disabled={isExporting}
                style={{
                  backgroundColor: isExporting ? '#CCC' : '#007AFF',
                  borderRadius: 8,
                  padding: 16,
                  alignItems: 'center',
                  opacity: isExporting ? 0.6 : 1
                }}
              >
                {isExporting ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="white" />
                    <Text style={{ color: 'white', fontWeight: '600', marginLeft: 8 }}>
                      Exporting...
                    </Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialIcons name="file-download" size={20} color="white" />
                    <Text style={{ color: 'white', fontWeight: '600', marginLeft: 8 }}>
                      Export {selectedFormat.toUpperCase()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                style={{
                  marginTop: 12,
                  padding: 16,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: '#666', fontSize: 16 }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default ExportControls;