import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PredictiveAnalytics } from '../../../types/dashboard';

interface PredictiveTimelineProps {
  analytics: PredictiveAnalytics[];
  loading?: boolean;
}

const PredictiveTimeline: React.FC<PredictiveTimelineProps> = ({
  analytics,
  loading = false,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Predictive Timeline</Text>
      <Text style={styles.placeholder}>Timeline visualization coming soon</Text>
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

export default PredictiveTimeline;