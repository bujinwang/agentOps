import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import apiService from '../../services/api';
import { styles } from '../../styles/ml/FeatureImportanceStyles';

interface FeatureImportance {
  feature: string;
  importance: number;
  direction: string;
}

interface FeatureImportanceChartProps {
  onFeatureSelect?: (feature: FeatureImportance) => void;
  maxItems?: number;
}

export const FeatureImportanceChart: React.FC<FeatureImportanceChartProps> = ({
  onFeatureSelect,
  maxItems = 10
}) => {
  const [features, setFeatures] = useState<FeatureImportance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeatureImportance = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getFeatureImportance();
      setFeatures(response.data.allFeatures);
    } catch (err) {
      console.error('Failed to load feature importance:', err);
      setError('Failed to load feature importance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeatureImportance();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, color: '#666' }}>Loading feature importance...</Text>
      </View>
    );
  }

  if (error || features.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <MaterialIcons name="error-outline" size={48} color="#FF3B30" />
        <Text style={{ marginTop: 16, color: '#666', textAlign: 'center' }}>
          {error || 'No feature importance data available'}
        </Text>
        <TouchableOpacity
          style={{ marginTop: 16, padding: 12, backgroundColor: '#007AFF', borderRadius: 8 }}
          onPress={loadFeatureImportance}
        >
          <Text style={{ color: 'white' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const sortedFeatures = features
    .sort((a, b) => b.importance - a.importance)
    .slice(0, maxItems);

  const maxImportance = Math.max(...features.map(f => f.importance));

  const getCategoryColor = (featureName: string) => {
    // Categorize features based on their names
    if (featureName.includes('age') || featureName.includes('income') || featureName.includes('location')) {
      return '#007AFF'; // Demographic
    } else if (featureName.includes('interaction') || featureName.includes('visit') || featureName.includes('click')) {
      return '#34C759'; // Behavioral
    } else if (featureName.includes('time') || featureName.includes('date') || featureName.includes('duration')) {
      return '#FF9500'; // Temporal
    } else if (featureName.includes('property') || featureName.includes('price') || featureName.includes('size')) {
      return '#FF3B30'; // Property
    }
    return '#8E8E93'; // Default
  };

  const getCategoryIcon = (featureName: string) => {
    // Categorize features based on their names
    if (featureName.includes('age') || featureName.includes('income') || featureName.includes('location')) {
      return 'person'; // Demographic
    } else if (featureName.includes('interaction') || featureName.includes('visit') || featureName.includes('click')) {
      return 'timeline'; // Behavioral
    } else if (featureName.includes('time') || featureName.includes('date') || featureName.includes('duration')) {
      return 'schedule'; // Temporal
    } else if (featureName.includes('property') || featureName.includes('price') || featureName.includes('size')) {
      return 'home'; // Property
    }
    return 'help'; // Default
  };

  const getImpactIcon = (direction: string) => {
    switch (direction) {
      case 'positive':
        return 'trending-up';
      case 'negative':
        return 'trending-down';
      default:
        return 'trending-flat';
    }
  };

  const getImpactColor = (direction: string) => {
    switch (direction) {
      case 'positive':
        return '#34C759';
      case 'negative':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const renderFeatureItem = (feature: FeatureImportance, index: number) => {
    const percentage = (feature.importance / maxImportance) * 100;

    return (
      <TouchableOpacity
        key={feature.feature}
        style={styles.featureItem}
        onPress={() => onFeatureSelect?.(feature)}
      >
        <View style={styles.featureHeader}>
          <View style={styles.featureRank}>
            <Text style={styles.rankText}>#{index + 1}</Text>
          </View>

          <View style={styles.categoryIndicator}>
            <MaterialIcons
              name={getCategoryIcon(feature.feature)}
              size={16}
              color={getCategoryColor(feature.feature)}
            />
          </View>

          <View style={styles.featureInfo}>
            <Text style={styles.featureName} numberOfLines={1}>
              {feature.feature}
            </Text>
            <Text style={styles.featureDescription} numberOfLines={2}>
              Feature importance: {(feature.importance * 100).toFixed(1)}%
            </Text>
          </View>

          <View style={styles.impactIndicator}>
            <MaterialIcons
              name={getImpactIcon(feature.direction)}
              size={16}
              color={getImpactColor(feature.direction)}
            />
          </View>
        </View>

        <View style={styles.importanceBar}>
          <View
            style={[
              styles.importanceFill,
              {
                width: `${percentage}%`,
                backgroundColor: getCategoryColor(feature.feature)
              }
            ]}
          />
          <Text style={styles.importanceText}>
            {(feature.importance * 100).toFixed(1)}%
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const getCategorySummary = () => {
    const categories = features.reduce((acc, feature) => {
      const category = getCategoryName(feature.feature);
      acc[category] = (acc[category] || 0) + feature.importance;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .map(([category, importance]) => ({
        category,
        importance,
        percentage: (importance / features.reduce((sum, f) => sum + f.importance, 0)) * 100
      }));
  };

  const getCategoryName = (featureName: string) => {
    if (featureName.includes('age') || featureName.includes('income') || featureName.includes('location')) {
      return 'demographic';
    } else if (featureName.includes('interaction') || featureName.includes('visit') || featureName.includes('click')) {
      return 'behavioral';
    } else if (featureName.includes('time') || featureName.includes('date') || featureName.includes('duration')) {
      return 'temporal';
    } else if (featureName.includes('property') || featureName.includes('price') || featureName.includes('size')) {
      return 'property';
    }
    return 'other';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Feature Importance</Text>
        <Text style={styles.subtitle}>
          What drives the ML model's predictions
        </Text>
      </View>

      {/* Category Summary */}
      <View style={styles.categorySummary}>
        <Text style={styles.summaryTitle}>By Category</Text>
        <View style={styles.categoryGrid}>
          {getCategorySummary().map(({ category, percentage }) => (
            <View key={category} style={styles.categoryItem}>
              <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(category) }]} />
              <Text style={styles.categoryName}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
              <Text style={styles.categoryPercentage}>
                {percentage.toFixed(1)}%
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Feature List */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Top Predictive Features</Text>
        <ScrollView style={styles.featuresList} showsVerticalScrollIndicator={false}>
          {sortedFeatures.map((feature, index) => renderFeatureItem(feature, index))}
        </ScrollView>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <MaterialIcons name="person" size={14} color="#007AFF" />
          <Text style={styles.legendText}>Demographic</Text>
        </View>
        <View style={styles.legendItem}>
          <MaterialIcons name="timeline" size={14} color="#34C759" />
          <Text style={styles.legendText}>Behavioral</Text>
        </View>
        <View style={styles.legendItem}>
          <MaterialIcons name="schedule" size={14} color="#FF9500" />
          <Text style={styles.legendText}>Temporal</Text>
        </View>
        <View style={styles.legendItem}>
          <MaterialIcons name="home" size={14} color="#FF3B30" />
          <Text style={styles.legendText}>Property</Text>
        </View>
      </View>
    </View>
  );
};