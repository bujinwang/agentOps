import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  Dimensions,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CommunicationTemplate, TemplateCategory, CommunicationChannel, TemplateSearchFilters } from '../types/template';

const { width: screenWidth } = Dimensions.get('window');

interface TemplateLibraryProps {
  templates: CommunicationTemplate[];
  onSelectTemplate: (template: CommunicationTemplate) => void;
  onCreateNew: () => void;
  onEditTemplate: (template: CommunicationTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onDuplicateTemplate: (template: CommunicationTemplate) => void;
}

interface TemplateCardProps {
  template: CommunicationTemplate;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
}) => {
  const getChannelIcon = (channel: CommunicationChannel) => {
    switch (channel) {
      case 'email': return 'email';
      case 'sms': return 'message-text';
      case 'in_app': return 'cellphone';
      case 'push': return 'bell';
      default: return 'email';
    }
  };

  const getChannelColor = (channel: CommunicationChannel) => {
    switch (channel) {
      case 'email': return '#007bff';
      case 'sms': return '#28a745';
      case 'in_app': return '#6f42c1';
      case 'push': return '#fd7e14';
      default: return '#6c757d';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#28a745';
      case 'draft': return '#ffc107';
      case 'testing': return '#17a2b8';
      case 'archived': return '#6c757d';
      default: return '#6c757d';
    }
  };

  return (
    <TouchableOpacity style={styles.templateCard} onPress={onSelect}>
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <MaterialCommunityIcons
            name={getChannelIcon(template.channel)}
            size={20}
            color={getChannelColor(template.channel)}
          />
          <Text style={styles.templateName} numberOfLines={1}>
            {template.name}
          </Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
            <MaterialIcons name="edit" size={16} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDuplicate} style={styles.actionButton}>
            <MaterialIcons name="content-copy" size={16} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
            <MaterialIcons name="delete" size={16} color="#dc3545" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.templateDescription} numberOfLines={2}>
        {template.description}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.tagsRow}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(template.status) }]}>
            <Text style={styles.statusText}>{template.status}</Text>
          </View>
          <Text style={styles.categoryText}>
            {TEMPLATE_CATEGORIES[template.category]?.name || template.category}
          </Text>
        </View>

        <View style={styles.statsRow}>
          {template.performance && (
            <>
              <Text style={styles.statText}>
                {template.performance.usageCount} uses
              </Text>
              {template.performance.openRate > 0 && (
                <Text style={styles.statText}>
                  {Math.round(template.performance.openRate * 100)}% open
                </Text>
              )}
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  templates,
  onSelectTemplate,
  onCreateNew,
  onEditTemplate,
  onDeleteTemplate,
  onDuplicateTemplate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [selectedChannel, setSelectedChannel] = useState<CommunicationChannel | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'usage' | 'performance' | 'created'>('name');
  const [filteredTemplates, setFilteredTemplates] = useState<CommunicationTemplate[]>(templates);

  useEffect(() => {
    filterAndSortTemplates();
  }, [templates, searchQuery, selectedCategory, selectedChannel, selectedStatus, sortBy]);

  const filterAndSortTemplates = () => {
    let filtered = templates.filter(template => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          template.name.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query) ||
          template.content.toLowerCase().includes(query) ||
          template.tags.some(tag => tag.toLowerCase().includes(query));

        if (!matchesSearch) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && template.category !== selectedCategory) {
        return false;
      }

      // Channel filter
      if (selectedChannel !== 'all' && template.channel !== selectedChannel) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && template.status !== selectedStatus) {
        return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'usage':
          const aUsage = a.performance?.usageCount || 0;
          const bUsage = b.performance?.usageCount || 0;
          return bUsage - aUsage;
        case 'performance':
          const aPerf = a.performance?.conversionRate || 0;
          const bPerf = b.performance?.conversionRate || 0;
          return bPerf - aPerf;
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    setFilteredTemplates(filtered);
  };

  const handleDeleteTemplate = (templateId: string) => {
    Alert.alert(
      'Delete Template',
      'Are you sure you want to delete this template? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDeleteTemplate(templateId) },
      ]
    );
  };

  const renderFilterChips = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
      {/* Category Filter */}
      <TouchableOpacity
        style={[styles.filterChip, selectedCategory === 'all' && styles.filterChipSelected]}
        onPress={() => setSelectedCategory('all')}
      >
        <Text style={[styles.filterChipText, selectedCategory === 'all' && styles.filterChipTextSelected]}>
          All Categories
        </Text>
      </TouchableOpacity>

      {Object.entries(TEMPLATE_CATEGORIES).map(([key, category]) => (
        <TouchableOpacity
          key={key}
          style={[styles.filterChip, selectedCategory === key && styles.filterChipSelected]}
          onPress={() => setSelectedCategory(key as TemplateCategory)}
        >
          <Text style={[styles.filterChipText, selectedCategory === key && styles.filterChipTextSelected]}>
            {category.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderChannelFilter = () => (
    <View style={styles.channelFilter}>
      {Object.entries(COMMUNICATION_CHANNELS).map(([key, channel]) => (
        <TouchableOpacity
          key={key}
          style={[
            styles.channelFilterButton,
            selectedChannel === key && styles.channelFilterButtonSelected,
          ]}
          onPress={() => setSelectedChannel(key as CommunicationChannel)}
        >
          <MaterialCommunityIcons
            name={channel.icon as any}
            size={16}
            color={selectedChannel === key ? '#fff' : '#666'}
          />
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={[
          styles.channelFilterButton,
          selectedChannel === 'all' && styles.channelFilterButtonSelected,
        ]}
        onPress={() => setSelectedChannel('all')}
      >
        <MaterialIcons name="clear-all" size={16} color={selectedChannel === 'all' ? '#fff' : '#666'} />
      </TouchableOpacity>
    </View>
  );

  const renderSortOptions = () => (
    <View style={styles.sortOptions}>
      <Text style={styles.sortLabel}>Sort by:</Text>
      {[
        { key: 'name', label: 'Name' },
        { key: 'usage', label: 'Usage' },
        { key: 'performance', label: 'Performance' },
        { key: 'created', label: 'Created' },
      ].map(option => (
        <TouchableOpacity
          key={option.key}
          style={[styles.sortButton, sortBy === option.key && styles.sortButtonSelected]}
          onPress={() => setSortBy(option.key as any)}
        >
          <Text style={[styles.sortButtonText, sortBy === option.key && styles.sortButtonTextSelected]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Template Library</Text>
        <TouchableOpacity onPress={onCreateNew} style={styles.createButton}>
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.createButtonText}>New Template</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search templates..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <MaterialIcons name="clear" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filters */}
      {renderFilterChips()}
      {renderChannelFilter()}
      {renderSortOptions()}

      {/* Results Count */}
      <Text style={styles.resultsCount}>
        {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} found
      </Text>

      {/* Template Grid */}
      <FlatList
        data={filteredTemplates}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.templateGrid}
        renderItem={({ item }) => (
          <TemplateCard
            template={item}
            onSelect={() => onSelectTemplate(item)}
            onEdit={() => onEditTemplate(item)}
            onDelete={() => handleDeleteTemplate(item.id)}
            onDuplicate={() => onDuplicateTemplate(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="inbox" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No templates found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery || selectedCategory !== 'all' || selectedChannel !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first template to get started'
              }
            </Text>
          </View>
        }
      />
    </View>
  );
};

const TEMPLATE_CATEGORIES = {
  initial_contact: { name: 'Initial Contact', icon: 'handshake' },
  follow_up: { name: 'Follow-up', icon: 'clock' },
  property_showing: { name: 'Property Showing', icon: 'home' },
  proposal: { name: 'Proposal', icon: 'file-text' },
  negotiation: { name: 'Negotiation', icon: 'scale' },
  closing: { name: 'Closing', icon: 'trophy' },
  thank_you: { name: 'Thank You', icon: 'heart' },
  nurturing: { name: 'Nurturing', icon: 'seedling' },
  re_engagement: { name: 'Re-engagement', icon: 'refresh' },
};

const COMMUNICATION_CHANNELS = {
  email: { name: 'Email', icon: 'email' },
  sms: { name: 'SMS', icon: 'message-text' },
  in_app: { name: 'In-App', icon: 'cellphone' },
  push: { name: 'Push', icon: 'bell' },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
  filterChips: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  filterChipSelected: {
    backgroundColor: '#007bff',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextSelected: {
    color: '#fff',
  },
  channelFilter: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  channelFilterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelFilterButtonSelected: {
    backgroundColor: '#007bff',
  },
  sortOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  sortLabel: {
    fontSize: 14,
    color: '#666',
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  sortButtonSelected: {
    backgroundColor: '#007bff',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#666',
  },
  sortButtonTextSelected: {
    color: '#fff',
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  templateGrid: {
    padding: 8,
  },
  templateCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    margin: 8,
    width: (screenWidth - 48) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  templateName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    padding: 4,
  },
  templateDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 16,
  },
  cardFooter: {
    gap: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  categoryText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statText: {
    fontSize: 10,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default TemplateLibrary;