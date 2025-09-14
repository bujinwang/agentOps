import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput
} from 'react-native';
import { Card, Button, IconButton, Chip, Menu, Dialog, Portal } from 'react-native-paper';
import { SavedSearchesProps, SavedSearch, PropertySearchQuery } from '../types/search';

const SavedSearches: React.FC<SavedSearchesProps> = ({
  searches,
  onLoadSearch,
  onDeleteSearch,
  onCreateSearch,
  onEditSearch,
  maxDisplay = 10
}) => {
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [createDialogVisible, setCreateDialogVisible] = useState(false);
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [selectedSearch, setSelectedSearch] = useState<SavedSearch | null>(null);
  const [newSearchName, setNewSearchName] = useState('');
  const [newSearchDescription, setNewSearchDescription] = useState('');
  const [currentQuery, setCurrentQuery] = useState<PropertySearchQuery | null>(null);

  const handleCreateSearch = () => {
    if (!newSearchName.trim()) {
      Alert.alert('Error', 'Please enter a name for the search');
      return;
    }

    if (!currentQuery) {
      Alert.alert('Error', 'No active search to save');
      return;
    }

    onCreateSearch(currentQuery);
    setNewSearchName('');
    setNewSearchDescription('');
    setCreateDialogVisible(false);
  };

  const handleEditSearch = () => {
    if (!selectedSearch || !newSearchName.trim()) {
      Alert.alert('Error', 'Please enter a name for the search');
      return;
    }

    const updatedSearch: SavedSearch = {
      ...selectedSearch,
      name: newSearchName,
      description: newSearchDescription || undefined,
      updatedAt: new Date()
    };

    onEditSearch(updatedSearch);
    setNewSearchName('');
    setNewSearchDescription('');
    setEditDialogVisible(false);
    setSelectedSearch(null);
  };

  const handleDeleteSearch = (search: SavedSearch) => {
    Alert.alert(
      'Delete Search',
      `Are you sure you want to delete "${search.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteSearch(search.id)
        }
      ]
    );
  };

  const openEditDialog = (search: SavedSearch) => {
    setSelectedSearch(search);
    setNewSearchName(search.name);
    setNewSearchDescription(search.description || '');
    setEditDialogVisible(true);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
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

  const renderSearchItem = ({ item }: { item: SavedSearch }) => (
    <Card style={styles.searchCard}>
      <Card.Content style={styles.searchContent}>
        <View style={styles.searchHeader}>
          <View style={styles.searchInfo}>
            <Text style={styles.searchName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.description && (
              <Text style={styles.searchDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>

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
                onLoadSearch(item);
                setMenuVisible(null);
              }}
              title="Load Search"
            />
            <Menu.Item
              onPress={() => {
                openEditDialog(item);
                setMenuVisible(null);
              }}
              title="Edit"
            />
            <Menu.Item
              onPress={() => {
                handleDeleteSearch(item);
                setMenuVisible(null);
              }}
              title="Delete"
              titleStyle={{ color: '#F44336' }}
            />
          </Menu>
        </View>

        <Text style={styles.searchQuery} numberOfLines={1}>
          {getQuerySummary(item.query)}
        </Text>

        <View style={styles.searchMeta}>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              Used {item.executionCount} times
            </Text>
            <Text style={styles.metaText}>
              Updated {formatDate(item.updatedAt)}
            </Text>
          </View>

          {item.notificationsEnabled && (
            <Chip mode="outlined" style={styles.notificationChip}>
              Notifications {item.notificationFrequency}
            </Chip>
          )}
        </View>

        <View style={styles.searchActions}>
          <Button
            mode="outlined"
            onPress={() => onLoadSearch(item)}
            style={styles.loadButton}
          >
            Load
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No saved searches</Text>
      <Text style={styles.emptySubtitle}>
        Save your favorite searches to quickly find similar properties in the future.
      </Text>
    </View>
  );

  const displayedSearches = searches.slice(0, maxDisplay);
  const hasMore = searches.length > maxDisplay;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved Searches</Text>
        <Button
          mode="contained"
          onPress={() => setCreateDialogVisible(true)}
          style={styles.createButton}
          disabled={!currentQuery}
        >
          Save Current Search
        </Button>
      </View>

      {displayedSearches.length > 0 ? (
        <FlatList
          data={displayedSearches}
          renderItem={renderSearchItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        renderEmptyState()
      )}

      {hasMore && (
        <Text style={styles.moreText}>
          And {searches.length - maxDisplay} more...
        </Text>
      )}

      {/* Create Search Dialog */}
      <Portal>
        <Dialog visible={createDialogVisible} onDismiss={() => setCreateDialogVisible(false)}>
          <Dialog.Title>Save Search</Dialog.Title>
          <Dialog.Content>
            <TextInput
              style={styles.dialogInput}
              placeholder="Search name"
              value={newSearchName}
              onChangeText={setNewSearchName}
              maxLength={50}
            />
            <TextInput
              style={[styles.dialogInput, styles.dialogTextarea]}
              placeholder="Description (optional)"
              value={newSearchDescription}
              onChangeText={setNewSearchDescription}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCreateDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleCreateSearch}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Edit Search Dialog */}
      <Portal>
        <Dialog visible={editDialogVisible} onDismiss={() => setEditDialogVisible(false)}>
          <Dialog.Title>Edit Search</Dialog.Title>
          <Dialog.Content>
            <TextInput
              style={styles.dialogInput}
              placeholder="Search name"
              value={newSearchName}
              onChangeText={setNewSearchName}
              maxLength={50}
            />
            <TextInput
              style={[styles.dialogInput, styles.dialogTextarea]}
              placeholder="Description (optional)"
              value={newSearchDescription}
              onChangeText={setNewSearchDescription}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleEditSearch}>Update</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

// Helper function to set current query (to be called from parent component)
export const setCurrentSearchQuery = (component: React.RefObject<any>, query: PropertySearchQuery) => {
  if (component.current) {
    component.current.setCurrentQuery(query);
  }
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
  createButton: {
    minWidth: 140,
  },
  list: {
    flex: 1,
    padding: 16,
  },
  searchCard: {
    marginBottom: 12,
    elevation: 2,
  },
  searchContent: {
    padding: 16,
  },
  searchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  searchInfo: {
    flex: 1,
    marginRight: 8,
  },
  searchName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  searchDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  searchQuery: {
    fontSize: 14,
    color: '#2196F3',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  searchMeta: {
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
  },
  notificationChip: {
    alignSelf: 'flex-start',
    height: 24,
    marginTop: 4,
  },
  searchActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  loadButton: {
    minWidth: 80,
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
  dialogInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  dialogTextarea: {
    height: 80,
    textAlignVertical: 'top',
  },
});

export default SavedSearches;