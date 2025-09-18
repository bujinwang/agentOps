import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { DashboardFilters as DashboardFiltersType } from '../../../types/dashboard';

interface DashboardFiltersProps {
  filters: DashboardFiltersType | null;
  onFiltersChange: (filters: Partial<DashboardFiltersType>) => void;
  loading?: boolean;
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  filters,
  onFiltersChange,
  loading = false,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!filters) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        disabled={loading}
      >
        <Text style={styles.title}>Filters</Text>
        <Icon
          name={expanded ? 'expand-less' : 'expand-more'}
          size={24}
          color="#666666"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.filtersContainer}>
          <Text style={styles.placeholderText}>
            Advanced filters will be implemented here
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  filtersContainer: {
    padding: 16,
    paddingTop: 0,
  },
  placeholderText: {
    color: '#666666',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default DashboardFilters;