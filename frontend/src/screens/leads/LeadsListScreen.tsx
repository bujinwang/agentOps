// Leads list screen with Material Design BMAD principles

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
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

import { Lead, LeadListParams, LeadStatus, LeadPriority } from '../../types';
import { apiService } from '../../services/api';
import { formatCurrency } from '../../utils/validation';
import MaterialLeadCard from '../../components/MaterialLeadCard';
import MaterialFAB from '../../components/MaterialFAB';
import { 
  MaterialColors, 
  MaterialElevation, 
  MaterialSpacing, 
  MaterialTypography 
} from '../../styles/MaterialDesign';

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

  const clearFilters = () => {
    setSelectedStatus(undefined);
    setSelectedPriority(undefined);
    setSearchTerm('');
  };

  const renderLeadItem = ({ item }: { item: Lead }) => (
    <MaterialLeadCard
      lead={item}
      onPress={() => navigateToDetail(item.leadId)}
      elevation={1}
    />
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

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search leads by name, email, or location..."
        placeholderTextColor={MaterialColors.neutral[500]}
        value={searchTerm}
        onChangeText={setSearchTerm}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );

  const renderFilterChips = () => {
    const statusOptions: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Showing Scheduled', 'Offer Made', 'Closed Won'];
    const priorityOptions: LeadPriority[] = ['High', 'Medium', 'Low'];

    return (
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {/* Status Chips */}
          {statusOptions.map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                selectedStatus === status && styles.filterChipActive,
                { backgroundColor: selectedStatus === status ? MaterialColors.primary[500] : MaterialColors.neutral[100] }
              ]}
              onPress={() => setSelectedStatus(selectedStatus === status ? undefined : status)}
            >
              <Text style={[
                styles.filterChipText,
                selectedStatus === status && styles.filterChipTextActive
              ]}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
          
          {/* Priority Chips */}
          {priorityOptions.map(priority => (
            <TouchableOpacity
              key={priority}
              style={[
                styles.filterChip,
                selectedPriority === priority && styles.filterChipActive,
                { backgroundColor: selectedPriority === priority ? MaterialColors.secondary[500] : MaterialColors.neutral[100] }
              ]}
              onPress={() => setSelectedPriority(selectedPriority === priority ? undefined : priority)}
            >
              <Text style={[
                styles.filterChipText,
                selectedPriority === priority && styles.filterChipTextActive
              ]}>
                {priority}
              </Text>
            </TouchableOpacity>
          ))}
          
          {/* Clear Filters Button */}
          {(selectedStatus || selectedPriority || searchTerm) && (
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: MaterialColors.error[100] }]}
              onPress={clearFilters}
            >
              <Text style={[styles.clearButtonText, { color: MaterialColors.error[700] }]}>
                Clear Filters
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  };

  if (isLoading && leads.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={MaterialColors.primary[500]} />
        <Text style={styles.loadingText}>Loading leads...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      {renderSearchBar()}
      
      {/* Filter Chips */}
      {renderFilterChips()}

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

      {/* Material Design FAB */}
      <MaterialFAB
        icon="+"
        onPress={navigateToAddLead}
        color={MaterialColors.secondary[500]}
        size="medium"
        position="bottom-right"
        visible={true}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MaterialColors.neutral[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: MaterialColors.neutral[50],
  },
  loadingText: {
    marginTop: MaterialSpacing.md,
    ...MaterialTypography.bodyLarge,
    color: MaterialColors.neutral[600],
  },
  searchContainer: {
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.md,
    backgroundColor: MaterialColors.surface,
    ...MaterialElevation.level1,
  },
  searchInput: {
    ...MaterialTypography.bodyLarge,
    backgroundColor: MaterialColors.neutral[100],
    borderRadius: 12,
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    color: MaterialColors.neutral[900],
  },
  filterContainer: {
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    backgroundColor: MaterialColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: MaterialColors.neutral[200],
  },
  filterScroll: {
    paddingVertical: MaterialSpacing.xs,
  },
  filterChip: {
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    borderRadius: 16,
    marginRight: MaterialSpacing.sm,
    backgroundColor: MaterialColors.neutral[100],
  },
  filterChipActive: {
    backgroundColor: MaterialColors.primary[500],
  },
  filterChipText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.neutral[700],
  },
  filterChipTextActive: {
    color: MaterialColors.onPrimary,
  },
  clearButton: {
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    borderRadius: 16,
    marginLeft: MaterialSpacing.sm,
  },
  clearButtonText: {
    ...MaterialTypography.labelMedium,
    fontWeight: '600',
  },
  listContainer: {
    paddingVertical: MaterialSpacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    ...MaterialTypography.headlineSmall,
    color: MaterialColors.neutral[800],
    marginBottom: MaterialSpacing.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
    textAlign: 'center',
    marginBottom: MaterialSpacing.xl,
  },
  addButton: {
    backgroundColor: MaterialColors.secondary[500],
    paddingHorizontal: MaterialSpacing.xl,
    paddingVertical: MaterialSpacing.md,
    borderRadius: 12,
    ...MaterialElevation.level2,
  },
  addButtonText: {
    ...MaterialTypography.labelLarge,
    color: MaterialColors.onSecondary,
    fontWeight: '600',
  },
});

export default LeadsListScreen;