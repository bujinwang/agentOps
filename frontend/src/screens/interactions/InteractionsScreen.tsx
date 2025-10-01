// Interactions/Activity tracking screen

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';

import { Interaction, InteractionType, Lead } from '../../types';
import { apiService } from '../../services/api';
import { formatDateTime, getRelativeTime } from '../../utils/validation';
import { useScreenLayout } from '../../hooks/useScreenLayout';

interface InteractionsScreenProps {
  navigation: any;
  route?: {
    params?: {
      leadId?: number;
      leadName?: string;
    };
  };
}

const InteractionsScreen: React.FC<InteractionsScreenProps> = ({ navigation, route }) => {
  const { containerStyle, contentStyle, responsive, theme } = useScreenLayout();
  const leadId = route?.params?.leadId;
  const leadName = route?.params?.leadName;

  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<InteractionType | 'all'>('all');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');

  const dynamicStyles = useMemo(() => ({
    input: { minHeight: responsive.getTouchTargetSize(100) },
    button: { minHeight: responsive.getTouchTargetSize(44) },
    filterButton: { minHeight: responsive.getTouchTargetSize(36) },
    interactionCard: { 
      minHeight: responsive.getTouchTargetSize(80),
      padding: responsive.getSpacing(12),
    },
  }), [responsive]);

  const loadInteractions = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      let response;
      if (leadId) {
        response = await apiService.getLeadInteractions(leadId);
      } else {
        const params: any = { limit: 100, page: 1 };
        if (filter !== 'all') {
          params.type = filter;
        }
        response = await apiService.getInteractions(params);
      }
      
      setInteractions(response.data || []);
    } catch (error) {
      console.error('Error loading interactions:', error);
      Alert.alert('Error', 'Failed to load interactions');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [leadId, filter]);

  useEffect(() => {
    loadInteractions();
  }, [loadInteractions]);

  const handleRefresh = () => {
    loadInteractions(true);
  };

  const addNote = async () => {
    if (!noteContent.trim() || !leadId) return;

    try {
      await apiService.addInteraction({
        leadId: leadId,
        type: 'Note Added',
        content: noteContent.trim(),
      });

      setNoteContent('');
      setIsAddingNote(false);
      loadInteractions(true);
      Alert.alert('Success', 'Note added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to add note');
    }
  };

  const getInteractionIcon = (type: InteractionType): string => {
    switch (type) {
      case 'Email Sent': return '📧';
      case 'Call Logged': return '📞';
      case 'SMS Sent': return '💬';
      case 'Note Added': return '📝';
      case 'Status Change': return '🔄';
      case 'Meeting Scheduled': return '📅';
      case 'Lead Created': return '✨';
      default: return '📋';
    }
  };

  const getInteractionColor = (type: InteractionType): string => {
    switch (type) {
      case 'Email Sent': return '#4CAF50';
      case 'Call Logged': return '#2196F3';
      case 'SMS Sent': return '#FF9800';
      case 'Note Added': return '#9C27B0';
      case 'Status Change': return '#FF5722';
      case 'Meeting Scheduled': return '#607D8B';
      case 'Lead Created': return '#4CAF50';
      default: return '#666';
    }
  };

  const renderInteractionItem = ({ item, index }: { item: Interaction; index: number }) => {
    const isLastItem = index === interactions.length - 1;
    
    return (
      <View style={styles.interactionCard}>
        <View style={styles.interactionHeader}>
          <View style={styles.interactionIcon}>
            <Text style={styles.iconText}>{getInteractionIcon(item.type)}</Text>
          </View>
          
          <View style={styles.interactionContent}>
            <View style={styles.interactionMeta}>
              <Text style={[styles.interactionType, { color: getInteractionColor(item.type) }]}>
                {item.type}
              </Text>
              <Text style={styles.interactionTime}>
                {getRelativeTime(item.interactionDate)}
              </Text>
            </View>

            {item.content && (
              <Text style={styles.interactionText}>{item.content}</Text>
            )}

            <Text style={styles.interactionDate}>
              {formatDateTime(item.interactionDate)}
            </Text>
          </View>
        </View>

        {!isLastItem && <View style={styles.timelineLine} />}
      </View>
    );
  };

  const renderFilterTabs = () => {
    const interactionTypes: (InteractionType | 'all')[] = [
      'all',
      'Email Sent',
      'Call Logged',
      'SMS Sent',
      'Note Added',
      'Status Change',
      'Meeting Scheduled',
    ];

    return (
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={interactionTypes}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterTab, filter === item && styles.activeFilterTab]}
              onPress={() => setFilter(item)}
            >
              <Text style={[styles.filterTabText, filter === item && styles.activeFilterTabText]}>
                {item === 'all' ? 'All' : getInteractionIcon(item as InteractionType)} {item === 'all' ? '' : item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>📋</Text>
      <Text style={styles.emptyStateTitle}>
        {leadId ? 'No Activity Yet' : 'No Interactions Found'}
      </Text>
      <Text style={styles.emptyStateText}>
        {leadId 
          ? 'Start tracking interactions with this lead'
          : filter === 'all'
          ? 'Activity will appear here as you interact with leads'
          : `No ${filter.toLowerCase()} interactions found`
        }
      </Text>
    </View>
  );

  const renderAddNoteSection = () => {
    if (!leadId) return null;

    return (
      <View style={styles.addNoteSection}>
        {isAddingNote ? (
          <View style={styles.noteInputContainer}>
            <TextInput
              style={[styles.noteInput, dynamicStyles.input]}
              value={noteContent}
              onChangeText={setNoteContent}
              placeholder="Add a note about this lead..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              autoFocus
            />
            <View style={styles.noteButtons}>
              <TouchableOpacity
                style={[styles.noteButton, styles.cancelButton, dynamicStyles.button]}
                onPress={() => {
                  setIsAddingNote(false);
                  setNoteContent('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.noteButton, styles.addButton, dynamicStyles.button, !noteContent.trim() && styles.disabledButton]}
                onPress={addNote}
                disabled={!noteContent.trim()}
              >
                <Text style={[styles.addButtonText, !noteContent.trim() && styles.disabledButtonText]}>
                  Add Note
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addNoteButton, dynamicStyles.button]}
            onPress={() => setIsAddingNote(true)}
          >
            <Text style={styles.addNoteButtonIcon}>📝</Text>
            <Text style={styles.addNoteButtonText}>Add Note</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const filteredInteractions = filter === 'all' 
    ? interactions 
    : interactions.filter(interaction => interaction.type === filter);

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Header */}
      <View style={[styles.header, contentStyle]}>
        <Text style={styles.headerTitle}>
          {leadName ? `${leadName} - Activity` : 'Activity Timeline'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {filteredInteractions.length} {filteredInteractions.length === 1 ? 'interaction' : 'interactions'}
        </Text>
      </View>

      {/* Add Note Section */}
      {renderAddNoteSection()}

      {/* Filter Tabs */}
      {!leadId && renderFilterTabs()}

      {/* Interactions List */}
      <FlatList
        data={filteredInteractions}
        keyExtractor={(item) => item.interactionId.toString()}
        renderItem={renderInteractionItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  addNoteSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e3f2fd',
    borderStyle: 'dashed',
  },
  addNoteButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  addNoteButtonText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
  },
  noteInputContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  noteButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  noteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#2196F3',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  disabledButtonText: {
    color: '#999',
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  activeFilterTab: {
    backgroundColor: '#2196F3',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  activeFilterTabText: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
  },
  interactionCard: {
    position: 'relative',
    marginBottom: 16,
  },
  interactionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  interactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconText: {
    fontSize: 18,
  },
  interactionContent: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  interactionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  interactionType: {
    fontSize: 16,
    fontWeight: '600',
  },
  interactionTime: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  interactionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  interactionDate: {
    fontSize: 12,
    color: '#999',
  },
  timelineLine: {
    position: 'absolute',
    left: 19,
    top: 40,
    bottom: -16,
    width: 2,
    backgroundColor: '#e0e0e0',
    zIndex: -1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 24,
  },
});

export default InteractionsScreen;