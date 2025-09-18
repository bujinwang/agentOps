import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DashboardMetrics } from '../../../types/dashboard';

interface ModelPerformanceMonitorProps {
  metrics: DashboardMetrics | null;
  loading?: boolean;
}

const ModelPerformanceMonitor: React.FC<ModelPerformanceMonitorProps> = ({
  metrics,
  loading = false,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Model Performance Monitor</Text>
      <Text style={styles.placeholder}>Performance metrics coming soon</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginVertical: 8,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  placeholder: {
    color: '#666666',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default ModelPerformanceMonitor;