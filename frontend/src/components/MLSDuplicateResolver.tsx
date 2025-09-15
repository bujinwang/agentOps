import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { MLSDuplicateCandidate } from '../types/mls';

interface MLSDuplicateResolverProps {
  duplicates: MLSDuplicateCandidate[];
  onResolve: (resolution: DuplicateResolution) => void;
  onSkip: () => void;
}

interface DuplicateResolution {
  duplicateId: string;
  action: 'merge' | 'keep_mls' | 'keep_existing' | 'create_new';
  masterProperty?: any;
  mergedData?: any;
}

const MLSDuplicateResolver: React.FC<MLSDuplicateResolverProps> = ({
  duplicates,
  onResolve,
  onSkip,
}) => {
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentDuplicate = duplicates[currentIndex];
  const isLastDuplicate = currentIndex === duplicates.length - 1;

  const handleResolution = (action: DuplicateResolution['action']) => {
    if (!currentDuplicate) return;

    const resolution: DuplicateResolution = {
      duplicateId: currentDuplicate.id,
      action,
      masterProperty: action === 'keep_mls' ? currentDuplicate.targetRecord : currentDuplicate.sourceRecord,
    };

    if (isLastDuplicate) {
      onResolve(resolution);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSkip = () => {
    if (isLastDuplicate) {
      onSkip();
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  if (!currentDuplicate) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No duplicates to resolve</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Resolve Property Duplicates</Text>
        <Text style={styles.subtitle}>
          {currentIndex + 1} of {duplicates.length}
        </Text>
      </View>

      <View style={styles.duplicateContainer}>
        <View style={styles.propertyCard}>
          <Text style={styles.cardTitle}>Source Property</Text>
          <Text style={styles.address}>
            {currentDuplicate.sourceRecord.address?.streetName || 'Address not available'}
          </Text>
          <Text style={styles.details}>
            MLS ID: {currentDuplicate.sourceRecord.mlsId}
          </Text>
        </View>

        <View style={styles.vsContainer}>
          <MaterialCommunityIcons name="compare" size={24} color="#fff" />
        </View>

        <View style={styles.propertyCard}>
          <Text style={styles.cardTitle}>Target Property</Text>
          <Text style={styles.address}>
            {currentDuplicate.targetRecord.address?.streetName || 'Address not available'}
          </Text>
          <Text style={styles.details}>
            MLS ID: {currentDuplicate.targetRecord.mlsId}
          </Text>
        </View>
      </View>

      <View style={styles.matchInfo}>
        <Text style={styles.sectionTitle}>Match Confidence</Text>
        <Text style={styles.confidence}>
          {(currentDuplicate.confidence * 100).toFixed(1)}%
        </Text>
        <Text style={styles.matchReasons}>
          {currentDuplicate.matchReasons.join(', ')}
        </Text>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.mergeButton]}
          onPress={() => handleResolution('merge')}
        >
          <MaterialCommunityIcons name="merge" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Auto Merge</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.keepMlsButton]}
          onPress={() => handleResolution('keep_mls')}
        >
          <MaterialCommunityIcons name="update" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Use Target</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.keepExistingButton]}
          onPress={() => handleResolution('keep_existing')}
        >
          <MaterialCommunityIcons name="content-save" size={20} color="#000" />
          <Text style={[styles.actionButtonText, styles.darkText]}>Keep Source</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.createNewButton]}
          onPress={() => handleResolution('create_new')}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Create New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footerActions}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip This One</Text>
        </TouchableOpacity>

        {!isLastDuplicate && (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => setCurrentIndex(currentIndex + 1)}
          >
            <Text style={styles.nextButtonText}>Next Duplicate</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  duplicateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  propertyCard: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  address: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  details: {
    fontSize: 14,
    marginBottom: 4,
    color: '#666',
  },
  vsContainer: {
    padding: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
  },
  matchInfo: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  confidence: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
  },
  matchReasons: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    minWidth: '48%',
  },
  mergeButton: {
    backgroundColor: '#4CAF50',
  },
  keepMlsButton: {
    backgroundColor: '#FF9800',
  },
  keepExistingButton: {
    backgroundColor: '#E0E0E0',
  },
  createNewButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#fff',
  },
  darkText: {
    color: '#000',
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  nextButton: {
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
    backgroundColor: '#2196F3',
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default MLSDuplicateResolver;