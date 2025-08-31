import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { apiService } from '../../services/api';
import { Lead, Task, LeadStatus, LeadPriority, TaskPriority } from '../../types';
import { formatCurrency, formatDate, getRelativeTime } from '../../utils/validation';

interface SearchScreenProps {
  navigation: any;
}

type SearchType = 'leads' | 'tasks';

interface SearchFilters {
  leads: {
    status?: LeadStatus;
    priority?: LeadPriority;
    source?: string;
  };
  tasks: {
    completed?: boolean;
    priority?: TaskPriority;
    leadId?: number;
  };
}

const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('leads');
  const [searchResults, setSearchResults] = useState<(Lead | Task)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    leads: {},
    tasks: {},
  });
  const [showFilters, setShowFilters] = useState(false);

  const performSearch = useCallback(async (query: string, refresh = false) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      let results;
      
      if (searchType === 'leads') {
        const response = await apiService.searchLeads(query, filters.leads);
        results = response.data || [];
      } else {
        const response = await apiService.searchTasks(query, filters.tasks);
        results = response.data || [];
      }
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchType, filters]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  const handleRefresh = () => {
    if (searchQuery.trim()) {
      performSearch(searchQuery, true);
    }
  };

  const handleFilterChange = (type: SearchType, key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [key]: value,
      },
    }));
  };

  const clearFilters = () => {
    setFilters({
      leads: {},
      tasks: {},
    });
  };

  const getActiveFiltersCount = () => {
    const currentFilters = filters[searchType];
    return Object.values(currentFilters).filter(value => 
      value !== undefined && value !== null && value !== ''
    ).length;
  };

  const renderSearchTypeToggle = () => (
    <View style={styles.searchTypeToggle}>
      <TouchableOpacity
        style={[styles.searchTypeButton, searchType === 'leads' && styles.searchTypeButtonActive]}
        onPress={() => setSearchType('leads')}
      >
        <Text style={[styles.searchTypeButtonText, searchType === 'leads' && styles.searchTypeButtonTextActive]}>
          Leads
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.searchTypeButton, searchType === 'tasks' && styles.searchTypeButtonActive]}
        onPress={() => setSearchType('tasks')}
      >
        <Text style={[styles.searchTypeButtonText, searchType === 'tasks' && styles.searchTypeButtonTextActive]}>
          Tasks
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <View style={styles.filtersContainer}>
        {searchType === 'leads' ? (
          <View style={styles.filtersContent}>
            <View style={styles.filterRow}>
              <View style={styles.filterHalf}>
                <Text style={styles.filterLabel}>Status</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={filters.leads.status}
                    onValueChange={(value) => handleFilterChange('leads', 'status', value)}
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
                    selectedValue={filters.leads.priority}
                    onValueChange={(value) => handleFilterChange('leads', 'priority', value)}
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
                <Text style={styles.filterLabel}>Source</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={filters.leads.source}
                    onValueChange={(value) => handleFilterChange('leads', 'source', value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="All Sources" value={undefined} />
                    <Picker.Item label="Website Form" value="Website Form" />
                    <Picker.Item label="Facebook Ad" value="Facebook Ad" />
                    <Picker.Item label="Google Ad" value="Google Ad" />
                    <Picker.Item label="Referral" value="Referral" />
                    <Picker.Item label="Walk-in" value="Walk-in" />
                    <Picker.Item label="Cold Call" value="Cold Call" />
                  </Picker>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.filtersContent}>
            <View style={styles.filterRow}>
              <View style={styles.filterHalf}>
                <Text style={styles.filterLabel}>Status</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={filters.tasks.completed}
                    onValueChange={(value) => handleFilterChange('tasks', 'completed', value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="All Tasks" value={undefined} />
                    <Picker.Item label="Pending" value={false} />
                    <Picker.Item label="Completed" value={true} />
                  </Picker>
                </View>
              </View>

              <View style={styles.filterHalf}>
                <Text style={styles.filterLabel}>Priority</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={filters.tasks.priority}
                    onValueChange={(value) => handleFilterChange('tasks', 'priority', value)}
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
          </View>
        )}

        <View style={styles.filterActions}>
          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
            <Text style={styles.clearFiltersText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderLeadItem = ({ item }: { item: Lead }) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => navigation.navigate('LeadDetail', { leadId: item.leadId })}
    >
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>
          {item.firstName} {item.lastName}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getLeadStatusColor(item.status) }]}>
          <Text style={styles.statusBadgeText}>{item.status}</Text>
        </View>
      </View>
      
      <Text style={styles.resultSubtitle}>{item.email}</Text>
      
      <View style={styles.resultDetails}>
        <Text style={styles.resultDetail}>📞 {item.phoneNumber || 'No phone'}</Text>
        <Text style={styles.resultDetail}>📍 {item.desiredLocation || 'No location'}</Text>
        <Text style={styles.resultDetail}>💰 {item.budgetMin && item.budgetMax 
          ? `${formatCurrency(item.budgetMin)} - ${formatCurrency(item.budgetMax)}` 
          : 'Budget not specified'}</Text>
      </View>
      
      <View style={styles.resultFooter}>
        <Text style={styles.resultSource}>Source: {item.source}</Text>
        <Text style={styles.resultDate}>Created {formatDate(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderTaskItem = ({ item }: { item: Task }) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => navigation.navigate('TaskDetail', { taskId: item.taskId })}
    >
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>{item.title}</Text>
        <View style={[styles.priorityBadge, { backgroundColor: getTaskPriorityColor(item.priority) }]}>
          <Text style={styles.priorityBadgeText}>{item.priority}</Text>
        </View>
      </View>
      
      {item.description && (
        <Text style={styles.resultDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      
      <View style={styles.resultDetails}>
        {item.dueDate && (
          <Text style={[styles.resultDetail, isOverdue(item.dueDate) && styles.overdueText]}>
            📅 Due {formatDate(item.dueDate)}
          </Text>
        )}
        <Text style={styles.resultDetail}>
          {item.completed ? '✅ Completed' : '⏳ Pending'}
        </Text>
      </View>
      
      <View style={styles.resultFooter}>
        <Text style={styles.resultDate}>Created {formatDate(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  const getLeadStatusColor = (status: string): string => {
    switch (status) {
      case 'New': return '#FF9800';
      case 'Contacted': return '#2196F3';
      case 'Qualified': return '#9C27B0';
      case 'Showing Scheduled': return '#607D8B';
      case 'Offer Made': return '#FF5722';
      case 'Closed Won': return '#4CAF50';
      case 'Closed Lost': return '#f44336';
      default: return '#666';
    }
  };

  const getTaskPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'High': return '#f44336';
      case 'Medium': return '#FF9800';
      case 'Low': return '#4CAF50';
      default: return '#666';
    }
  };

  const isOverdue = (dueDate: string): boolean => {
    return new Date(dueDate) < new Date();
  };

  const renderEmptyState = () => {
    if (!searchQuery.trim()) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🔍</Text>
          <Text style={styles.emptyStateTitle}>Start Searching</Text>
          <Text style={styles.emptyStateText}>
            Enter a search term to find {searchType === 'leads' ? 'leads' : 'tasks'}
          </Text>
        </View>
      );
    }

    if (searchResults.length === 0 && !isLoading) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📭</Text>
          <Text style={styles.emptyStateTitle}>No Results Found</Text>
          <Text style={styles.emptyStateText}>
            No {searchType} found matching "{searchQuery}"
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
        <Text style={styles.headerSubtitle}>Find leads and tasks quickly</Text>
      </View>

      {/* Search Type Toggle */}
      {renderSearchTypeToggle()}

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${searchType}...`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Toggle */}
        <TouchableOpacity
          style={[styles.filterToggle, getActiveFiltersCount() > 0 && styles.filterToggleActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterToggleText}>
            🔧 {getActiveFiltersCount() > 0 ? `Filters (${getActiveFiltersCount()})` : 'Filters'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      {renderFilters()}

      {/* Results */}
      {isLoading && searchResults.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => 
            searchType === 'leads' 
              ? (item as Lead).leadId.toString() 
              : (item as Task).taskId.toString()
          }
          renderItem={searchType === 'leads' ? renderLeadItem : renderTaskItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  searchTypeToggle: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchTypeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  searchTypeButtonActive: {
    backgroundColor: '#2196F3',
  },
  searchTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  searchTypeButtonTextActive: {
    color: '#fff',
  },
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
  },
  clearSearchButton: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 16,
    color: '#666',
  },
  filterToggle: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterToggleActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
  },
  filterToggleText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filtersContent: {
    marginBottom: 16,
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
    height: 40,
  },
  filterActions: {
    alignItems: 'center',
  },
  clearFiltersButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f44336',
    borderRadius: 6,
  },
  clearFiltersText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#2196F3',
    marginBottom: 8,
  },
  resultDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  resultDetails: {
    marginBottom: 8,
  },
  resultDetail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  overdueText: {
    color: '#f44336',
    fontWeight: '500',
  },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultSource: {
    fontSize: 12,
    color: '#999',
  },
  resultDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
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
    paddingHorizontal: 32,
    lineHeight: 24,
  },
});

export default SearchScreen;