import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useProperties } from '../hooks/useProperties';
import PropertyCard from './PropertyCard';
import { Property, PropertySearchFilters } from '../types/property';

interface PropertyListProps {
  onPropertyPress: (property: Property) => void;
  onCreateProperty?: () => void;
  onEditProperty?: (property: Property) => void;
  onDeleteProperty?: (property: Property) => void;
  showActions?: boolean;
  initialFilters?: PropertySearchFilters;
}

const PropertyList: React.FC<PropertyListProps> = ({
  onPropertyPress,
  onCreateProperty,
  onEditProperty,
  onDeleteProperty,
  showActions = false,
  initialFilters
}) => {
  const {
    properties,
    isLoading,
    error,
    pagination,
    loadProperties,
    searchProperties,
    deleteProperty,
    clearError
  } = useProperties({
    autoLoad: true,
    filters: initialFilters
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        const filters: PropertySearchFilters = {
          ...initialFilters,
          // Simple search across title, address, and description
          // In a real implementation, this would be handled by the backend
        };
        searchProperties(filters);
      } else if (initialFilters) {
        searchProperties(initialFilters);
      } else {
        loadProperties(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, initialFilters, searchProperties, loadProperties]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadProperties(1, initialFilters);
    setIsRefreshing(false);
  };

  const handleLoadMore = () => {
    if (pagination?.hasMore && !isLoading) {
      loadProperties(pagination.page + 1, initialFilters);
    }
  };

  const handleDeletePress = (property: Property) => {
    Alert.alert(
      'Delete Property',
      `Are you sure you want to delete "${property.title || 'this property'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteProperty(property.id);
            if (success && onDeleteProperty) {
              onDeleteProperty(property);
            }
          }
        }
      ]
    );
  };

  const renderPropertyCard = ({ item }: { item: Property }) => (
    <PropertyCard
      property={item}
      onPress={() => onPropertyPress(item)}
      onEdit={onEditProperty ? () => onEditProperty(item) : undefined}
      onDelete={showActions ? () => handleDeletePress(item) : undefined}
      showActions={showActions}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.title}>Properties</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowSearch(!showSearch)}
          >
            <MaterialIcons
              name={showSearch ? "search-off" : "search"}
              size={24}
              color="#666"
            />
          </TouchableOpacity>
          {onCreateProperty && (
            <TouchableOpacity
              style={[styles.iconButton, styles.createButton]}
              onPress={onCreateProperty}
            >
              <MaterialIcons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showSearch && (
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search properties..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery ? (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <MaterialIcons name="clear" size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* Results summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          {properties.length} propert{properties.length !== 1 ? 'ies' : 'y'} found
          {pagination?.totalCount && pagination.totalCount !== properties.length &&
            ` (showing ${properties.length} of ${pagination.totalCount})`
          }
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="home" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No properties found' : 'No properties yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? 'Try adjusting your search criteria'
          : 'Create your first property to get started'
        }
      </Text>
      {!searchQuery && onCreateProperty && (
        <TouchableOpacity
          style={styles.emptyActionButton}
          onPress={onCreateProperty}
        >
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.emptyActionText}>Add Property</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!pagination?.hasMore) return null;

    return (
      <View style={styles.footer}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={handleLoadMore}
          >
            <Text style={styles.loadMoreText}>Load More</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderError = () => {
    if (!error) return null;

    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={48} color="#ff4444" />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <View style={styles.errorActions}>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              clearError();
              loadProperties(1, initialFilters);
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Memoized data for performance
  const memoizedData = useMemo(() => properties, [properties]);

  return (
    <View style={styles.container}>
      <FlatList
        data={memoizedData}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPropertyCard}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={isLoading ? null : renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />

      {/* Loading overlay */}
      {isLoading && properties.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading properties...</Text>
        </View>
      )}

      {/* Error overlay */}
      {renderError()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: '#007AFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  summaryContainer: {
    marginTop: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PropertyList;