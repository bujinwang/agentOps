// Leads list screen with filtering and search

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';

import { Lead, LeadListParams, LeadStatus, LeadPriority } from '../../types';
import { apiService } from '../../services/api';
import { formatCurrency } from '../../utils/validation';

interface LeadsListScreenProps {
  navigation: any;
}

const LeadsListScreen: React.FC<LeadsListScreenProps> = ({ navigation }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | undefined>();
  const [selectedPriority, setSelectedPriority] = useState<LeadPriority | undefined>();

  const loadLeads = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const params: Partial<LeadListParams> = {
        page: 1,
        limit: 50,
        sortBy: 'created_at',
        sortOrder: 'DESC',
      };

      if (searchTerm.trim()) {
        params.searchTerm = searchTerm.trim();
      }

      if (selectedStatus) {
        params.status = selectedStatus;
      }

      if (selectedPriority) {
        params.priority = selectedPriority;
      }

      const response = await apiService.getLeads(params);
      setLeads(response.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load leads';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchTerm, selectedStatus, selectedPriority]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadLeads(true);
    });

    return unsubscribe;
  }, [navigation, loadLeads]);

  const handleRefresh = () => {
    loadLeads(true);
  };

  const navigateToDetail = (leadId: number) => {
    navigation.navigate('LeadDetail', { leadId });
  };

  const navigateToAddLead = () => {
    navigation.navigate('AddLead');
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

  const getPriorityColor = (priority: LeadPriority): string => {
    switch (priority) {
      case 'High': return '#F44336';
      case 'Medium': return '#FF9800';
      case 'Low': return '#4CAF50';
      default: return '#999';
    }
  };

  const renderLeadItem = ({ item }: { item: Lead }) => (
    <TouchableOpacity style={styles.leadCard} onPress={() => navigateToDetail(item.leadId)}>
      <View style={styles.leadHeader}>
        <Text style={styles.leadName}>
          {item.firstName} {item.lastName}
        </Text>
        <View style={styles.badges}>
          <Text style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
            {item.priority}
          </Text>
        </View>
      </View>

      <Text style={styles.leadEmail}>{item.email}</Text>
      
      {item.phoneNumber && (
        <Text style={styles.leadPhone}>{item.phoneNumber}</Text>
      )}

      {(item.budgetMin || item.budgetMax) && (
        <Text style={styles.leadBudget}>
          Budget: {formatCurrency(item.budgetMin || 0)} - {formatCurrency(item.budgetMax || 0)}
        </Text>
      )}

      {item.desiredLocation && (
        <Text style={styles.leadLocation}>📍 {item.desiredLocation}</Text>
      )}

      {item.aiSummary && (
        <Text style={styles.aiSummary} numberOfLines={2}>
          🤖 {item.aiSummary}
        </Text>
      )}

      <View style={styles.leadFooter}>
        <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          {item.status}
        </Text>
        <Text style={styles.createdDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Leads Found</Text>
      <Text style={styles.emptyStateText}>
        {searchTerm || selectedStatus || selectedPriority
          ? 'Try adjusting your filters or search terms'
          : 'Get started by adding your first lead'}
      </Text>
      <TouchableOpacity style={styles.addButton} onPress={navigateToAddLead}>
        <Text style={styles.addButtonText}>Add Your First Lead</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search and Filter Bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder=\"Search leads...\"
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoCapitalize=\"none\"
          autoCorrect={false}
        />
      </View>

      {/* Filter Pills */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filters:</Text>
        {/* Status Filter */}
        <TouchableOpacity
          style={[styles.filterPill, selectedStatus && styles.filterPillActive]}
          onPress={() => setSelectedStatus(selectedStatus ? undefined : 'New')}
        >
          <Text style={[styles.filterPillText, selectedStatus && styles.filterPillTextActive]}>
            {selectedStatus || 'Status'}
          </Text>
        </TouchableOpacity>
        {/* Priority Filter */}
        <TouchableOpacity
          style={[styles.filterPill, selectedPriority && styles.filterPillActive]}
          onPress={() => setSelectedPriority(selectedPriority ? undefined : 'High')}
        >
          <Text style={[styles.filterPillText, selectedPriority && styles.filterPillTextActive]}>
            {selectedPriority || 'Priority'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Leads List */}
      <FlatList
        data={leads}
        keyExtractor={(item) => item.leadId.toString()}
        renderItem={renderLeadItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fab} onPress={navigateToAddLead}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f9f9f9',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  filterPillActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filterPillText: {
    fontSize: 12,
    color: '#666',
  },
  filterPillTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
  },
  leadCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leadName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  leadEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  leadPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  leadBudget: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    marginBottom: 4,
  },
  leadLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  aiSummary: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
    lineHeight: 18,
  },
  leadFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  createdDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
  },
});

export default LeadsListScreen;