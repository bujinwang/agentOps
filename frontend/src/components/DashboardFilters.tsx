import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

export interface DashboardFilterOptions {
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  agentId?: number;
  propertyType?: string;
  leadSource?: string;
  scoreRange: {
    min: number;
    max: number;
  };
  conversionStage?: string;
  leadStatus?: string;
}

interface DashboardFiltersProps {
  filters: DashboardFilterOptions;
  onFiltersChange: (filters: DashboardFilterOptions) => void;
  isVisible: boolean;
  onClose: () => void;
  availableAgents?: Array<{ id: number; name: string }>;
  availablePropertyTypes?: string[];
  availableLeadSources?: string[];
  availableStages?: string[];
  availableStatuses?: string[];
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  filters,
  onFiltersChange,
  isVisible,
  onClose,
  availableAgents = [],
  availablePropertyTypes = [],
  availableLeadSources = [],
  availableStages = [],
  availableStatuses = []
}) => {
  const [tempFilters, setTempFilters] = useState<DashboardFilterOptions>(filters);
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['dateRange']));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    setTempFilters(filters);
  }, [filters]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const updateFilter = (key: keyof DashboardFilterOptions, value: any) => {
    setTempFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateNestedFilter = (parent: keyof DashboardFilterOptions, key: string, value: any) => {
    setTempFilters(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] as any),
        [key]: value
      }
    }));
  };

  const applyFilters = () => {
    onFiltersChange(tempFilters);
    onClose();
  };

  const resetFilters = () => {
    const defaultFilters: DashboardFilterOptions = {
      dateRange: {
        start: null,
        end: null
      },
      scoreRange: {
        min: 0,
        max: 100
      }
    };
    setTempFilters(defaultFilters);
  };

  const clearDateRange = () => {
    updateFilter('dateRange', { start: null, end: null });
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderSection = (
    title: string,
    sectionKey: string,
    content: React.ReactNode,
    hasContent: boolean = true
  ) => {
    const isExpanded = expandedSections.has(sectionKey);

    return (
      <View style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2
      }}>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            borderBottomWidth: isExpanded ? 1 : 0,
            borderBottomColor: '#e9ecef'
          }}
          onPress={() => toggleSection(sectionKey)}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>
            {title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {hasContent && (
              <View style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#4CAF50',
                marginRight: 8
              }} />
            )}
            <MaterialIcons
              name={isExpanded ? 'expand-less' : 'expand-more'}
              size={20}
              color="#666"
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={{ padding: 16 }}>
            {content}
          </View>
        )}
      </View>
    );
  };

  const renderDateRangeSection = () => (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: '#f8f9fa',
            padding: 12,
            borderRadius: 8,
            marginRight: 8,
            borderWidth: 1,
            borderColor: '#e9ecef'
          }}
          onPress={() => setShowDatePicker('start')}
        >
          <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Start Date</Text>
          <Text style={{ fontSize: 14, color: '#333' }}>
            {formatDate(tempFilters.dateRange.start)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: '#f8f9fa',
            padding: 12,
            borderRadius: 8,
            marginLeft: 8,
            borderWidth: 1,
            borderColor: '#e9ecef'
          }}
          onPress={() => setShowDatePicker('end')}
        >
          <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>End Date</Text>
          <Text style={{ fontSize: 14, color: '#333' }}>
            {formatDate(tempFilters.dateRange.end)}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={{
          backgroundColor: '#f44336',
          padding: 8,
          borderRadius: 6,
          alignItems: 'center'
        }}
        onPress={clearDateRange}
      >
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
          Clear Date Range
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSelectSection = (
    title: string,
    value: string | number | undefined,
    options: Array<{ value: string | number; label: string }>,
    onSelect: (value: string | number | undefined) => void
  ) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', paddingVertical: 8 }}>
        <TouchableOpacity
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: value === undefined ? '#2196F3' : '#f5f5f5',
            marginRight: 8,
            borderWidth: 1,
            borderColor: value === undefined ? '#2196F3' : '#e9ecef'
          }}
          onPress={() => onSelect(undefined)}
        >
          <Text style={{
            fontSize: 14,
            color: value === undefined ? '#fff' : '#666',
            fontWeight: '500'
          }}>
            All {title}
          </Text>
        </TouchableOpacity>

        {options.map(option => (
          <TouchableOpacity
            key={option.value}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: value === option.value ? '#2196F3' : '#f5f5f5',
              marginRight: 8,
              borderWidth: 1,
              borderColor: value === option.value ? '#2196F3' : '#e9ecef'
            }}
            onPress={() => onSelect(option.value)}
          >
            <Text style={{
              fontSize: 14,
              color: value === option.value ? '#fff' : '#666',
              fontWeight: '500'
            }}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderScoreRangeSection = () => (
    <View>
      <Text style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>
        Lead Score Range: {tempFilters.scoreRange.min} - {tempFilters.scoreRange.max}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity
          style={{
            backgroundColor: '#f8f9fa',
            padding: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#e9ecef',
            minWidth: 80,
            alignItems: 'center'
          }}
          onPress={() => updateNestedFilter('scoreRange', 'min', Math.max(0, tempFilters.scoreRange.min - 10))}
        >
          <MaterialIcons name="remove" size={20} color="#666" />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center', marginHorizontal: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>
            {tempFilters.scoreRange.min} - {tempFilters.scoreRange.max}
          </Text>
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: '#f8f9fa',
            padding: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#e9ecef',
            minWidth: 80,
            alignItems: 'center'
          }}
          onPress={() => updateNestedFilter('scoreRange', 'max', Math.min(100, tempFilters.scoreRange.max + 10))}
        >
          <MaterialIcons name="add" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={{
          backgroundColor: '#4CAF50',
          padding: 8,
          borderRadius: 6,
          alignItems: 'center',
          marginTop: 12
        }}
        onPress={() => updateFilter('scoreRange', { min: 0, max: 100 })}
      >
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
          Reset to All Scores
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        {/* Header */}
        <View style={{
          backgroundColor: '#fff',
          padding: 16,
          paddingTop: 50,
          borderBottomWidth: 1,
          borderBottomColor: '#e9ecef',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#333' }}>
            Filter Dashboard
          </Text>
          <TouchableOpacity
            style={{
              padding: 8,
              borderRadius: 20,
              backgroundColor: '#f5f5f5'
            }}
            onPress={onClose}
          >
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Filter Sections */}
        <ScrollView style={{ flex: 1, padding: 16 }}>
          {renderSection(
            'Date Range',
            'dateRange',
            renderDateRangeSection(),
            tempFilters.dateRange.start !== null || tempFilters.dateRange.end !== null
          )}

          {availableAgents.length > 0 && renderSection(
            'Agent',
            'agent',
            renderSelectSection(
              'Agents',
              tempFilters.agentId,
              availableAgents.map(agent => ({ value: agent.id, label: agent.name })),
              (value) => updateFilter('agentId', value)
            ),
            tempFilters.agentId !== undefined
          )}

          {availablePropertyTypes.length > 0 && renderSection(
            'Property Type',
            'propertyType',
            renderSelectSection(
              'Types',
              tempFilters.propertyType,
              availablePropertyTypes.map(type => ({ value: type, label: type })),
              (value) => updateFilter('propertyType', value)
            ),
            tempFilters.propertyType !== undefined
          )}

          {availableLeadSources.length > 0 && renderSection(
            'Lead Source',
            'leadSource',
            renderSelectSection(
              'Sources',
              tempFilters.leadSource,
              availableLeadSources.map(source => ({ value: source, label: source })),
              (value) => updateFilter('leadSource', value)
            ),
            tempFilters.leadSource !== undefined
          )}

          {renderSection(
            'Lead Score',
            'scoreRange',
            renderScoreRangeSection(),
            tempFilters.scoreRange.min !== 0 || tempFilters.scoreRange.max !== 100
          )}

          {availableStages.length > 0 && renderSection(
            'Conversion Stage',
            'conversionStage',
            renderSelectSection(
              'Stages',
              tempFilters.conversionStage,
              availableStages.map(stage => ({ value: stage, label: stage })),
              (value) => updateFilter('conversionStage', value)
            ),
            tempFilters.conversionStage !== undefined
          )}

          {availableStatuses.length > 0 && renderSection(
            'Lead Status',
            'leadStatus',
            renderSelectSection(
              'Statuses',
              tempFilters.leadStatus,
              availableStatuses.map(status => ({ value: status, label: status })),
              (value) => updateFilter('leadStatus', value)
            ),
            tempFilters.leadStatus !== undefined
          )}
        </ScrollView>

        {/* Footer Actions */}
        <View style={{
          backgroundColor: '#fff',
          padding: 16,
          borderTopWidth: 1,
          borderTopColor: '#e9ecef',
          flexDirection: 'row',
          justifyContent: 'space-between'
        }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#f44336',
              padding: 12,
              borderRadius: 8,
              alignItems: 'center',
              marginRight: 8
            }}
            onPress={resetFilters}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              Reset All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#2196F3',
              padding: 12,
              borderRadius: 8,
              alignItems: 'center',
              marginLeft: 8
            }}
            onPress={applyFilters}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              Apply Filters
            </Text>
          </TouchableOpacity>
        </View>

        {/* Custom Date Picker Modal */}
        {showDatePicker && (
          <Modal
            visible={true}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowDatePicker(null)}
          >
            <View style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <View style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                padding: 20,
                width: screenWidth * 0.9,
                maxWidth: 400
              }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: 20,
                  textAlign: 'center'
                }}>
                  Select {showDatePicker === 'start' ? 'Start' : 'End'} Date
                </Text>

                {/* Simple date input for now - can be enhanced with a proper date picker */}
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#e9ecef',
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                    marginBottom: 20
                  }}
                  placeholder="YYYY-MM-DD"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChangeText={(text) => {
                    const date = new Date(text);
                    if (!isNaN(date.getTime())) {
                      setSelectedDate(date);
                    }
                  }}
                />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: '#f5f5f5',
                      padding: 12,
                      borderRadius: 8,
                      alignItems: 'center',
                      marginRight: 8
                    }}
                    onPress={() => setShowDatePicker(null)}
                  >
                    <Text style={{ color: '#666', fontSize: 16, fontWeight: '600' }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: '#2196F3',
                      padding: 12,
                      borderRadius: 8,
                      alignItems: 'center',
                      marginLeft: 8
                    }}
                    onPress={() => {
                      updateNestedFilter('dateRange', showDatePicker, selectedDate);
                      setShowDatePicker(null);
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                      Select
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

export default DashboardFilters;