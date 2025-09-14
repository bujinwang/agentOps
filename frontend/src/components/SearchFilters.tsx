import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert
} from 'react-native';
import { Card, Button, Chip, IconButton, Divider, Switch } from 'react-native-paper';
import { SearchFiltersProps, PropertySearchQuery } from '../types/search';
import { PROPERTY_TYPES, PROPERTY_STATUSES } from '../types/property';

const SearchFilters: React.FC<SearchFiltersProps> = ({
  query,
  facets,
  onQueryChange,
  collapsed = false,
  onToggleCollapse,
  showAdvanced = false,
  onToggleAdvanced
}) => {
  const [localQuery, setLocalQuery] = useState<PropertySearchQuery>(query);
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  const handleQueryUpdate = (updates: Partial<PropertySearchQuery>) => {
    const newQuery = { ...localQuery, ...updates };
    setLocalQuery(newQuery);
    onQueryChange(newQuery);
  };

  const handlePriceRangeUpdate = (field: 'min' | 'max', value: string) => {
    const numValue = value ? parseInt(value.replace(/[^0-9]/g, '')) : undefined;
    const currentRange = localQuery.priceRange || {};

    handleQueryUpdate({
      priceRange: {
        ...currentRange,
        [field]: numValue
      }
    });
  };

  const handleBedroomUpdate = (field: 'min' | 'max', value: string) => {
    const numValue = value ? parseInt(value) : undefined;
    const currentRange = localQuery.bedrooms || {};

    handleQueryUpdate({
      bedrooms: {
        ...currentRange,
        [field]: numValue
      }
    });
  };

  const handleBathroomUpdate = (field: 'min' | 'max', value: string) => {
    const numValue = value ? parseFloat(value) : undefined;
    const currentRange = localQuery.bathrooms || {};

    handleQueryUpdate({
      bathrooms: {
        ...currentRange,
        [field]: numValue
      }
    });
  };

  const handleSqftUpdate = (field: 'min' | 'max', value: string) => {
    const numValue = value ? parseInt(value.replace(/[^0-9]/g, '')) : undefined;
    const currentRange = localQuery.squareFeet || {};

    handleQueryUpdate({
      squareFeet: {
        ...currentRange,
        [field]: numValue
      }
    });
  };

  const handleYearBuiltUpdate = (field: 'min' | 'max', value: string) => {
    const numValue = value ? parseInt(value) : undefined;
    const currentRange = localQuery.yearBuilt || {};

    handleQueryUpdate({
      yearBuilt: {
        ...currentRange,
        [field]: numValue
      }
    });
  };

  const togglePropertyType = (propertyType: string) => {
    const currentTypes = localQuery.propertyTypes || [];
    const newTypes = currentTypes.includes(propertyType)
      ? currentTypes.filter(type => type !== propertyType)
      : [...currentTypes, propertyType];

    handleQueryUpdate({
      propertyTypes: newTypes.length > 0 ? newTypes : undefined
    });
  };

  const toggleFeature = (feature: string) => {
    const currentFeatures = localQuery.features || [];
    const newFeatures = currentFeatures.includes(feature)
      ? currentFeatures.filter(f => f !== feature)
      : [...currentFeatures, feature];

    handleQueryUpdate({
      features: newFeatures.length > 0 ? newFeatures : undefined
    });
  };

  const clearAllFilters = () => {
    const clearedQuery: PropertySearchQuery = {
      sortBy: localQuery.sortBy,
      sortOrder: localQuery.sortOrder,
      page: 1,
      limit: localQuery.limit
    };
    setLocalQuery(clearedQuery);
    onQueryChange(clearedQuery);
  };

  const hasActiveFilters = () => {
    return !!(
      localQuery.priceRange?.min ||
      localQuery.priceRange?.max ||
      localQuery.propertyTypes?.length ||
      localQuery.bedrooms?.min ||
      localQuery.bedrooms?.max ||
      localQuery.bathrooms?.min ||
      localQuery.bathrooms?.max ||
      localQuery.squareFeet?.min ||
      localQuery.squareFeet?.max ||
      localQuery.yearBuilt?.min ||
      localQuery.yearBuilt?.max ||
      localQuery.features?.length ||
      localQuery.location?.city ||
      localQuery.location?.state ||
      localQuery.location?.zipCode
    );
  };

  if (isCollapsed) {
    return (
      <Card style={styles.collapsedCard}>
        <TouchableOpacity
          style={styles.collapsedHeader}
          onPress={() => {
            setIsCollapsed(false);
            onToggleCollapse?.();
          }}
        >
          <Text style={styles.collapsedTitle}>Filters</Text>
          <View style={styles.collapsedBadges}>
            {hasActiveFilters() && (
              <Chip mode="outlined" style={styles.activeFilterBadge}>
                Active
              </Chip>
            )}
            <IconButton icon="chevron-down" size={20} />
          </View>
        </TouchableOpacity>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Card.Title
        title="Search Filters"
        right={(props) => (
          <View style={styles.headerActions}>
            {hasActiveFilters() && (
              <Button
                mode="text"
                onPress={clearAllFilters}
                style={styles.clearButton}
              >
                Clear All
              </Button>
            )}
            <IconButton
              {...props}
              icon="chevron-up"
              onPress={() => {
                setIsCollapsed(true);
                onToggleCollapse?.();
              }}
            />
          </View>
        )}
      />

      <Card.Content>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Location Filters */}
          <View style={styles.filterSection}>
            <Text style={styles.sectionTitle}>Location</Text>
            <TextInput
              style={styles.textInput}
              placeholder="City"
              value={localQuery.location?.city || ''}
              onChangeText={(text) => handleQueryUpdate({
                location: { ...localQuery.location, city: text || undefined }
              })}
            />
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.textInput, styles.halfInput]}
                placeholder="State"
                value={localQuery.location?.state || ''}
                onChangeText={(text) => handleQueryUpdate({
                  location: { ...localQuery.location, state: text || undefined }
                })}
              />
              <TextInput
                style={[styles.textInput, styles.halfInput]}
                placeholder="ZIP Code"
                value={localQuery.location?.zipCode || ''}
                onChangeText={(text) => handleQueryUpdate({
                  location: { ...localQuery.location, zipCode: text || undefined }
                })}
              />
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Price Range */}
          <View style={styles.filterSection}>
            <Text style={styles.sectionTitle}>Price Range</Text>
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.textInput, styles.halfInput]}
                placeholder="Min Price"
                keyboardType="numeric"
                value={localQuery.priceRange?.min?.toString() || ''}
                onChangeText={(text) => handlePriceRangeUpdate('min', text)}
              />
              <TextInput
                style={[styles.textInput, styles.halfInput]}
                placeholder="Max Price"
                keyboardType="numeric"
                value={localQuery.priceRange?.max?.toString() || ''}
                onChangeText={(text) => handlePriceRangeUpdate('max', text)}
              />
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Property Types */}
          <View style={styles.filterSection}>
            <Text style={styles.sectionTitle}>Property Types</Text>
            <View style={styles.chipGrid}>
              {Object.entries(PROPERTY_TYPES).map(([key, label]) => (
                <Chip
                  key={key}
                  mode={localQuery.propertyTypes?.includes(key) ? 'flat' : 'outlined'}
                  onPress={() => togglePropertyType(key)}
                  style={styles.filterChip}
                  textStyle={styles.chipText}
                >
                  {label}
                </Chip>
              ))}
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Bedrooms & Bathrooms */}
          <View style={styles.filterSection}>
            <Text style={styles.sectionTitle}>Bedrooms & Bathrooms</Text>
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.textInput, styles.halfInput]}
                placeholder="Min Beds"
                keyboardType="numeric"
                value={localQuery.bedrooms?.min?.toString() || ''}
                onChangeText={(text) => handleBedroomUpdate('min', text)}
              />
              <TextInput
                style={[styles.textInput, styles.halfInput]}
                placeholder="Max Beds"
                keyboardType="numeric"
                value={localQuery.bedrooms?.max?.toString() || ''}
                onChangeText={(text) => handleBedroomUpdate('max', text)}
              />
            </View>
            <View style={styles.rowInputs}>
              <TextInput
                style={[styles.textInput, styles.halfInput]}
                placeholder="Min Baths"
                keyboardType="numeric"
                value={localQuery.bathrooms?.min?.toString() || ''}
                onChangeText={(text) => handleBathroomUpdate('min', text)}
              />
              <TextInput
                style={[styles.textInput, styles.halfInput]}
                placeholder="Max Baths"
                keyboardType="numeric"
                value={localQuery.bathrooms?.max?.toString() || ''}
                onChangeText={(text) => handleBathroomUpdate('max', text)}
              />
            </View>
          </View>

          {/* Advanced Filters Toggle */}
          <View style={styles.advancedToggle}>
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => onToggleAdvanced?.()}
            >
              <Text style={styles.toggleText}>Advanced Filters</Text>
              <IconButton
                icon={showAdvanced ? 'chevron-up' : 'chevron-down'}
                size={20}
              />
            </TouchableOpacity>
          </View>

          {/* Advanced Filters */}
          {showAdvanced && (
            <>
              <Divider style={styles.divider} />

              {/* Square Footage */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Square Footage</Text>
                <View style={styles.rowInputs}>
                  <TextInput
                    style={[styles.textInput, styles.halfInput]}
                    placeholder="Min Sqft"
                    keyboardType="numeric"
                    value={localQuery.squareFeet?.min?.toString() || ''}
                    onChangeText={(text) => handleSqftUpdate('min', text)}
                  />
                  <TextInput
                    style={[styles.textInput, styles.halfInput]}
                    placeholder="Max Sqft"
                    keyboardType="numeric"
                    value={localQuery.squareFeet?.max?.toString() || ''}
                    onChangeText={(text) => handleSqftUpdate('max', text)}
                  />
                </View>
              </View>

              {/* Year Built */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Year Built</Text>
                <View style={styles.rowInputs}>
                  <TextInput
                    style={[styles.textInput, styles.halfInput]}
                    placeholder="Min Year"
                    keyboardType="numeric"
                    value={localQuery.yearBuilt?.min?.toString() || ''}
                    onChangeText={(text) => handleYearBuiltUpdate('min', text)}
                  />
                  <TextInput
                    style={[styles.textInput, styles.halfInput]}
                    placeholder="Max Year"
                    keyboardType="numeric"
                    value={localQuery.yearBuilt?.max?.toString() || ''}
                    onChangeText={(text) => handleYearBuiltUpdate('max', text)}
                  />
                </View>
              </View>

              {/* Property Features */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Features</Text>
                <View style={styles.chipGrid}>
                  {['pool', 'garage', 'basement', 'fireplace', 'patio', 'deck'].map((feature) => (
                    <Chip
                      key={feature}
                      mode={localQuery.features?.includes(feature) ? 'flat' : 'outlined'}
                      onPress={() => toggleFeature(feature)}
                      style={styles.filterChip}
                      textStyle={styles.chipText}
                    >
                      {feature.charAt(0).toUpperCase() + feature.slice(1)}
                    </Chip>
                  ))}
                </View>
              </View>

              {/* Additional Options */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Options</Text>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Has Garage</Text>
                  <Switch
                    value={localQuery.hasGarage || false}
                    onValueChange={(value) => handleQueryUpdate({ hasGarage: value })}
                  />
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Has Basement</Text>
                  <Switch
                    value={localQuery.hasBasement || false}
                    onValueChange={(value) => handleQueryUpdate({ hasBasement: value })}
                  />
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Has Pool</Text>
                  <Switch
                    value={localQuery.hasPool || false}
                    onValueChange={(value) => handleQueryUpdate({ hasPool: value })}
                  />
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
    elevation: 4,
  },
  collapsedCard: {
    margin: 16,
    elevation: 2,
  },
  collapsedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  collapsedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  collapsedBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeFilterBadge: {
    marginRight: 8,
    height: 28,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    marginRight: 8,
  },
  filterSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
    height: 36,
  },
  chipText: {
    fontSize: 12,
  },
  advancedToggle: {
    marginTop: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: '#666',
  },
  divider: {
    marginVertical: 12,
  },
});

export default SearchFilters;