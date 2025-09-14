import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Card, Button, IconButton, Chip, Menu } from 'react-native-paper';
import { SearchHistoryProps, SearchHistoryItem, PropertySearchQuery } from '../types/search';

const SearchHistory: React.FC<SearchHistoryProps> = ({
  history,
  onExecuteSearch,
  onClearHistory,
  maxDisplay = 10
}) => {
  const [menuVisible, setMenuVisible] = useState<string | null>(null);

  const handleExecuteSearch = (query: PropertySearchQuery) => {
    onExecuteSearch(query);
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Search History',
      'Are you sure you want to clear all search history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear History',
          style: 'destructive',
          onPress: onClearHistory
        }
      ]
    );
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatExecutionTime = (time: number) => {
    if (time < 1000) {
      return `${time}ms`;
    } else {
      return `${(time / 1000).toFixed(1)}s`;
    }
  };

  const getQuerySummary = (query: PropertySearchQuery): string => {
    const parts: string[] = [];

    if (query.query) {
      parts.push(`"${query.query}"`);
    }

    if (query.location?.city) {
      parts.push(query.location.city);
    }

    if (query.priceRange?.min || query.priceRange?.max) {
      const min = query.priceRange.min ? `$${query.priceRange.min.toLocaleString()}` : '';
      const max = query.priceRange.max ? `$${query.priceRange.max.toLocaleString()}` : '';
      parts.push(`${min}-${max}`);
    }

    if (query.propertyTypes?.length) {
      parts.push(`${query.propertyTypes.length} types`);
    }

    if (query.bedrooms?.min) {
      parts.push(`${query.bedrooms.min}+ beds`);
    }

    return parts.length > 0 ? parts.join(', ') : 'All properties';
  };

  const getDeviceIcon = (deviceInfo?: { platform: string }) => {
    if (!deviceInfo?.platform) return 'help-circle';

    switch (deviceInfo.platform.toLowerCase()) {
      case 'ios':
        return 'apple';
      case 'android':
        return 'android';
      case 'web':
        return 'web';
      default:
        return 'cellphone';
    }
  };

  const renderHistoryItem = ({ item }: { item: SearchHistoryItem }) => (
    <Card style={styles.historyCard}>
      <Card.Content style={styles.historyContent}>
        <View style={styles.historyHeader}>
          <View style={styles.historyInfo}>
            <Text style={styles.historyQuery} numberOfLines={1}>
              {getQuerySummary(item.query)}
            </Text>
            <View style={styles.historyMeta}>
              <Text style={styles.metaText}>
                {item.resultCount} results
              </Text>
              <Text style={styles.metaText}>•</Text>
              <Text style={styles.metaText}>
                {formatExecutionTime(item.executionTime)}
              </Text>
              <Text style={styles.metaText}>•</Text>
              <Text style={styles.metaText}>
                {formatDate(item.executedAt)}
              </Text>
            </View>
          </View>

          <View style={styles.historyActions}>
            <IconButton
              icon={getDeviceIcon(item.deviceInfo)}
              size={16}
              style={styles.deviceIcon}
            />
            <Menu
              visible={menuVisible === item.id}
              onDismiss={() => setMenuVisible(null)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  size={20}
                  onPress={() => setMenuVisible(item.id)}
                />
              }
            >
              <Menu.Item
                onPress={() => {
                  handleExecuteSearch(item.query);
                  setMenuVisible(null);
                }}
                title="Run Search Again"
              />
              <Menu.Item
                onPress={() => {
                  // Could implement save as saved search
                  Alert.alert('Save Search', 'Would you like to save this search for future use?');
                  setMenuVisible(null);
                }}
                title="Save This Search"
              />
            </Menu>
          </View>
        </View>

        <View style={styles.historyFooter}>
          <Button
            mode="outlined"
            onPress={() => handleExecuteSearch(item.query)}
            style={styles.executeButton}
            compact
          >
            Search Again
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No search history</Text>
      <Text style={styles.emptySubtitle}>
        Your recent searches will appear here for quick access.
      </Text>
    </View>
  );

  const renderAnalyticsSummary = () => {
    if (history.length === 0) return null;

    const totalSearches = history.length;
    const avgResults = history.reduce((sum, item) => sum + item.resultCount, 0) / totalSearches;
    const avgExecutionTime = history.reduce((sum, item) => sum + item.executionTime, 0) / totalSearches;

    return (
      <Card style={styles.analyticsCard}>
        <Card.Content>
          <Text style={styles.analyticsTitle}>Search Summary</Text>
          <View style={styles.analyticsGrid}>
            <View style={styles.analyticsItem}>
              <Text style={styles.analyticsValue}>{totalSearches}</Text>
              <Text style={styles.analyticsLabel}>Total Searches</Text>
            </View>
            <View style={styles.analyticsItem}>
              <Text style={styles.analyticsValue}>{Math.round(avgResults)}</Text>
              <Text style={styles.analyticsLabel}>Avg Results</Text>
            </View>
            <View style={styles.analyticsItem}>
              <Text style={styles.analyticsValue}>{formatExecutionTime(avgExecutionTime)}</Text>
              <Text style={styles.analyticsLabel}>Avg Time</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const displayedHistory = history.slice(0, maxDisplay);
  const hasMore = history.length > maxDisplay;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Searches</Text>
        {history.length > 0 && (
          <Button
            mode="text"
            onPress={handleClearHistory}
            style={styles.clearButton}
          >
            Clear All
          </Button>
        )}
      </View>

      {renderAnalyticsSummary()}

      {displayedHistory.length > 0 ? (
        <FlatList
          data={displayedHistory}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        renderEmptyState()
      )}

      {hasMore && (
        <Text style={styles.moreText}>
          And {history.length - maxDisplay} more searches...
        </Text>
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  clearButton: {
    minWidth: 80,
  },
  analyticsCard: {
    margin: 16,
    elevation: 2,
  },
  analyticsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  analyticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  analyticsItem: {
    alignItems: 'center',
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  list: {
    flex: 1,
    padding: 16,
  },
  historyCard: {
    marginBottom: 8,
    elevation: 1,
  },
  historyContent: {
    padding: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historyInfo: {
    flex: 1,
    marginRight: 8,
  },
  historyQuery: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
    marginBottom: 4,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#999',
    marginHorizontal: 4,
  },
  historyActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIcon: {
    margin: 0,
  },
  historyFooter: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  executeButton: {
    minWidth: 100,
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
  moreText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    padding: 16,
  },
});

export default SearchHistory;