import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  onExport?: (format: 'pdf' | 'csv' | 'excel') => void;
  refreshing?: boolean;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  subtitle,
  onRefresh,
  onExport,
  refreshing = false,
  showBackButton = false,
  onBackPress,
}) => {
  const handleExport = (format: 'pdf' | 'csv' | 'excel') => {
    if (onExport) {
      onExport(format);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {/* Back Button */}
        {showBackButton && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackPress}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon name="arrow-back" size={24} color="#333333" />
          </TouchableOpacity>
        )}

        {/* Title Section */}
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Refresh Button */}
          {onRefresh && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onRefresh}
              disabled={refreshing}
              accessibilityLabel="Refresh dashboard"
              accessibilityRole="button"
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Icon name="refresh" size={24} color="#007AFF" />
              )}
            </TouchableOpacity>
          )}

          {/* Export Menu */}
          {onExport && (
            <View style={styles.exportMenu}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleExport('pdf')}
                accessibilityLabel="Export as PDF"
                accessibilityRole="button"
              >
                <Icon name="picture-as-pdf" size={24} color="#007AFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleExport('csv')}
                accessibilityLabel="Export as CSV"
                accessibilityRole="button"
              >
                <Icon name="table-chart" size={24} color="#007AFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleExport('excel')}
                accessibilityLabel="Export as Excel"
                accessibilityRole="button"
              >
                <Icon name="grid-on" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  backButton: {
    marginRight: 12,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#666666',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportMenu: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default DashboardHeader;