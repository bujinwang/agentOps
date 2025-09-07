// Lead detail screen with full information and actions

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { Lead, LeadStatus } from '../../types';
import { apiService } from '../../services/api';
import { formatCurrency, formatPhoneNumber } from '../../utils/validation';

interface LeadDetailScreenProps {
  route: {
    params: {
      leadId: number;
    };
  };
  navigation: any;
}

const LeadDetailScreen: React.FC<LeadDetailScreenProps> = ({ route, navigation }) => {
  const { leadId } = route.params;
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLeadDetail();
  }, [leadId]);

  const loadLeadDetail = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getLead(leadId);
      setLead(response.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load lead details';
      Alert.alert('Error', message, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = (newStatus: LeadStatus) => {
    Alert.alert(
      'Update Status',
      `Change lead status to "${newStatus}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: () => updateLeadStatus(newStatus),
        },
      ]
    );
  };

  const updateLeadStatus = async (newStatus: LeadStatus) => {
    if (!lead) return;

    try {
      await apiService.updateLeadStatus(leadId, newStatus);
      setLead(prev => prev ? { ...prev, status: newStatus } : null);
      Alert.alert('Success', 'Lead status updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update status';
      Alert.alert('Error', message);
    }
  };

  const navigateToEdit = () => {
    navigation.navigate('EditLead', { leadId });
  };

  const getStatusColor = (status: LeadStatus): string => {
    switch (status) {
      case 'New': return '#4CAF50';
      case 'Contacted': return '#FF9800';
      case 'Qualified': return '#2196F3';
      case 'Showing Scheduled': return '#9C27B0';
      case 'Offer Made': return '#FF5722';
      case 'Closed Won': return '#4CAF50';
      case 'Closed Lost': return '#F44336';
      case 'Archived': return '#999';
      default: return '#999';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'High': return '#F44336';
      case 'Medium': return '#FF9800';
      case 'Low': return '#4CAF50';
      default: return '#999';
    }
  };

  const statusOptions: LeadStatus[] = [
    'New',
    'Contacted',
    'Qualified',
    'Showing Scheduled',
    'Offer Made',
    'Closed Won',
    'Closed Lost',
    'Archived',
  ];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading lead details...</Text>
      </View>
    );
  }

  if (!lead) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Lead not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <Text style={styles.leadName}>
              {lead.firstName} {lead.lastName}
            </Text>
            <Text style={styles.leadEmail}>{lead.email}</Text>
            {lead.phoneNumber && (
              <Text style={styles.leadPhone}>
                {formatPhoneNumber(lead.phoneNumber)}
              </Text>
            )}
          </View>
          <View style={styles.headerBadges}>
            <Text style={[styles.priorityBadge, { backgroundColor: getPriorityColor(lead.priority) }]}>
              {lead.priority} Priority
            </Text>
          </View>
        </View>

        <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(lead.status) }]}>
          {lead.status}
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionCard}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={navigateToEdit}>
            <Text style={styles.actionButtonText}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📞 Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📧 Email</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Property Requirements */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Property Requirements</Text>
        
        {(lead.budgetMin || lead.budgetMax) && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Budget Range:</Text>
            <Text style={styles.infoValue}>
              {formatCurrency(lead.budgetMin || 0)} - {formatCurrency(lead.budgetMax || 0)}
            </Text>
          </View>
        )}

        {lead.desiredLocation && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Preferred Location:</Text>
            <Text style={styles.infoValue}>{lead.desiredLocation}</Text>
          </View>
        )}

        {lead.propertyType && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Property Type:</Text>
            <Text style={styles.infoValue}>{lead.propertyType}</Text>
          </View>
        )}

        {lead.bedroomsMin && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Min Bedrooms:</Text>
            <Text style={styles.infoValue}>{lead.bedroomsMin}</Text>
          </View>
        )}

        {lead.bathroomsMin && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Min Bathrooms:</Text>
            <Text style={styles.infoValue}>{lead.bathroomsMin}</Text>
          </View>
        )}
      </View>

      {/* AI Summary */}
      {lead.aiSummary && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🤖 AI Summary</Text>
          <Text style={styles.aiSummaryText}>{lead.aiSummary}</Text>
        </View>
      )}

      {/* Notes */}
      {lead.notes && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{lead.notes}</Text>
        </View>
      )}

      {/* Lead Information */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Lead Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Source:</Text>
          <Text style={styles.infoValue}>{lead.source}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Created:</Text>
          <Text style={styles.infoValue}>
            {new Date(lead.createdAt).toLocaleDateString()} at{' '}
            {new Date(lead.createdAt).toLocaleTimeString()}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Last Updated:</Text>
          <Text style={styles.infoValue}>
            {new Date(lead.updatedAt).toLocaleDateString()} at{' '}
            {new Date(lead.updatedAt).toLocaleTimeString()}
          </Text>
        </View>

        {lead.lastContactedAt && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Contacted:</Text>
            <Text style={styles.infoValue}>
              {new Date(lead.lastContactedAt).toLocaleDateString()}
            </Text>
          </View>
        )}

        {lead.followUpDate && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Follow Up Date:</Text>
            <Text style={styles.infoValue}>
              {new Date(lead.followUpDate).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      {/* Status Update */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Update Status</Text>
        <View style={styles.statusGrid}>
          {statusOptions.map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusOption,
                lead.status === status && styles.statusOptionActive,
              ]}
              onPress={() => handleStatusChange(status)}
              disabled={lead.status === status}
            >
              <Text
                style={[
                  styles.statusOptionText,
                  lead.status === status && styles.statusOptionTextActive,
                ]}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    color: '#f44336',
  },
  headerCard: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerBadges: {
    alignItems: 'flex-end',
  },
  leadName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  leadEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 2,
  },
  leadPhone: {
    fontSize: 16,
    color: '#666',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  actionCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  aiSummaryText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  notesText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusOption: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  statusOptionActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  statusOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusOptionTextActive: {
    color: '#fff',
  },
  bottomSpacer: {
    height: 32,
  },
});

export default LeadDetailScreen;