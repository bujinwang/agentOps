import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useCommunicationTemplates } from '../hooks/useCommunicationTemplates';
import { CommunicationTemplate, TemplateCategory, TemplateSearchFilters } from '../types/communication';

interface TemplateLibraryProps {
  onSelectTemplate: (template: CommunicationTemplate) => void;
  onCreateTemplate: () => void;
  onEditTemplate: (template: CommunicationTemplate) => void;
}

interface TemplateCardProps {
  template: CommunicationTemplate;
  onSelect: () => void;
  onEdit: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect, onEdit }) => {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      onboarding: '#4CAF50',
      followup: '#2196F3',
      engagement: '#FF9800',
      nurturing: '#9C27B0',
      closing: '#F44336',
      retention: '#795548',
      reactivation: '#607D8B'
    };
    return colors[category] || '#666';
  };

  return (
    <TouchableOpacity style={styles.templateCard} onPress={onSelect}>
      <View style={styles.templateHeader}>
        <View style={styles.categoryBadge}>
          <Text style={[styles.categoryText, { color: getCategoryColor(template.category) }]}>
            {template.category}
          </Text>
        </View>
        <TouchableOpacity onPress={onEdit} style={styles.editButton}>
          <MaterialIcons name="edit" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <Text style={styles.templateName}>{template.name}</Text>

      {template.subjectTemplate && (
        <Text style={styles.templateSubject} numberOfLines={1}>
          {template.subjectTemplate}
        </Text>
      )}

      <Text style={styles.templateContent} numberOfLines={2}>
        {template.contentTemplate}
      </Text>

      <View style={styles.templateFooter}>
        <Text style={styles.variableCount}>
          {Object.keys(template.variables).length} variables
        </Text>
        <View style={[styles.statusBadge, template.isActive && styles.activeBadge]}>
          <Text style={[styles.statusText, template.isActive && styles.activeText]}>
            {template.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  onSelectTemplate,
  onCreateTemplate,
  onEditTemplate
}) => {
  const {
    templates,
    templateLibrary,
    isLoading,
    error,
    fetchTemplateLibrary
  } = useCommunicationTemplates();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  // Filter templates based on search and filters
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.contentTemplate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // Active status filter
    if (showActiveOnly) {
      filtered = filtered.filter(template => template.isActive);
    }

    return filtered;
  }, [templates, searchTerm, selectedCategory, showActiveOnly]);

  // Get unique categories from templates
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(templates.map(t => t.category)));
    return uniqueCategories.sort();
  }, [templates]);

  const handleRefresh = () => {
    fetchTemplateLibrary();
  };

  const handleDeleteTemplate = (template: CommunicationTemplate) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          // Implement delete functionality
          console.log('Delete template:', template.id);
        }}
      ]
    );
  };

  const renderCategoryFilter = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoryFilter}
    >
      <TouchableOpacity
        style={[styles.categoryChip, !selectedCategory && styles.categoryChipSelected]}
        onPress={() => setSelectedCategory('')}
      >
        <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextSelected]}>
          All
        </Text>
      </TouchableOpacity>

      {categories.map(category => (
        <TouchableOpacity
          key={category}
          style={[styles.categoryChip, selectedCategory === category && styles.categoryChipSelected]}
          onPress={() => setSelectedCategory(category)}
        >
          <Text style={[styles.categoryChipText, selectedCategory === category && styles.categoryChipTextSelected]}>
            {category}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderTemplateGrid = () => (
    <FlatList
      data={filteredTemplates}
      keyExtractor={(item) => item.id.toString()}
      numColumns={2}
      contentContainerStyle={styles.templateGrid}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <TemplateCard
          template={item}
          onSelect={() => onSelectTemplate(item)}
          onEdit={() => onEditTemplate(item)}
        />
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <MaterialIcons name="inbox" size={48} color="#ccc" />
          <Text style={styles.emptyStateText}>
            {isLoading ? 'Loading templates...' : 'No templates found'}
          </Text>
          {!isLoading && (
            <Text style={styles.emptyStateSubtext}>
              {searchTerm || selectedCategory ? 'Try adjusting your filters' : 'Create your first template'}
            </Text>
          )}
        </View>
      }
    />
  );

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={48} color="#ff4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Template Library</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <MaterialIcons name="refresh" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onCreateTemplate} style={styles.createButton}>
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search templates..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm ? (
          <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearButton}>
            <MaterialIcons name="clear" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {renderCategoryFilter()}

        <TouchableOpacity
          style={[styles.filterChip, showActiveOnly && styles.filterChipSelected]}
          onPress={() => setShowActiveOnly(!showActiveOnly)}
        >
          <Text style={[styles.filterChipText, showActiveOnly && styles.filterChipTextSelected]}>
            Active Only
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* Template Grid */}
      {renderTemplateGrid()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 8,
    marginRight: 8,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoryFilter: {
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#007AFF',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  filterChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  filterChipSelected: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
  },
  filterChipTextSelected: {
    color: '#fff',
  },
  summaryContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
  },
  templateGrid: {
    padding: 16,
  },
  templateCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  editButton: {
    padding: 4,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  templateSubject: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  templateContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  templateFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  variableCount: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  activeBadge: {
    backgroundColor: '#4CAF50',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  activeText: {
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#ff4444',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TemplateLibrary;