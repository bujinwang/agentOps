import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ConversionProbabilityChartProps {
  data: any[];
  loading?: boolean;
}

const ConversionProbabilityChart: React.FC<ConversionProbabilityChartProps> = ({
  data,
  loading = false,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Conversion Probability Chart</Text>
      <Text style={styles.placeholder}>Chart implementation coming soon</Text>
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

export default ConversionProbabilityChart;