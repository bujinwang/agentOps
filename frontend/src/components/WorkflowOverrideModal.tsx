import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Workflow } from '../services/WorkflowIntegrationService';
import { styles } from '../styles/WorkflowOverrideModalStyles';

interface WorkflowOverrideModalProps {
  visible: boolean;
  workflow: Workflow | null;
  onSubmit: (operation: string, reason?: string) => Promise<void>;
  onCancel: () => void;
}

export const WorkflowOverrideModal: React.FC<WorkflowOverrideModalProps> = ({
  visible,
  workflow,
  onSubmit,
  onCancel
}) => {
  const [selectedOperation, setSelectedOperation] = useState<string>('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const operations = [
    {
      key: 'pause',
      label: 'Pause Workflow',
      description: 'Temporarily stop workflow execution',
      icon: 'pause',
      color: '#FF9500'
    },
    {
      key: 'resume',
      label: 'Resume Workflow',
      description: 'Continue paused workflow execution',
      icon: 'play-arrow',
      color: '#34C759'
    },
    {
      key: 'cancel',
      label: 'Cancel Workflow',
      description: 'Permanently stop workflow execution',
      icon: 'cancel',
      color: '#FF3B30'
    },
    {
      key: 'restart',
      label: 'Restart Workflow',
      description: 'Reset and restart workflow from beginning',
      icon: 'replay',
      color: '#007AFF'
    }
  ];

  const handleSubmit = async () => {
    if (!selectedOperation) {
      Alert.alert('Error', 'Please select an operation');
      return;
    }

    if (!reason.trim() && selectedOperation !== 'resume') {
      Alert.alert('Error', 'Please provide a reason for this override');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(selectedOperation, reason.trim());
      handleClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to override workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedOperation('');
    setReason('');
    setLoading(false);
    onCancel();
  };

  const getOperationDetails = (operation: string) => {
    return operations.find(op => op.key === operation);
  };

  if (!workflow) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Workflow Override</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
            >
              <MaterialIcons name="close" size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          {/* Workflow Info */}
          <View style={styles.workflowInfo}>
            <View style={styles.workflowHeader}>
              <Text style={styles.workflowName}>
                {workflow.name || `Workflow ${workflow.id.slice(-8)}`}
              </Text>
              <View style={[styles.statusBadge, {
                backgroundColor: workflow.status === 'active' ? '#34C759' :
                               workflow.status === 'paused' ? '#FF9500' : '#8E8E93'
              }]}>
                <Text style={styles.statusText}>{workflow.status}</Text>
              </View>
            </View>

            <View style={styles.workflowMeta}>
              <Text style={styles.metaText}>
                Step {workflow.currentStep || 0} of {workflow.totalSteps || 0}
              </Text>
              <Text style={styles.metaText}>
                Created: {new Date(workflow.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Operations */}
          <View style={styles.operationsSection}>
            <Text style={styles.sectionTitle}>Select Operation</Text>
            <View style={styles.operationsGrid}>
              {operations.map((operation) => (
                <TouchableOpacity
                  key={operation.key}
                  style={[
                    styles.operationButton,
                    selectedOperation === operation.key && styles.operationButtonSelected
                  ]}
                  onPress={() => setSelectedOperation(operation.key)}
                >
                  <View style={[styles.operationIcon, { backgroundColor: operation.color }]}>
                    <MaterialIcons name={operation.icon as any} size={20} color="#FFFFFF" />
                  </View>
                  <Text style={styles.operationLabel}>{operation.label}</Text>
                  <Text style={styles.operationDescription}>{operation.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Reason Input */}
          {selectedOperation && selectedOperation !== 'resume' && (
            <View style={styles.reasonSection}>
              <Text style={styles.sectionTitle}>Reason for Override</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Please provide a reason for this workflow override..."
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
                maxLength={500}
              />
              <Text style={styles.characterCount}>
                {reason.length}/500 characters
              </Text>
            </View>
          )}

          {/* Selected Operation Summary */}
          {selectedOperation && (
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>Operation Summary</Text>
              <View style={styles.summaryCard}>
                {(() => {
                  const op = getOperationDetails(selectedOperation);
                  return op ? (
                    <>
                      <View style={styles.summaryHeader}>
                        <View style={[styles.summaryIcon, { backgroundColor: op.color }]}>
                          <MaterialIcons name={op.icon as any} size={16} color="#FFFFFF" />
                        </View>
                        <Text style={styles.summaryTitle}>{op.label}</Text>
                      </View>
                      <Text style={styles.summaryDescription}>{op.description}</Text>
                      {reason && (
                        <Text style={styles.summaryReason}>
                          Reason: {reason}
                        </Text>
                      )}
                    </>
                  ) : null;
                })()}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                (!selectedOperation || loading) && styles.buttonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!selectedOperation || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {selectedOperation ? 'Confirm Override' : 'Select Operation'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};