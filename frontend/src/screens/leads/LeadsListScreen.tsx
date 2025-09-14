// Leads list screen with enhanced Material Design BMAD principles

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
import { BusinessIcon } from '../../components/MaterialIcon';
import { LeadListSkeleton } from '../../components/common/SkeletonList';
import { useLoadingState } from '../../utils/loadingState';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | undefined>();
  const [selectedPriority, setSelectedPriority] = useState<LeadPriority | undefined>();
  const [selectedScoreCategory, setSelectedScoreCategory] = useState<'High' | 'Medium' | 'Low' | undefined>();
  const [sortBy, setSortBy] = useState<'created_at' | 'score' | 'priority'>('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Enhanced loading state management
  const loadingState = useLoadingState();
  const refreshLoadingState = useLoadingState();

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.titleContainer}>
          <BusinessIcon
            name="people"
            size={24}
            color={MaterialColors.primary[600]}
            state="active"
          />
          <Text style={styles.headerTitle}>Leads</Text>
        </View>
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {leads.length} {leads.length === 1 ? 'lead' : 'leads'}
            {(selectedStatus || selectedPriority || selectedScoreCategory || searchTerm) && (
              <Text style={styles.filteredText}> (filtered)</Text>
            )}
          </Text>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => {
              const sortOptions = [
                { label: 'Newest First', value: 'created_at', order: 'DESC' },
                { label: 'Oldest First', value: 'created_at', order: 'ASC' },
                { label: 'Highest Score', value: 'score', order: 'DESC' },
                { label: 'Lowest Score', value: 'score', order: 'ASC' },
                { label: 'Highest Priority', value: 'priority', order: 'DESC' },
                { label: 'Lowest Priority', value: 'priority', order: 'ASC' },
              ];
              // For now, cycle through sort options
              const currentIndex = sortOptions.findIndex(
                option => option.value === sortBy && option.order === sortOrder
              );
              const nextIndex = (currentIndex + 1) % sortOptions.length;
              const nextOption = sortOptions[nextIndex];
              setSortBy(nextOption.value as any);
              setSortOrder(nextOption.order as any);
            }}
          >
            <BusinessIcon
              name="sort"
              size={20}
              color={MaterialColors.primary[600]}
              state="active"
            />
            <Text style={styles.sortButtonText}>
              {sortBy === 'created_at' && sortOrder === 'DESC' && 'Newest'}
              {sortBy === 'created_at' && sortOrder === 'ASC' && 'Oldest'}
              {sortBy === 'score' && sortOrder === 'DESC' && 'High Score'}
              {sortBy === 'score' && sortOrder === 'ASC' && 'Low Score'}
              {sortBy === 'priority' && sortOrder === 'DESC' && 'High Priority'}
              {sortBy === 'priority' && sortOrder === 'ASC' && 'Low Priority'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const loadLeads = useCallback(async (refresh = false) => {
    const currentLoadingState = refresh ? refreshLoadingState : loadingState;

    currentLoadingState.startLoading(refresh ? 'Refreshing leads...' : 'Loading leads...');

    try {
      const params: Partial<LeadListParams> = {
        page: 1,
        limit: 50,
        sortBy: sortBy,
        sortOrder: sortOrder,
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

      if (selectedScoreCategory) {
        params.scoreCategory = selectedScoreCategory;
      }

      const response = await apiService.getLeadsWithLoading(params, {
        onStart: currentLoadingState.startLoading,
        onProgress: currentLoadingState.updateProgress,
        onComplete: currentLoadingState.stopLoading,
        onError: currentLoadingState.setError,
      });

      if (response) {
        setLeads(response.data);
        currentLoadingState.stopLoading();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load leads';
      currentLoadingState.setError(message);
      Alert.alert('Error', message);
    }
  }, [searchTerm, selectedStatus, selectedPriority, selectedScoreCategory, sortBy, sortOrder, loadingState, refreshLoadingState]);

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
    setSelectedScoreCategory(undefined);
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
      <View style={styles.emptyStateIcon}>
        <BusinessIcon
          name={searchTerm || selectedStatus || selectedPriority || selectedScoreCategory ? "search_off" : "people_outline"}
          size={48}
          color={MaterialColors.neutral[400]}
          state="inactive"
        />
      </View>
      <Text style={styles.emptyStateTitle}>
        {searchTerm || selectedStatus || selectedPriority || selectedScoreCategory ? 'No Matching Leads' : 'No Leads Yet'}
      </Text>
      <Text style={styles.emptyStateText}>
        {searchTerm || selectedStatus || selectedPriority || selectedScoreCategory
          ? 'Try adjusting your filters, search terms, or score categories to find what you\'re looking for'
          : 'Start building your lead database by adding your first lead'}
      </Text>
      <TouchableOpacity style={styles.addButton} onPress={navigateToAddLead}>
        <BusinessIcon
          name="add"
          size={20}
          color={MaterialColors.onSecondary}
          state="active"
        />
        <Text style={styles.addButtonText}>
          {searchTerm || selectedStatus || selectedPriority || selectedScoreCategory ? 'Add New Lead' : 'Add Your First Lead'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <BusinessIcon
        name="search"
        size={20}
        color={MaterialColors.neutral[500]}
        state="inactive"
      />
      <TextInput
        style={styles.searchInput}
        placeholder="Search leads by name, email, or location..."
        placeholderTextColor={MaterialColors.neutral[500]}
        value={searchTerm}
        onChangeText={setSearchTerm}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {searchTerm ? (
        <TouchableOpacity
          onPress={() => setSearchTerm('')}
          style={styles.searchClearButton}
        >
          <BusinessIcon
            name="clear"
            size={18}
            color={MaterialColors.neutral[500]}
            state="active"
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const renderFilterChips = () => {
    const statusOptions: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Showing Scheduled', 'Offer Made', 'Closed Won'];
    const priorityOptions: LeadPriority[] = ['High', 'Medium', 'Low'];
    const scoreCategoryOptions: ('High' | 'Medium' | 'Low')[] = ['High', 'Medium', 'Low'];

    const getStatusIcon = (status: LeadStatus): string => {
      const icons = {
        'New': 'fiber_new',
        'Contacted': 'phone',
        'Qualified': 'check_circle',
        'Showing Scheduled': 'schedule',
        'Offer Made': 'local_offer',
        'Closed Won': 'celebration',
      };
      return icons[status] || 'help';
    };

    const getPriorityIcon = (priority: LeadPriority): string => {
      const icons = {
        'High': 'priority_high',
        'Medium': 'remove',
        'Low': 'arrow_downward',
      };
      return icons[priority] || 'help';
    };

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
              <BusinessIcon
                name={getStatusIcon(status)}
                size={16}
                color={selectedStatus === status ? MaterialColors.onPrimary : MaterialColors.neutral[600]}
                state={selectedStatus === status ? "active" : "inactive"}
              />
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
              <BusinessIcon
                name={getPriorityIcon(priority)}
                size={16}
                color={selectedPriority === priority ? MaterialColors.onSecondary : MaterialColors.neutral[600]}
                state={selectedPriority === priority ? "active" : "inactive"}
              />
              <Text style={[
                styles.filterChipText,
                selectedPriority === priority && styles.filterChipTextActive
              ]}>
                {priority}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Score Category Chips */}
          {scoreCategoryOptions.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterChip,
                selectedScoreCategory === category && styles.filterChipActive,
                { backgroundColor: selectedScoreCategory === category ? MaterialColors.primary[500] : MaterialColors.neutral[100] }
              ]}
              onPress={() => setSelectedScoreCategory(selectedScoreCategory === category ? undefined : category)}
            >
              <BusinessIcon
                name="star"
                size={16}
                color={selectedScoreCategory === category ? MaterialColors.onPrimary : MaterialColors.neutral[600]}
                state={selectedScoreCategory === category ? "active" : "inactive"}
              />
              <Text style={[
                styles.filterChipText,
                selectedScoreCategory === category && styles.filterChipTextActive
              ]}>
                {category} Score
              </Text>
            </TouchableOpacity>
          ))}

          {/* Clear Filters Button */}
          {(selectedStatus || selectedPriority || selectedScoreCategory || searchTerm) && (
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: MaterialColors.error[100] }]}
              onPress={clearFilters}
            >
              <BusinessIcon
                name="clear_all"
                size={16}
                color={MaterialColors.error[700]}
                state="active"
              />
              <Text style={[styles.clearButtonText, { color: MaterialColors.error[700] }]}>
                Clear
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  };

  if (loadingState.isLoading && leads.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        {renderSearchBar()}
        {renderFilterChips()}
        <LeadListSkeleton count={5} animated={true} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Title and Stats */}
      {renderHeader()}

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
          <RefreshControl refreshing={refreshLoadingState.isLoading} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={!loadingState.isLoading ? renderEmptyState : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.md,
    backgroundColor: MaterialColors.surface,
    ...MaterialElevation.level1,
    marginHorizontal: MaterialSpacing.sm,
    marginBottom: MaterialSpacing.sm,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    ...MaterialTypography.bodyLarge,
    backgroundColor: 'transparent',
    paddingHorizontal: MaterialSpacing.sm,
    paddingVertical: MaterialSpacing.sm,
    color: MaterialColors.neutral[900],
  },
  searchClearButton: {
    padding: MaterialSpacing.xs,
    marginLeft: MaterialSpacing.xs,
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
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: MaterialSpacing.xs,
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
  emptyStateIcon: {
    marginBottom: MaterialSpacing.lg,
    padding: MaterialSpacing.lg,
    backgroundColor: MaterialColors.neutral[100],
    borderRadius: 48,
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
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: MaterialSpacing.sm,
  },
  header: {
    backgroundColor: MaterialColors.surface,
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.lg,
    ...MaterialElevation.level2,
    marginBottom: MaterialSpacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    ...MaterialTypography.headlineSmall,
    color: MaterialColors.neutral[900],
    marginLeft: MaterialSpacing.sm,
    fontWeight: '600',
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: MaterialSpacing.sm,
    paddingVertical: MaterialSpacing.xs,
    backgroundColor: MaterialColors.neutral[100],
    borderRadius: 16,
    marginTop: MaterialSpacing.xs,
  },
  sortButtonText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.primary[600],
    fontWeight: '600',
    marginLeft: MaterialSpacing.xs,
  },
  statsText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
  },
  filteredText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.primary[600],
    fontWeight: '500',
  },
});

export default LeadsListScreen;