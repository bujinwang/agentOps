import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { Card, Button, Chip, IconButton, FAB, Searchbar, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import {
  PropertySearchQuery,
  SearchResult,
  SearchFacets,
  PropertySearchScreenProps,
  SearchSortBy,
  SearchSortOrder
} from '../types/search';
import { Property } from '../types/property';
import { searchAPIService } from '../services/searchApiService';

const PropertySearchScreen: React.FC<PropertySearchScreenProps> = ({
  initialQuery = {},
  showAdvancedFilters = true,
  enableSavedSearches = true,
  enableHistory = true,
  maxResultsPerPage = 20,
  onPropertySelect,
  onSearchExecute
}) => {
  const navigation = useNavigation();

  // Search state
  const [query, setQuery] = useState<PropertySearchQuery>({
    sortBy: 'relevance',
    sortOrder: 'desc',
    page: 1,
    limit: maxResultsPerPage,
    ...initialQuery
  });

  const [searchText, setSearchText] = useState(query.query || '');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [facets, setFacets] = useState<SearchFacets | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Execute search
  const executeSearch = useCallback(async (searchQuery: PropertySearchQuery = query) => {
    setIsLoading(true);
    setError(null);

    try {
      // Update query with current search text
      const updatedQuery = { ...searchQuery, query: searchText || undefined };

      const [searchResults, searchFacets] = await Promise.all([
        searchAPIService.searchProperties(updatedQuery),
        showAdvancedFilters ? searchAPIService.getSearchFacets(updatedQuery) : Promise.resolve(null)
      ]);

      setResults(searchResults);
      setFacets(searchFacets);
      setQuery(updatedQuery);

      // Notify parent component
      if (onSearchExecute) {
        onSearchExecute(updatedQuery, searchResults);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      setResults(null);
      setFacets(null);
    } finally {
      setIsLoading(false);
    }
  }, [query, searchText, showAdvancedFilters, onSearchExecute]);

  // Handle search text submission
  const handleSearchSubmit = useCallback(() => {
    executeSearch({ ...query, query: searchText, page: 1 });
  }, [executeSearch, query, searchText]);

  // Handle filter changes
  const handleFilterChange = useCallback((filterKey: keyof PropertySearchQuery, value: any) => {
    const updatedQuery = { ...query, [filterKey]: value, page: 1 };
    setQuery(updatedQuery);
    executeSearch(updatedQuery);
  }, [query, executeSearch]);

  // Handle sorting
  const handleSortChange = useCallback((sortBy: SearchSortBy, sortOrder: SearchSortOrder = 'desc') => {
    const updatedQuery = { ...query, sortBy, sortOrder, page: 1 };
    setQuery(updatedQuery);
    executeSearch(updatedQuery);
  }, [query, executeSearch]);

  // Handle pagination
  const handleLoadMore = useCallback(() => {
    if (results && results.hasMore && !isLoading) {
      const nextPage = (query.page || 1) + 1;
      const updatedQuery = { ...query, page: nextPage };
      setQuery(updatedQuery);
      executeSearch(updatedQuery);
    }
  }, [results, query, isLoading, executeSearch]);

  // Handle property selection
  const handlePropertyPress = useCallback((property: Property) => {
    if (onPropertySelect) {
      onPropertySelect(property);
    } else {
      // Default navigation to property detail
      (navigation as any).navigate('PropertyDetail', { propertyId: property.id });
    }
  }, [onPropertySelect, navigation]);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchText('');
    setQuery({
      sortBy: 'relevance',
      sortOrder: 'desc',
      page: 1,
      limit: maxResultsPerPage
    });
    setResults(null);
    setFacets(null);
    setError(null);
  }, [maxResultsPerPage]);

  // Initial search on mount if initial query provided
  useEffect(() => {
    if (Object.keys(initialQuery).length > 0) {
      executeSearch({ ...query, ...initialQuery });
    }
  }, []);

  // Render property item
  const renderPropertyItem = useCallback(({ item }: { item: Property }) => (
    <Card style={styles.propertyCard} onPress={() => handlePropertyPress(item)}>
      <Card.Cover
        source={{ uri: 'https://via.placeholder.com/300x200' }}
        style={styles.propertyImage}
      />
      <Card.Content style={styles.propertyContent}>
        <Text style={styles.propertyTitle} numberOfLines={2}>
          {item.title || `${item.property_type} Property`}
        </Text>
        <Text style={styles.propertyPrice}>
          ${item.price?.toLocaleString() || 'N/A'}
        </Text>
        <View style={styles.propertyDetails}>
          <Text style={styles.propertyDetail}>
            {item.details?.bedrooms || 0} bed • {item.details?.bathrooms || 0} bath
          </Text>
          <Text style={styles.propertyDetail}>
            {item.details?.square_feet?.toLocaleString() || 0} sqft
          </Text>
        </View>
        <Text style={styles.propertyAddress} numberOfLines={2}>
          {item.address?.street}, {item.address?.city}, {item.address?.state} {item.address?.zip_code}
        </Text>
      </Card.Content>
    </Card>
  ), [handlePropertyPress]);

  // Render filter chips
  const renderFilterChips = useCallback(() => {
    if (!facets) return null;

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
        {/* Property Types */}
        {facets.propertyTypes.slice(0, 5).map((type) => (
          <Chip
            key={type.value}
            mode={query.propertyTypes?.includes(type.value) ? 'flat' : 'outlined'}
            onPress={() => {
              const currentTypes = query.propertyTypes || [];
              const newTypes = currentTypes.includes(type.value)
                ? currentTypes.filter(t => t !== type.value)
                : [...currentTypes, type.value];
              handleFilterChange('propertyTypes', newTypes.length > 0 ? newTypes : undefined);
            }}
            style={styles.filterChip}
          >
            {type.label} ({type.count})
          </Chip>
        ))}

        {/* Price Ranges */}
        {facets.priceRanges.slice(0, 3).map((range) => (
          <Chip
            key={range.value}
            mode="outlined"
            onPress={() => {
              // Parse price range and apply filter
              const [min, max] = range.value.split('-').map(v => parseInt(v));
              handleFilterChange('priceRange', { min, max });
            }}
            style={styles.filterChip}
          >
            ${range.label} ({range.count})
          </Chip>
        ))}
      </ScrollView>
    );
  }, [facets, query.propertyTypes, handleFilterChange]);

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <Searchbar
          placeholder="Search properties, locations, features..."
          onChangeText={setSearchText}
          value={searchText}
          onSubmitEditing={handleSearchSubmit}
          style={styles.searchBar}
          loading={isLoading}
        />

        <View style={styles.headerActions}>
          <IconButton
            icon="filter-variant"
            onPress={() => setShowFilters(!showFilters)}
            style={styles.filterButton}
          />
          <IconButton
            icon="sort"
            onPress={() => {
              // Show sort options
              Alert.alert('Sort By', 'Choose sort option', [
                { text: 'Relevance', onPress: () => handleSortChange('relevance') },
                { text: 'Price: Low to High', onPress: () => handleSortChange('price_asc') },
                { text: 'Price: High to Low', onPress: () => handleSortChange('price_desc') },
                { text: 'Newest First', onPress: () => handleSortChange('date_desc') },
                { text: 'Largest First', onPress: () => handleSortChange('sqft_desc') },
                { text: 'Cancel', style: 'cancel' }
              ]);
            }}
          />
        </View>
      </View>

      {/* Filter Chips */}
      {showFilters && renderFilterChips()}

      {/* Advanced Filters */}
      {showAdvanced && showAdvancedFilters && (
        <Card style={styles.advancedFilters}>
          <Card.Title title="Advanced Filters" />
          <Card.Content>
            {/* Price Range */}
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Price Range:</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="Min"
                keyboardType="numeric"
                value={query.priceRange?.min?.toString() || ''}
                onChangeText={(text) => {
                  const min = text ? parseInt(text) : undefined;
                  handleFilterChange('priceRange', { ...query.priceRange, min });
                }}
              />
              <Text style={styles.filterSeparator}>-</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="Max"
                keyboardType="numeric"
                value={query.priceRange?.max?.toString() || ''}
                onChangeText={(text) => {
                  const max = text ? parseInt(text) : undefined;
                  handleFilterChange('priceRange', { ...query.priceRange, max });
                }}
              />
            </View>

            {/* Bedrooms */}
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Bedrooms:</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="Min"
                keyboardType="numeric"
                value={query.bedrooms?.min?.toString() || ''}
                onChangeText={(text) => {
                  const min = text ? parseInt(text) : undefined;
                  handleFilterChange('bedrooms', { ...query.bedrooms, min });
                }}
              />
            </View>

            {/* Bathrooms */}
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Bathrooms:</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="Min"
                keyboardType="numeric"
                value={query.bathrooms?.min?.toString() || ''}
                onChangeText={(text) => {
                  const min = text ? parseFloat(text) : undefined;
                  handleFilterChange('bathrooms', { ...query.bathrooms, min });
                }}
              />
            </View>

            <Button
              mode="outlined"
              onPress={handleClearSearch}
              style={styles.clearButton}
            >
              Clear All Filters
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Results Header */}
      {results && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {results.totalCount.toLocaleString()} properties found
          </Text>
          <TouchableOpacity onPress={() => setShowAdvanced(!showAdvanced)}>
            <Text style={styles.advancedToggle}>
              {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Error Display */}
      {error && (
        <Card style={styles.errorCard}>
          <Card.Content>
            <Text style={styles.errorText}>{error}</Text>
            <Button mode="outlined" onPress={handleSearchSubmit}>
              Try Again
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Loading Indicator */}
      {isLoading && !results && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Searching properties...</Text>
        </View>
      )}

      {/* Search Results */}
      {results && (
        <FlatList
          data={results.properties}
          renderItem={renderPropertyItem}
          keyExtractor={(item) => item.id.toString()}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoading ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#2196F3" />
                <Text style={styles.loadingMoreText}>Loading more...</Text>
              </View>
            ) : null
          }
          style={styles.resultsList}
        />
      )}

      {/* Empty State */}
      {results && results.properties.length === 0 && !isLoading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No properties found</Text>
          <Text style={styles.emptySubtitle}>
            Try adjusting your search criteria or filters
          </Text>
          <Button mode="outlined" onPress={handleClearSearch}>
            Clear Search
          </Button>
        </View>
      )}

      {/* FAB for new search */}
      <FAB
        icon="magnify"
        style={styles.fab}
        onPress={() => {
          // Reset to initial state
          handleClearSearch();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    elevation: 4,
  },
  searchBar: {
    flex: 1,
    marginRight: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  filterButton: {
    margin: 0,
  },
  filterChips: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  filterChip: {
    marginRight: 8,
  },
  advancedFilters: {
    margin: 16,
    elevation: 4,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterLabel: {
    width: 100,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  filterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginHorizontal: 4,
    fontSize: 14,
  },
  filterSeparator: {
    fontSize: 16,
    color: '#666',
    marginHorizontal: 4,
  },
  clearButton: {
    marginTop: 8,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  resultsCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  advancedToggle: {
    fontSize: 14,
    color: '#2196F3',
    textDecorationLine: 'underline',
  },
  errorCard: {
    margin: 16,
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
    borderWidth: 1,
  },
  errorText: {
    color: '#F44336',
    marginBottom: 12,
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
  resultsList: {
    flex: 1,
    padding: 16,
  },
  propertyCard: {
    marginBottom: 12,
    elevation: 2,
  },
  propertyImage: {
    height: 200,
  },
  propertyContent: {
    padding: 12,
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  propertyPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  propertyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  propertyDetail: {
    fontSize: 14,
    color: '#666',
  },
  propertyAddress: {
    fontSize: 14,
    color: '#666',
  },
  loadingMore: {
    padding: 16,
    alignItems: 'center',
  },
  loadingMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
});

export default PropertySearchScreen;