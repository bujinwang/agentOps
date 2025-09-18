import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MaterialColors } from '../../../styles/MaterialDesign';
import { ReportTemplate, ReportSection } from '../../../services/exportService';

interface CustomReportBuilderProps {
  onSaveTemplate: (template: ReportTemplate) => void;
  onPreviewTemplate: (template: ReportTemplate) => void;
  existingTemplates?: ReportTemplate[];
}

interface SectionBuilder {
  id: string;
  title: string;
  type: 'summary' | 'leads' | 'performance' | 'alerts' | 'trends' | 'custom';
  dataSource: 'leads' | 'performance' | 'alerts' | 'combined';
  chartType?: 'line' | 'bar' | 'pie' | 'table';
  columns?: string[];
  filters: {
    dateRange?: boolean;
    leadScore?: boolean;
    conversionProbability?: boolean;
    dealValue?: boolean;
    tags?: boolean;
  };
}

const CustomReportBuilder: React.FC<CustomReportBuilderProps> = ({
  onSaveTemplate,
  onPreviewTemplate,
  existingTemplates = [],
}) => {
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [sections, setSections] = useState<SectionBuilder[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleRecipients, setScheduleRecipients] = useState('');

  const addSection = useCallback(() => {
    const newSection: SectionBuilder = {
      id: `section-${Date.now()}`,
      title: '',
      type: 'summary',
      dataSource: 'leads',
      filters: {},
    };
    setSections(prev => [...prev, newSection]);
  }, []);

  const updateSection = useCallback((sectionId: string, updates: Partial<SectionBuilder>) => {
    setSections(prev =>
      prev.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    );
  }, []);

  const removeSection = useCallback((sectionId: string) => {
    setSections(prev => prev.filter(section => section.id !== sectionId));
  }, []);

  const moveSection = useCallback((sectionId: string, direction: 'up' | 'down') => {
    setSections(prev => {
      const currentIndex = prev.findIndex(section => section.id === sectionId);
      if (currentIndex === -1) return prev;

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;

      const newSections = [...prev];
      [newSections[currentIndex], newSections[newIndex]] = [newSections[newIndex], newSections[currentIndex]];
      return newSections;
    });
  }, []);

  const toggleFilter = useCallback((sectionId: string, filterKey: keyof SectionBuilder['filters']) => {
    setSections(prev =>
      prev.map(section =>
        section.id === sectionId
          ? {
              ...section,
              filters: {
                ...section.filters,
                [filterKey]: !section.filters[filterKey],
              },
            }
          : section
      )
    );
  }, []);

  const saveTemplate = useCallback(() => {
    if (!templateName.trim()) {
      Alert.alert('Error', 'Please enter a template name');
      return;
    }

    if (sections.length === 0) {
      Alert.alert('Error', 'Please add at least one section to the report');
      return;
    }

    // Validate sections
    const invalidSections = sections.filter(section => !section.title.trim());
    if (invalidSections.length > 0) {
      Alert.alert('Error', 'All sections must have a title');
      return;
    }

    const template: ReportTemplate = {
      id: `template-${Date.now()}`,
      name: templateName,
      description: templateDescription,
      sections: sections.map(section => ({
        id: section.id,
        title: section.title,
        type: section.type,
        dataSource: section.dataSource,
        chartType: section.chartType,
        columns: section.columns,
        filters: section.filters,
      })),
      ...(scheduleEnabled && {
        schedule: {
          frequency: scheduleFrequency,
          time: scheduleTime,
          recipients: scheduleRecipients.split(',').map(email => email.trim()),
        },
      }),
    };

    onSaveTemplate(template);
    Alert.alert('Success', 'Report template saved successfully!');
  }, [templateName, templateDescription, sections, scheduleEnabled, scheduleFrequency, scheduleTime, scheduleRecipients, onSaveTemplate]);

  const previewTemplate = useCallback(() => {
    if (!templateName.trim() || sections.length === 0) {
      Alert.alert('Error', 'Please complete the template before previewing');
      return;
    }

    const template: ReportTemplate = {
      id: 'preview',
      name: templateName,
      description: templateDescription,
      sections: sections.map(section => ({
        id: section.id,
        title: section.title,
        type: section.type,
        dataSource: section.dataSource,
        chartType: section.chartType,
        columns: section.columns,
        filters: section.filters,
      })),
    };

    onPreviewTemplate(template);
  }, [templateName, templateDescription, sections, onPreviewTemplate]);

  const loadExistingTemplate = useCallback((template: ReportTemplate) => {
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setSections(
      template.sections.map(section => ({
        id: section.id,
        title: section.title,
        type: section.type,
        dataSource: section.dataSource,
        chartType: section.chartType,
        columns: section.columns,
        filters: section.filters || {},
      }))
    );

    if (template.schedule) {
      setScheduleEnabled(true);
      setScheduleFrequency(template.schedule.frequency);
      setScheduleTime(template.schedule.time);
      setScheduleRecipients(template.schedule.recipients.join(', '));
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Custom Report Builder</Text>
        <Text style={styles.subtitle}>Create personalized dashboard reports</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Template Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Report Name</Text>
            <TextInput
              style={styles.textInput}
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="Enter report name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={templateDescription}
              onChangeText={setTemplateDescription}
              placeholder="Describe what this report includes"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Existing Templates */}
        {existingTemplates.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Load Existing Template</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesList}>
              {existingTemplates.map(template => (
                <TouchableOpacity
                  key={template.id}
                  style={styles.templateCard}
                  onPress={() => loadExistingTemplate(template)}
                >
                  <Text style={styles.templateName}>{template.name}</Text>
                  <Text style={styles.templateDescription} numberOfLines={2}>
                    {template.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Report Sections */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Report Sections</Text>
            <TouchableOpacity style={styles.addButton} onPress={addSection}>
              <MaterialIcons name="add" size={20} color={MaterialColors.onPrimary} />
              <Text style={styles.addButtonText}>Add Section</Text>
            </TouchableOpacity>
          </View>

          {sections.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="description" size={48} color={MaterialColors.neutral[400]} />
              <Text style={styles.emptyText}>No sections added yet</Text>
              <Text style={styles.emptySubtext}>Click "Add Section" to start building your report</Text>
            </View>
          ) : (
            sections.map((section, index) => (
              <View key={section.id} style={styles.sectionCard}>
                <View style={styles.sectionCardHeader}>
                  <View style={styles.sectionControls}>
                    <TouchableOpacity
                      style={[styles.controlButton, index === 0 && styles.controlButtonDisabled]}
                      onPress={() => moveSection(section.id, 'up')}
                      disabled={index === 0}
                    >
                      <MaterialIcons name="arrow-upward" size={16} color={MaterialColors.neutral[600]} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.controlButton, index === sections.length - 1 && styles.controlButtonDisabled]}
                      onPress={() => moveSection(section.id, 'down')}
                      disabled={index === sections.length - 1}
                    >
                      <MaterialIcons name="arrow-downward" size={16} color={MaterialColors.neutral[600]} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeSection(section.id)}
                  >
                    <MaterialIcons name="delete" size={16} color={MaterialColors.error[500]} />
                  </TouchableOpacity>
                </View>

                <View style={styles.sectionContent}>
                  <TextInput
                    style={styles.sectionTitleInput}
                    value={section.title}
                    onChangeText={(value) => updateSection(section.id, { title: value })}
                    placeholder="Section title"
                  />

                  <View style={styles.sectionOptions}>
                    <View style={styles.optionRow}>
                      <Text style={styles.optionLabel}>Type:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsList}>
                        {(['summary', 'leads', 'performance', 'alerts', 'trends', 'custom'] as const).map(type => (
                          <TouchableOpacity
                            key={type}
                            style={[
                              styles.optionButton,
                              section.type === type && styles.optionButtonActive,
                            ]}
                            onPress={() => updateSection(section.id, { type })}
                          >
                            <Text
                              style={[
                                styles.optionText,
                                section.type === type && styles.optionTextActive,
                              ]}
                            >
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    <View style={styles.optionRow}>
                      <Text style={styles.optionLabel}>Data Source:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsList}>
                        {(['leads', 'performance', 'alerts', 'combined'] as const).map(source => (
                          <TouchableOpacity
                            key={source}
                            style={[
                              styles.optionButton,
                              section.dataSource === source && styles.optionButtonActive,
                            ]}
                            onPress={() => updateSection(section.id, { dataSource: source })}
                          >
                            <Text
                              style={[
                                styles.optionText,
                                section.dataSource === source && styles.optionTextActive,
                              ]}
                            >
                              {source.charAt(0).toUpperCase() + source.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    {section.type !== 'summary' && (
                      <View style={styles.optionRow}>
                        <Text style={styles.optionLabel}>Chart Type:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsList}>
                          {(['line', 'bar', 'pie', 'table'] as const).map(chart => (
                            <TouchableOpacity
                              key={chart}
                              style={[
                                styles.optionButton,
                                section.chartType === chart && styles.optionButtonActive,
                              ]}
                              onPress={() => updateSection(section.id, { chartType: chart })}
                            >
                              <Text
                                style={[
                                  styles.optionText,
                                  section.chartType === chart && styles.optionTextActive,
                                ]}
                              >
                                {chart.charAt(0).toUpperCase() + chart.slice(1)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    <View style={styles.filtersSection}>
                      <Text style={styles.filtersTitle}>Filters:</Text>
                      <View style={styles.filtersList}>
                        {Object.entries({
                          dateRange: 'Date Range',
                          leadScore: 'Lead Score',
                          conversionProbability: 'Conversion Probability',
                          dealValue: 'Deal Value',
                          tags: 'Tags',
                        }).map(([key, label]) => (
                          <TouchableOpacity
                            key={key}
                            style={[
                              styles.filterChip,
                              section.filters[key as keyof SectionBuilder['filters']] && styles.filterChipActive,
                            ]}
                            onPress={() => toggleFilter(section.id, key as keyof SectionBuilder['filters'])}
                          >
                            <Text
                              style={[
                                styles.filterText,
                                section.filters[key as keyof SectionBuilder['filters']] && styles.filterTextActive,
                              ]}
                            >
                              {label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Scheduling */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Scheduling</Text>
            <TouchableOpacity
              style={[styles.toggleButton, scheduleEnabled && styles.toggleButtonActive]}
              onPress={() => setScheduleEnabled(!scheduleEnabled)}
            >
              <MaterialIcons
                name={scheduleEnabled ? 'toggle-on' : 'toggle-off'}
                size={24}
                color={scheduleEnabled ? MaterialColors.primary[500] : MaterialColors.neutral[400]}
              />
            </TouchableOpacity>
          </View>

          {scheduleEnabled && (
            <View style={styles.scheduleOptions}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Frequency</Text>
                <View style={styles.frequencyOptions}>
                  {(['daily', 'weekly', 'monthly'] as const).map(freq => (
                    <TouchableOpacity
                      key={freq}
                      style={[
                        styles.frequencyButton,
                        scheduleFrequency === freq && styles.frequencyButtonActive,
                      ]}
                      onPress={() => setScheduleFrequency(freq)}
                    >
                      <Text
                        style={[
                          styles.frequencyText,
                          scheduleFrequency === freq && styles.frequencyTextActive,
                        ]}
                      >
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Time</Text>
                <TextInput
                  style={styles.timeInput}
                  value={scheduleTime}
                  onChangeText={setScheduleTime}
                  placeholder="09:00"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Recipients</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={scheduleRecipients}
                  onChangeText={setScheduleRecipients}
                  placeholder="email1@example.com, email2@example.com"
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.previewButton]}
          onPress={previewTemplate}
        >
          <MaterialIcons name="visibility" size={20} color={MaterialColors.primary[500]} />
          <Text style={styles.previewButtonText}>Preview Report</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.saveButton]}
          onPress={saveTemplate}
        >
          <MaterialIcons name="save" size={20} color={MaterialColors.onPrimary} />
          <Text style={styles.saveButtonText}>Save Template</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MaterialColors.surface,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: MaterialColors.neutral[200],
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: MaterialColors.onSurface,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: MaterialColors.neutral[600],
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: MaterialColors.onSurface,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: MaterialColors.neutral[700],
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: MaterialColors.onSurface,
    backgroundColor: MaterialColors.surface,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  templatesList: {
    marginBottom: 8,
  },
  templateCard: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[200],
    minWidth: 200,
  },
  templateName: {
    fontSize: 14,
    fontWeight: '600',
    color: MaterialColors.onSurface,
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 12,
    color: MaterialColors.neutral[600],
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MaterialColors.primary[500],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  addButtonText: {
    fontSize: 12,
    color: MaterialColors.onPrimary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: MaterialColors.onSurface,
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: MaterialColors.neutral[600],
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[200],
  },
  sectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionControls: {
    flexDirection: 'row',
    gap: 4,
  },
  controlButton: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: MaterialColors.neutral[100],
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
  removeButton: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: MaterialColors.error[50],
  },
  sectionContent: {
    gap: 12,
  },
  sectionTitleInput: {
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: MaterialColors.onSurface,
    backgroundColor: MaterialColors.surface,
    fontWeight: '500',
  },
  sectionOptions: {
    gap: 12,
  },
  optionRow: {
    gap: 8,
  },
  optionLabel: {
    fontSize: 14,
    color: MaterialColors.neutral[700],
    marginBottom: 6,
  },
  optionsList: {
    marginBottom: 4,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
    marginRight: 8,
  },
  optionButtonActive: {
    backgroundColor: MaterialColors.primary[500],
    borderColor: MaterialColors.primary[500],
  },
  optionText: {
    fontSize: 12,
    color: MaterialColors.neutral[600],
  },
  optionTextActive: {
    color: MaterialColors.onPrimary,
  },
  filtersSection: {
    marginTop: 8,
  },
  filtersTitle: {
    fontSize: 14,
    color: MaterialColors.neutral[700],
    marginBottom: 8,
  },
  filtersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
  },
  filterChipActive: {
    backgroundColor: MaterialColors.primary[500],
    borderColor: MaterialColors.primary[500],
  },
  filterText: {
    fontSize: 12,
    color: MaterialColors.neutral[600],
  },
  filterTextActive: {
    color: MaterialColors.onPrimary,
  },
  toggleButton: {
    padding: 8,
  },
  toggleButtonActive: {
    // Active state styling if needed
  },
  scheduleOptions: {
    gap: 16,
  },
  frequencyOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
  },
  frequencyButtonActive: {
    backgroundColor: MaterialColors.primary[500],
    borderColor: MaterialColors.primary[500],
  },
  frequencyText: {
    fontSize: 14,
    color: MaterialColors.neutral[600],
  },
  frequencyTextActive: {
    color: MaterialColors.onPrimary,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: MaterialColors.onSurface,
    backgroundColor: MaterialColors.surface,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: MaterialColors.neutral[200],
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  previewButton: {
    backgroundColor: MaterialColors.surface,
    borderWidth: 1,
    borderColor: MaterialColors.primary[500],
  },
  previewButtonText: {
    fontSize: 14,
    color: MaterialColors.primary[500],
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: MaterialColors.primary[500],
  },
  saveButtonText: {
    fontSize: 14,
    color: MaterialColors.onPrimary,
    fontWeight: '500',
  },
});

export default CustomReportBuilder;