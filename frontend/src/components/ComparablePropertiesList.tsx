import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card, Text, Chip, Button, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Property } from '../types/property';
import { ComparableProperty } from '../types/cma';
import { formatPriceRange } from '../types/cma';

interface ComparablePropertiesListProps {
  comparables: ComparableProperty[];
  subjectProperty: Property;
  onComparableSelect?: (comparable: ComparableProperty) => void;
}

const ComparablePropertiesList: React.FC<ComparablePropertiesListProps> = ({
  comparables,
  subjectProperty,
  onComparableSelect,
}) => {
  const [sortBy, setSortBy] = useState<'similarity' | 'price' | 'distance' | 'date'>('similarity');
  const [filterBy, setFilterBy] = useState<'all' | 'high_similarity' | 'recent'>('all');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getSimilarityColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  };

  const getSimilarityLabel = (score: number) => {
    if (score >= 80) return 'High';
    if (score >= 60) return 'Medium';
    return 'Low';
  };

  const sortedComparables = [...comparables].sort((a, b) => {
    switch (sortBy) {
      case 'similarity':
        return b.similarity_score - a.similarity_score;
      case 'price':
        return b.adjusted_price - a.adjusted_price;
      case 'distance':
        return a.distance_miles - b.distance_miles;
      case 'date':
        return new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime();
      default:
        return 0;
    }
  });

  const filteredComparables = sortedComparables.filter(comparable => {
    switch (filterBy) {
      case 'high_similarity':
        return comparable.similarity_score >= 70;
      case 'recent':
        const daysSinceSale = (Date.now() - new Date(comparable.sale_date).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceSale <= 180; // Within 6 months
      default:
        return true;
    }
  });

  const handleComparablePress = (comparable: ComparableProperty) => {
    if (onComparableSelect) {
      onComparableSelect(comparable);
    } else {
      Alert.alert(
        'Property Details',
        `${comparable.address}\n${comparable.city}, ${comparable.state}\n\nSold: ${formatCurrency(comparable.adjusted_price || comparable.sale_price)}\nDate: ${formatDate(comparable.sale_date)}\nSimilarity: ${comparable.similarity_score}%`,
        [{ text: 'OK' }]
      );
    }
  };

  const renderComparableCard = (comparable: ComparableProperty, index: number) => {
    const priceDiff = ((comparable.adjusted_price || comparable.sale_price) - (subjectProperty.price || 0)) / (subjectProperty.price || 1) * 100;

    return (
      <Card
        key={comparable.id}
        style={styles.comparableCard}
        onPress={() => handleComparablePress(comparable)}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.addressContainer}>
              <Text style={styles.address}>{comparable.address}</Text>
              <Text style={styles.cityState}>
                {comparable.city}, {comparable.state} {comparable.zip_code}
              </Text>
            </View>
            <View style={styles.similarityContainer}>
              <Chip
                mode="outlined"
                style={[styles.similarityChip, { borderColor: getSimilarityColor(comparable.similarity_score) }]}
                textStyle={{ color: getSimilarityColor(comparable.similarity_score), fontSize: 12 }}
              >
                {getSimilarityLabel(comparable.similarity_score)}
              </Chip>
              <Text style={styles.similarityScore}>{comparable.similarity_score}%</Text>
            </View>
          </View>

          <View style={styles.propertyDetails}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="bed" size={16} color="#666666" />
                <Text style={styles.detailText}>{comparable.bedrooms}</Text>
              </View>
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="shower" size={16} color="#666666" />
                <Text style={styles.detailText}>{comparable.bathrooms}</Text>
              </View>
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="ruler-square" size={16} color="#666666" />
                <Text style={styles.detailText}>{comparable.square_feet.toLocaleString()} sqft</Text>
              </View>
            </View>
          </View>

          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Sale Price:</Text>
              <Text style={styles.priceValue}>
                {formatCurrency(comparable.adjusted_price || comparable.sale_price)}
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Price/sqft:</Text>
              <Text style={styles.priceValue}>${comparable.price_per_sqft.toFixed(0)}</Text>
            </View>
            {comparable.adjustments && comparable.adjustments.length > 0 && (
              <View style={styles.adjustmentsRow}>
                <Text style={styles.adjustmentsLabel}>Adjustments:</Text>
                <Text style={styles.adjustmentsValue}>
                  {comparable.adjustments.reduce((sum, adj) => sum + adj.amount, 0) > 0 ? '+' : ''}
                  {formatCurrency(comparable.adjustments.reduce((sum, adj) => sum + adj.amount, 0))}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.saleInfo}>
            <View style={styles.saleDetail}>
              <Text style={styles.saleLabel}>Sold:</Text>
              <Text style={styles.saleValue}>{formatDate(comparable.sale_date)}</Text>
            </View>
            <View style={styles.saleDetail}>
              <Text style={styles.saleLabel}>DOM:</Text>
              <Text style={styles.saleValue}>{comparable.days_on_market} days</Text>
            </View>
            <View style={styles.saleDetail}>
              <Text style={styles.saleLabel}>Distance:</Text>
              <Text style={styles.saleValue}>{comparable.distance_miles.toFixed(1)} mi</Text>
            </View>
          </View>

          {Math.abs(priceDiff) > 5 && (
            <View style={styles.priceComparison}>
              <MaterialCommunityIcons
                name={priceDiff > 0 ? 'trending-up' : 'trending-down'}
                size={16}
                color={priceDiff > 0 ? '#F44336' : '#4CAF50'}
              />
              <Text style={[styles.priceDiff, { color: priceDiff > 0 ? '#F44336' : '#4CAF50' }]}>
                {priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(1)}% vs subject
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter and Sort Controls */}
      <View style={styles.controls}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterButtons}>
            {[
              { key: 'all', label: 'All' },
              { key: 'high_similarity', label: 'High Similarity' },
              { key: 'recent', label: 'Recent Sales' },
            ].map((filter) => (
              <Button
                key={filter.key}
                mode={filterBy === filter.key ? 'contained' : 'outlined'}
                onPress={() => setFilterBy(filter.key as any)}
                style={styles.filterButton}
                labelStyle={styles.filterButtonText}
              >
                {filter.label}
              </Button>
            ))}
          </View>
        </ScrollView>

        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          {[
            { key: 'similarity', label: 'Similarity' },
            { key: 'price', label: 'Price' },
            { key: 'distance', label: 'Distance' },
            { key: 'date', label: 'Date' },
          ].map((sort) => (
            <TouchableOpacity
              key={sort.key}
              onPress={() => setSortBy(sort.key as any)}
              style={[styles.sortOption, sortBy === sort.key && styles.sortOptionActive]}
            >
              <Text style={[styles.sortOptionText, sortBy === sort.key && styles.sortOptionTextActive]}>
                {sort.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Comparables List */}
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.resultsCount}>
          {filteredComparables.length} comparable{filteredComparables.length !== 1 ? 's' : ''} found
        </Text>

        {filteredComparables.map((comparable, index) => renderComparableCard(comparable, index))}

        {filteredComparables.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="home-search" size={48} color="#CCCCCC" />
            <Text style={styles.emptyStateText}>No comparables match the current filters</Text>
            <Button mode="outlined" onPress={() => setFilterBy('all')}>
              Show All
            </Button>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  controls: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterScroll: {
    marginBottom: 12,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    marginRight: 8,
  },
  filterButtonText: {
    fontSize: 12,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  sortLabel: {
    fontSize: 14,
    color: '#666666',
    marginRight: 12,
  },
  sortOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
    marginBottom: 4,
  },
  sortOptionActive: {
    backgroundColor: '#1976D2',
  },
  sortOptionText: {
    fontSize: 12,
    color: '#666666',
  },
  sortOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  comparableCard: {
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addressContainer: {
    flex: 1,
  },
  address: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 2,
  },
  cityState: {
    fontSize: 14,
    color: '#666666',
  },
  similarityContainer: {
    alignItems: 'flex-end',
  },
  similarityChip: {
    marginBottom: 4,
  },
  similarityScore: {
    fontSize: 12,
    color: '#666666',
    fontWeight: 'bold',
  },
  propertyDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666666',
  },
  priceSection: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666666',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  adjustmentsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  adjustmentsLabel: {
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
  },
  adjustmentsValue: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: 'bold',
  },
  saleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  saleDetail: {
    alignItems: 'center',
  },
  saleLabel: {
    fontSize: 10,
    color: '#666666',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  saleValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333333',
  },
  priceComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 6,
    gap: 6,
  },
  priceDiff: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
});

export default ComparablePropertiesList;