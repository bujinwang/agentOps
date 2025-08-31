import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
  Platform,
  Share,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { apiService } from '../../services/api';
import { LeadStatus, LeadPriority, PropertyType } from '../../types';

interface ExportLeadsScreenProps {
  navigation: any;
}

interface ExportFilters {
  status?: LeadStatus;
  priority?: LeadPriority;
  propertyType?: PropertyType;
  dateFrom?: string;
  dateTo?: string;
}

const ExportLeadsScreen: React.FC<ExportLeadsScreenProps> = ({ navigation }) => {
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState<ExportFilters>({});
  const [includeAllFields, setIncludeAllFields] = useState(true);
  const [selectedFields, setSelectedFields] = useState({
    basicInfo: true,
    contactInfo: true,
    preferences: true,
    budget: true,
    notes: false,
    dates: true,
  });

  const availableFields = [
    { key: 'basicInfo', label: 'Basic Info', description: 'Name, email, phone' },
    { key: 'contactInfo', label: 'Contact Details', description: 'Phone, email, source' },
    { key: 'preferences', label: 'Property Preferences', description: 'Location, type, bedrooms, bathrooms' },
    { key: 'budget', label: 'Budget Information', description: 'Min/max budget' },
    { key: 'notes', label: 'Notes & AI Summary', description: 'Notes and AI-generated summary' },
    { key: 'dates', label: 'Date Information', description: 'Created, updated, last contacted' },
  ];

  const handleExport = async () => {
    try {
      setIsExporting(true);

      // Prepare export filters
      const exportFilters: any = {};
      
      if (filters.status) exportFilters.status = filters.status;
      if (filters.priority) exportFilters.priority = filters.priority;
      if (filters.propertyType) exportFilters.propertyType = filters.propertyType;
      if (filters.dateFrom) exportFilters.dateFrom = filters.dateFrom;
      if (filters.dateTo) exportFilters.dateTo = filters.dateTo;

      // Add field selections if not including all fields
      if (!includeAllFields) {
        exportFilters.fields = Object.entries(selectedFields)
          .filter(([_, selected]) => selected)
          .map(([key, _]) => key);
      }

      const blob = await apiService.exportLeads(exportFormat, exportFilters);
      
      // For mobile, we'll need to handle the blob differently
      if (Platform.OS === 'web') {
        // Web handling
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `leads_export_${new Date().toISOString().split('T')[0]}.${exportFormat === 'csv' ? 'csv' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        Alert.alert('Success', 'Leads exported successfully!');
      } else {
        // For React Native, we'd need to use react-native-fs or similar
        // For now, show success message
        Alert.alert(
          'Export Prepared',
          'Your leads export has been prepared. In a production app, this would be saved to your device or shared.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export leads. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const renderFormatSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Export Format</Text>
      
      <View style={styles.formatOptions}>
        <TouchableOpacity
          style={[styles.formatOption, exportFormat === 'csv' && styles.formatOptionSelected]}
          onPress={() => setExportFormat('csv')}
        >
          <View style={styles.formatIcon}>
            <Text style={styles.formatIconText}>📊</Text>
          </View>
          <Text style={[styles.formatLabel, exportFormat === 'csv' && styles.formatLabelSelected]}>
            CSV Format
          </Text>
          <Text style={styles.formatDescription}>
            Compatible with Excel, Google Sheets
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.formatOption, exportFormat === 'excel' && styles.formatOptionSelected]}
          onPress={() => setExportFormat('excel')}
        >
          <View style={styles.formatIcon}>
            <Text style={styles.formatIconText}>📈</Text>
          </View>
          <Text style={[styles.formatLabel, exportFormat === 'excel' && styles.formatLabelSelected]}>
            Excel Format
          </Text>
          <Text style={styles.formatDescription}>
            Native Excel format with formatting
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Filter Options</Text>
      
      <View style={styles.filterRow}>
        <View style={styles.filterHalf}>
          <Text style={styles.filterLabel}>Status</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={filters.status}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              style={styles.picker}
            >
              <Picker.Item label="All Statuses" value={undefined} />
              <Picker.Item label="New" value="New" />
              <Picker.Item label="Contacted" value="Contacted" />
              <Picker.Item label="Qualified" value="Qualified" />
              <Picker.Item label="Showing Scheduled" value="Showing Scheduled" />
              <Picker.Item label="Offer Made" value="Offer Made" />
              <Picker.Item label="Closed Won" value="Closed Won" />
              <Picker.Item label="Closed Lost" value="Closed Lost" />
            </Picker>
          </View>
        </View>

        <View style={styles.filterHalf}>
          <Text style={styles.filterLabel}>Priority</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={filters.priority}
              onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}
              style={styles.picker}
            >
              <Picker.Item label="All Priorities" value={undefined} />
              <Picker.Item label="High" value="High" />
              <Picker.Item label="Medium" value="Medium" />
              <Picker.Item label="Low" value="Low" />
            </Picker>
          </View>
        </View>
      </View>

      <View style={styles.filterRow}>
        <View style={styles.filterFull}>
          <Text style={styles.filterLabel}>Property Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={filters.propertyType}
              onValueChange={(value) => setFilters(prev => ({ ...prev, propertyType: value }))}
              style={styles.picker}
            >
              <Picker.Item label="All Property Types" value={undefined} />
              <Picker.Item label="Condo" value="Condo" />
              <Picker.Item label="House" value="House" />
              <Picker.Item label="Townhouse" value="Townhouse" />
              <Picker.Item label="Land" value="Land" />
            </Picker>
          </View>
        </View>
      </View>
    </View>
  );

  const renderFieldSelection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Field Selection</Text>
      
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Include All Fields</Text>
        <Switch
          value={includeAllFields}
          onValueChange={setIncludeAllFields}
          trackColor={{ false: '#ccc', true: '#2196F3' }}
        />
      </View>

      {!includeAllFields && (
        <View style={styles.fieldsList}>
          {availableFields.map((field) => (
            <View key={field.key} style={styles.fieldOption}>
              <View style={styles.fieldInfo}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <Text style={styles.fieldDescription}>{field.description}</Text>
              </View>
              <Switch
                value={selectedFields[field.key as keyof typeof selectedFields]}
                onValueChange={(value) => 
                  setSelectedFields(prev => ({ ...prev, [field.key]: value }))
                }
                trackColor={{ false: '#ccc', true: '#2196F3' }}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderExportSummary = () => {
    const activeFiltersCount = Object.values(filters).filter(Boolean).length;
    const selectedFieldsCount = includeAllFields 
      ? availableFields.length 
      : Object.values(selectedFields).filter(Boolean).length;

    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Export Summary</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Format:</Text>
          <Text style={styles.summaryValue}>
            {exportFormat.toUpperCase()} {exportFormat === 'csv' ? '(Comma Separated)' : '(Excel Workbook)'}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Filters Applied:</Text>
          <Text style={styles.summaryValue}>
            {activeFiltersCount > 0 ? `${activeFiltersCount} filter(s)` : 'None (All leads)'}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Fields Included:</Text>
          <Text style={styles.summaryValue}>
            {includeAllFields ? 'All available fields' : `${selectedFieldsCount} selected field(s)`}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Export Leads</Text>
          <Text style={styles.headerSubtitle}>
            Export your leads data to CSV or Excel format
          </Text>
        </View>

        {/* Format Selector */}
        {renderFormatSelector()}

        {/* Filters */}
        {renderFilters()}

        {/* Field Selection */}
        {renderFieldSelection()}

        {/* Export Summary */}
        {renderExportSummary()}

        {/* Export Button */}
        <TouchableOpacity
          style={[styles.exportButton, isExporting && styles.buttonDisabled]}
          onPress={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <View style={styles.exportingContainer}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.exportButtonText}>Exporting...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.exportButtonIcon}>💾</Text>
              <Text style={styles.exportButtonText}>Export Leads</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  formatOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  formatOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  formatOptionSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#e3f2fd',
  },
  formatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  formatIconText: {
    fontSize: 20,
    color: '#fff',
  },
  formatLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  formatLabelSelected: {
    color: '#2196F3',
  },
  formatDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  filterHalf: {
    flex: 1,
  },
  filterFull: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 45,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  fieldsList: {
    gap: 12,
  },
  fieldOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  fieldInfo: {
    flex: 1,
    marginRight: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  fieldDescription: {
    fontSize: 12,
    color: '#666',
  },
  summaryCard: {
    backgroundColor: '#e3f2fd',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
  exportButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  exportingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exportButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
  },
});

export default ExportLeadsScreen;