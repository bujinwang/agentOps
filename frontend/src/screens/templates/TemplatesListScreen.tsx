import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialColors, MaterialSpacing, MaterialTypography } from '../../styles/MaterialDesign';
import { apiService } from '../../services/api';
import { useScreenLayout } from '../../hooks/useScreenLayout';

interface Template {
  templateId: number;
  name: string;
  description?: string;
  category: string;
  channel: 'email' | 'sms';
  subjectTemplate?: string;
  contentTemplate: string;
  variables: Record<string, any>;
  conditions: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const TemplatesListScreen: React.FC = () => {
  const { containerStyle, contentStyle, responsive, theme } = useScreenLayout();
  const navigation = useNavigation();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'email' | 'sms'>('all');
  const [categories, setCategories] = useState<string[]>([]);

  const dynamicStyles = useMemo(() => ({
    button: { minHeight: responsive.getTouchTargetSize(44) },
    templateCard: { 
      minHeight: responsive.getTouchTargetSize(100),
      padding: responsive.getSpacing(12),
    },
  }), [responsive]);

  useEffect(() => {
    loadTemplates();
  }, [filter]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const params = filter === 'all' ? {} : { channel: filter };
      const response = await apiService.getPersonalizedTemplates(params);
      setTemplates(response.templates || []);
      setCategories(response.categories || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      Alert.alert('Error', 'Failed to load templates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTemplates();
  };

  const handleDeleteTemplate = (template: Template) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTemplate(template.templateId),
        },
      ]
    );
  };

  const deleteTemplate = async (templateId: number) => {
    try {
      await apiService.deletePersonalizedTemplate(templateId);
      setTemplates(prev => prev.filter(t => t.templateId !== templateId));
      Alert.alert('Success', 'Template deleted successfully');
    } catch (error) {
      console.error('Error deleting template:', error);
      Alert.alert('Error', 'Failed to delete template');
    }
  };

  const handleDuplicateTemplate = async (template: Template) => {
    try {
      const newName = `${template.name} (Copy)`;
      await apiService.createPersonalizedTemplate({
        name: newName,
        description: template.description,
        category: template.category,
        channel: template.channel,
        subjectTemplate: template.subjectTemplate,
        contentTemplate: template.contentTemplate,
        variables: template.variables,
        conditions: template.conditions
      });
      loadTemplates(); // Refresh the list
      Alert.alert('Success', 'Template duplicated successfully');
    } catch (error) {
      console.error('Error duplicating template:', error);
      Alert.alert('Error', 'Failed to duplicate template');
    }
  };

  const renderTemplateCard = (template: Template) => (
    <View key={template.templateId} style={styles.templateCard}>
      <View style={styles.templateHeader}>
        <View style={styles.templateInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.templateName}>{template.name}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{template.category}</Text>
            </View>
          </View>
          <View style={styles.typeRow}>
            <View style={[styles.typeBadge, template.channel === 'email' ? styles.emailBadge : styles.smsBadge]}>
              <Text style={styles.typeBadgeText}>{template.channel.toUpperCase()}</Text>
            </View>
            <Text style={styles.templateDate}>
              {new Date(template.updatedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>

      {template.channel === 'email' && template.subjectTemplate && (
        <Text style={styles.templateSubject} numberOfLines={1}>
          Subject: {template.subjectTemplate}
        </Text>
      )}

      <Text style={styles.templateContent} numberOfLines={2}>
        {template.contentTemplate}
      </Text>

      <View style={styles.templateActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => (navigation as any).navigate('TemplateEditor', { templateId: template.templateId })}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => handleDuplicateTemplate(template)}
        >
          <Text style={styles.secondaryButtonText}>Duplicate</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.dangerButton]}
          onPress={() => handleDeleteTemplate(template)}
        >
          <Text style={styles.dangerButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
        onPress={() => setFilter('all')}
      >
        <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
          All ({templates.length})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.filterButton, filter === 'email' && styles.filterButtonActive]}
        onPress={() => setFilter('email')}
      >
        <Text style={[styles.filterButtonText, filter === 'email' && styles.filterButtonTextActive]}>
          Email ({templates.filter(t => t.channel === 'email').length})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.filterButton, filter === 'sms' && styles.filterButtonActive]}
        onPress={() => setFilter('sms')}
      >
        <Text style={[styles.filterButtonText, filter === 'sms' && styles.filterButtonTextActive]}>
          SMS ({templates.filter(t => t.channel === 'sms').length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Templates</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => (navigation as any).navigate('TemplateEditor')}
        >
          <Text style={styles.addButtonText}>+ New Template</Text>
        </TouchableOpacity>
      </View>

      {renderFilterButtons()}

      <ScrollView
        style={styles.templatesList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading templates...</Text>
          </View>
        ) : templates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No templates found</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'all'
                ? 'Create your first template to get started'
                : `No ${filter} templates found. Try a different filter or create a new one.`
              }
            </Text>
          </View>
        ) : (
          templates.map(renderTemplateCard)
        )}
      </ScrollView>
    </View>
  );
};

// Import Text component that was missing
import { Text } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: MaterialSpacing.md,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    ...MaterialTypography.headlineSmall,
    color: MaterialColors.neutral[900],
  },
  addButton: {
    backgroundColor: MaterialColors.primary[500],
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: MaterialSpacing.md,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    flex: 1,
    padding: MaterialSpacing.sm,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  filterButtonActive: {
    backgroundColor: MaterialColors.primary[500],
  },
  filterButtonText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.neutral[700],
  },
  filterButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  templatesList: {
    flex: 1,
    padding: MaterialSpacing.md,
  },
  templateCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: MaterialSpacing.md,
    marginBottom: MaterialSpacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: MaterialSpacing.sm,
  },
  templateInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: MaterialSpacing.xs,
  },
  templateName: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: MaterialColors.secondary[100],
    paddingHorizontal: MaterialSpacing.xs,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: MaterialSpacing.sm,
  },
  categoryBadgeText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.secondary[700],
    fontWeight: 'bold',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: MaterialSpacing.sm,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: MaterialSpacing.sm,
  },
  emailBadge: {
    backgroundColor: MaterialColors.primary[100],
  },
  smsBadge: {
    backgroundColor: MaterialColors.secondary[100],
  },
  typeBadgeText: {
    ...MaterialTypography.labelSmall,
    fontWeight: 'bold',
  },
  templateDate: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[500],
  },
  templateSubject: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[700],
    marginBottom: MaterialSpacing.xs,
    fontStyle: 'italic',
  },
  templateContent: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
    marginBottom: MaterialSpacing.md,
  },
  templateActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: MaterialColors.primary[500],
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: MaterialColors.primary[500],
  },
  secondaryButtonText: {
    color: MaterialColors.primary[500],
  },
  dangerButton: {
    backgroundColor: MaterialColors.error[500],
  },
  dangerButtonText: {
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: MaterialSpacing.xl,
  },
  loadingText: {
    ...MaterialTypography.bodyLarge,
    color: MaterialColors.neutral[500],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: MaterialSpacing.xl,
  },
  emptyText: {
    ...MaterialTypography.headlineSmall,
    color: MaterialColors.neutral[700],
    marginBottom: MaterialSpacing.sm,
  },
  emptySubtext: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[500],
    textAlign: 'center',
  },
});

export default TemplatesListScreen;