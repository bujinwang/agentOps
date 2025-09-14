import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share
} from 'react-native';
import { Card, Button, Chip, IconButton, Menu, Divider } from 'react-native-paper';
import { SearchResultsProps, SearchSortBy, SearchSortOrder } from '../types/search';
import { Property } from '../types/property';

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  isLoading,
  error,
  onLoadMore,
  onSortChange,
  onPropertyPress,
  showMapView = false,
  onToggleMapView
}) => {
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [selectedSortBy, setSelectedSortBy] = useState<SearchSortBy>('relevance');
  const [selectedSortOrder, setSelectedSortOrder] = useState<SearchSortOrder>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const handleSortChange = useCallback((sortBy: SearchSortBy, sortOrder: SearchSortOrder = 'desc') => {
    setSelectedSortBy(sortBy);
    setSelectedSortOrder(sortOrder);
    setSortMenuVisible(false);
    onSortChange?.(sortBy, sortOrder);
  }, [onSortChange]);

  const handleShareResults = useCallback(async () => {
    if (!results) return;

    try {
      const message = `Found ${results.totalCount} properties matching your search criteria. Check out these amazing listings!`;
      await Share.share({
        message,
        title: 'Property Search Results'
      });
    } catch (error) {
      console.error('Error sharing results:', error);
    }
  }, [results]);

  const getSortLabel = (sortBy: SearchSortBy, sortOrder: SearchSortOrder) => {
    const labels: Record<SearchSortBy, string> = {
      relevance: 'Relevance',
      price_asc: 'Price: Low to High',
      price_desc: 'Price: High to Low',
      date_desc: 'Newest First',
      date_asc: 'Oldest First',
      sqft_desc: 'Largest First',
      sqft_asc: 'Smallest First'
    };
    return labels[sortBy] || 'Relevance';
  };

  const formatPrice = (price?: number) => {
    if (!price) return 'Contact Agent';
    return `$${price.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const renderPropertyCard = useCallback(({ item }: { item: Property }) => (
    <Card style={styles.propertyCard} onPress={() => onPropertyPress?.(item)}>
      <Card.Cover
        source={{ uri: 'https://via.placeholder.com/300x200?text=Property+Image' }}
        style={styles.propertyImage}
      />
      <Card.Content style={styles.propertyContent}>
        <View style={styles.propertyHeader}>
          <Text style={styles.propertyTitle} numberOfLines={2}>
            {item.title || `${item.property_type} Property`}
          </Text>
          <Text style={styles.propertyPrice}>
            {formatPrice(item.price)}
          </Text>
        </View>

        <View style={styles.propertyDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Beds:</Text>
            <Text style={styles.detailValue}>{item.details?.bedrooms || 0}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Baths:</Text>
            <Text style={styles.detailValue}>{item.details?.bathrooms || 0}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Sqft:</Text>
            <Text style={styles.detailValue}>
              {item.details?.square_feet?.toLocaleString() || 'N/A'}
            </Text>
          </View>
        </View>

        <Text style={styles.propertyAddress} numberOfLines={2}>
          {item.address?.street}, {item.address?.city}, {item.address?.state} {item.address?.zip_code}
        </Text>

        <View style={styles.propertyMeta}>
          <Text style={styles.propertyDate}>
            Listed {formatDate(item.created_at)}
          </Text>
          {item.mls_number && (
            <Chip mode="outlined" style={styles.mlsChip}>
              MLS: {item.mls_number}
            </Chip>
          )}
        </View>
      </Card.Content>
    </Card>
  ), [onPropertyPress]);

  const renderGridPropertyCard = useCallback(({ item }: { item: Property }) => (
    <TouchableOpacity
      style={styles.gridPropertyCard}
      onPress={() => onPropertyPress?.(item)}
    >
      <Card style={styles.gridCard}>
        <Card.Cover
          source={{ uri: 'https://via.placeholder.com/150x100?text=Property' }}
          style={styles.gridImage}
        />
        <Card.Content style={styles.gridContent}>
          <Text style={styles.gridTitle} numberOfLines={1}>
            {item.title || `${item.property_type}`}
          </Text>
          <Text style={styles.gridPrice}>
            {formatPrice(item.price)}
          </Text>
          <Text style={styles.gridDetails}>
            {item.details?.bedrooms || 0}bd • {item.details?.bathrooms || 0}ba
          </Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  ), [onPropertyPress]);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.resultCount}>
          {results?.totalCount.toLocaleString() || 0} properties found
        </Text>
        {results?.executionTime && (
          <Text style={styles.executionTime}>
            Search took {(results.executionTime / 1000).toFixed(2)}s
          </Text>
        )}
      </View>

      <View style={styles.headerRight}>
        {/* View Mode Toggle */}
        <View style={styles.viewModeButtons}>
          <IconButton
            icon="view-list"
            size={20}
            onPress={() => setViewMode('list')}
            style={viewMode === 'list' ? styles.activeViewMode : styles.inactiveViewMode}
          />
          <IconButton
            icon="view-grid"
            size={20}
            onPress={() => setViewMode('grid')}
            style={viewMode === 'grid' ? styles.activeViewMode : styles.inactiveViewMode}
          />
          {onToggleMapView && (
            <IconButton
              icon="map"
              size={20}
              onPress={onToggleMapView}
              style={showMapView ? styles.activeViewMode : styles.inactiveViewMode}
            />
          )}
        </View>

        {/* Sort Menu */}
        <Menu
          visible={sortMenuVisible}
          onDismiss={() => setSortMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setSortMenuVisible(true)}
              style={styles.sortButton}
            >
              {getSortLabel(selectedSortBy, selectedSortOrder)}
            </Button>
          }
        >
          <Menu.Item
            onPress={() => handleSortChange('relevance')}
            title="Relevance"
          />
          <Menu.Item
            onPress={() => handleSortChange('price_desc')}
            title="Price: High to Low"
          />
          <Menu.Item
            onPress={() => handleSortChange('price_asc')}
            title="Price: Low to High"
          />
          <Menu.Item
            onPress={() => handleSortChange('date_desc')}
            title="Newest First"
          />
          <Menu.Item
            onPress={() => handleSortChange('sqft_desc')}
            title="Largest First"
          />
          <Divider />
          <Menu.Item
            onPress={handleShareResults}
            title="Share Results"
          />
        </Menu>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!results?.hasMore) return null;

    return (
      <View style={styles.footer}>
        {isLoading ? (
          <View style={styles.loadingMore}>
            <ActivityIndicator size="small" color="#2196F3" />
            <Text style={styles.loadingText}>Loading more properties...</Text>
          </View>
        ) : (
          <Button
            mode="outlined"
            onPress={onLoadMore}
            style={styles.loadMoreButton}
          >
            Load More Properties
          </Button>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No properties found</Text>
      <Text style={styles.emptySubtitle}>
        Try adjusting your search criteria or filters to find more results.
      </Text>
      <Button mode="outlined" onPress={() => {}}>
        Clear Filters
      </Button>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Text style={styles.errorTitle}>Search Error</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <Button mode="contained" onPress={() => {}}>
        Try Again
      </Button>
    </View>
  );

  if (error) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        {renderErrorState()}
      </View>
    );
  }

  if (!results || results.properties.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        {renderEmptyState()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}

      {viewMode === 'grid' ? (
        <FlatList
          data={results.properties}
          renderItem={renderGridPropertyCard}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          style={styles.resultsList}
        />
      ) : (
        <FlatList
          data={results.properties}
          renderItem={renderPropertyCard}
          keyExtractor={(item) => item.id.toString()}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          style={styles.resultsList}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  headerLeft: {
    flex: 1,
  },
  resultCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  executionTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewModeButtons: {
    flexDirection: 'row',
    marginRight: 8,
  },
  activeViewMode: {
    backgroundColor: '#E3F2FD',
  },
  inactiveViewMode: {
    backgroundColor: 'transparent',
  },
  sortButton: {
    minWidth: 120,
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
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  propertyPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  propertyDetails: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    width: 50,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  propertyAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  propertyMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  propertyDate: {
    fontSize: 12,
    color: '#999',
  },
  mlsChip: {
    height: 24,
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  gridPropertyCard: {
    width: '48%',
    marginBottom: 12,
  },
  gridCard: {
    elevation: 2,
  },
  gridImage: {
    height: 100,
  },
  gridContent: {
    padding: 8,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  gridPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 2,
  },
  gridDetails: {
    fontSize: 12,
    color: '#666',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  loadMoreButton: {
    minWidth: 200,
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
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
});

export default SearchResults;