import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';
import { apiService } from '../../services/api';

interface ImportLeadsScreenProps {
  navigation: any;
}

interface ImportResult {
  imported: number;
  failed: number;
  errors: string[];
}

const ImportLeadsScreen: React.FC<ImportLeadsScreenProps> = ({ navigation }) => {
  const [selectedFile, setSelectedFile] = useState<DocumentPickerResponse | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileSelection = async () => {
    try {
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.csv, DocumentPicker.types.xls, DocumentPicker.types.xlsx],
        allowMultiSelection: false,
      });

      if (res && res.length > 0) {
        setSelectedFile(res[0]);
        setImportResult(null);
      }
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        console.error('Document picker error:', error);
        Alert.alert('Error', 'Failed to select file');
      }
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file first');
      return;
    }

    try {
      setIsImporting(true);
      
      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        type: selectedFile.type || 'text/csv',
        name: selectedFile.name || 'leads.csv',
      } as any);

      const result = await apiService.importLeads(formData);
      setImportResult(result.data);

      if (result.data.imported > 0) {
        Alert.alert(
          'Import Complete',
          `Successfully imported ${result.data.imported} leads. ${result.data.failed > 0 ? `${result.data.failed} failed.` : ''}`,
          [
            {
              text: 'View Leads',
              onPress: () => navigation.navigate('LeadsList'),
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert('Import Failed', 'No leads were imported. Please check your file format.');
      }
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Error', 'Failed to import leads. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const renderFileInfo = () => {
    if (!selectedFile) return null;

    const fileSizeInMB = selectedFile.size ? (selectedFile.size / (1024 * 1024)).toFixed(2) : 'Unknown';

    return (
      <View style={styles.fileInfoCard}>
        <View style={styles.fileIcon}>
          <Text style={styles.fileIconText}>📄</Text>
        </View>
        <View style={styles.fileDetails}>
          <Text style={styles.fileName}>{selectedFile.name}</Text>
          <Text style={styles.fileSize}>{fileSizeInMB} MB</Text>
          <Text style={styles.fileType}>{selectedFile.type}</Text>
        </View>
        <TouchableOpacity
          style={styles.removeFileButton}
          onPress={() => {
            setSelectedFile(null);
            setImportResult(null);
          }}
        >
          <Text style={styles.removeFileText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderImportResult = () => {
    if (!importResult) return null;

    return (
      <View style={styles.resultCard}>
        <Text style={styles.resultTitle}>Import Results</Text>
        
        <View style={styles.resultStats}>
          <View style={styles.resultStat}>
            <Text style={[styles.resultStatNumber, { color: '#4CAF50' }]}>
              {importResult.imported}
            </Text>
            <Text style={styles.resultStatLabel}>Imported</Text>
          </View>
          
          <View style={styles.resultStat}>
            <Text style={[styles.resultStatNumber, { color: '#f44336' }]}>
              {importResult.failed}
            </Text>
            <Text style={styles.resultStatLabel}>Failed</Text>
          </View>
        </View>

        {importResult.errors.length > 0 && (
          <View style={styles.errorsSection}>
            <Text style={styles.errorsTitle}>Errors:</Text>
            {importResult.errors.slice(0, 5).map((error, index) => (
              <Text key={index} style={styles.errorText}>
                • {error}
              </Text>
            ))}
            {importResult.errors.length > 5 && (
              <Text style={styles.moreErrorsText}>
                ... and {importResult.errors.length - 5} more errors
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderInstructions = () => (
    <View style={styles.instructionsCard}>
      <Text style={styles.instructionsTitle}>File Format Requirements</Text>
      
      <Text style={styles.instructionsSubtitle}>Required Columns:</Text>
      <View style={styles.columnsList}>
        <Text style={styles.columnItem}>• first_name (required)</Text>
        <Text style={styles.columnItem}>• last_name (required)</Text>
        <Text style={styles.columnItem}>• email (required)</Text>
        <Text style={styles.columnItem}>• source (required)</Text>
      </View>

      <Text style={styles.instructionsSubtitle}>Optional Columns:</Text>
      <View style={styles.columnsList}>
        <Text style={styles.columnItem}>• phone_number</Text>
        <Text style={styles.columnItem}>• status (New, Contacted, Qualified, etc.)</Text>
        <Text style={styles.columnItem}>• priority (High, Medium, Low)</Text>
        <Text style={styles.columnItem}>• budget_min</Text>
        <Text style={styles.columnItem}>• budget_max</Text>
        <Text style={styles.columnItem}>• desired_location</Text>
        <Text style={styles.columnItem}>• property_type</Text>
        <Text style={styles.columnItem}>• bedrooms_min</Text>
        <Text style={styles.columnItem}>• bathrooms_min</Text>
        <Text style={styles.columnItem}>• notes</Text>
      </View>

      <View style={styles.tipContainer}>
        <Text style={styles.tipIcon}>💡</Text>
        <Text style={styles.tipText}>
          Tip: Make sure your CSV file has headers in the first row matching the column names above.
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Import Leads</Text>
          <Text style={styles.headerSubtitle}>
            Upload a CSV or Excel file to bulk import leads
          </Text>
        </View>

        {/* File Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select File</Text>
          
          {!selectedFile ? (
            <TouchableOpacity 
              style={styles.fileSelectButton}
              onPress={handleFileSelection}
              disabled={isImporting}
            >
              <View style={styles.fileSelectIcon}>
                <Text style={styles.fileSelectIconText}>📁</Text>
              </View>
              <Text style={styles.fileSelectText}>Choose CSV or Excel File</Text>
              <Text style={styles.fileSelectSubtext}>
                Tap to browse and select your leads file
              </Text>
            </TouchableOpacity>
          ) : (
            renderFileInfo()
          )}
        </View>

        {/* Import Button */}
        {selectedFile && (
          <TouchableOpacity
            style={[styles.importButton, isImporting && styles.buttonDisabled]}
            onPress={handleImport}
            disabled={isImporting}
          >
            {isImporting ? (
              <View style={styles.importingContainer}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.importButtonText}>Importing...</Text>
              </View>
            ) : (
              <Text style={styles.importButtonText}>Import Leads</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Import Results */}
        {renderImportResult()}

        {/* Instructions */}
        {renderInstructions()}

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
  fileSelectButton: {
    borderWidth: 2,
    borderColor: '#e3f2fd',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  fileSelectIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  fileSelectIconText: {
    fontSize: 24,
    color: '#fff',
  },
  fileSelectText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  fileSelectSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  fileInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  fileIconText: {
    fontSize: 20,
    color: '#fff',
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  fileType: {
    fontSize: 12,
    color: '#999',
  },
  removeFileButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeFileText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  importButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  importingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  importButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultCard: {
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
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  resultStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  resultStat: {
    alignItems: 'center',
  },
  resultStatNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultStatLabel: {
    fontSize: 14,
    color: '#666',
  },
  errorsSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d32f2f',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    marginBottom: 4,
  },
  moreErrorsText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  instructionsCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  instructionsSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  columnsList: {
    marginBottom: 8,
  },
  columnItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    paddingLeft: 8,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  tipIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 32,
  },
});

export default ImportLeadsScreen;