import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { DashboardAlert } from '../../../types/dashboard';

interface AlertCenterProps {
  alerts: DashboardAlert[];
  onAlertAction?: (alert: DashboardAlert, action: any) => void;
  maxHeight?: number;
}

const AlertCenter: React.FC<AlertCenterProps> = ({
  alerts,
  onAlertAction,
  maxHeight = 200,
}) => {
  if (alerts.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Alerts</Text>
        <Text style={styles.emptyText}>No active alerts</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { maxHeight }]}>
      <Text style={styles.title}>Alerts ({alerts.length})</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {alerts.map((alert) => (
          <View key={alert.id} style={styles.alertItem}>
            <Text style={styles.alertTitle}>{alert.title}</Text>
            <Text style={styles.alertMessage}>{alert.message}</Text>
          </View>
        ))}
      </ScrollView>
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
    marginBottom: 12,
  },
  emptyText: {
    color: '#666666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  alertItem: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 12,
    color: '#666666',
  },
});

export default AlertCenter;