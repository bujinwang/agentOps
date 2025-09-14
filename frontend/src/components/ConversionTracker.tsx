import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  ConversionEventTemplate,
  CONVERSION_EVENT_TEMPLATES,
  ConversionEvent
} from '../types/conversion';
import { useConversionTracking } from '../hooks/useConversionTracking';
import { conversionApiService, ConversionEventData } from '../services/conversionApiService';

interface ConversionTrackerProps {
  leadId: number;
  leadName: string;
  currentStatus?: string;
  onEventLogged?: (event: ConversionEvent) => void;
  onStatusChanged?: (newStatus: string) => void;
}

const ConversionTracker: React.FC<ConversionTrackerProps> = ({
  leadId,
  leadName,
  currentStatus = 'lead_created',
  onEventLogged,
  onStatusChanged
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ConversionEventTemplate | null>(null);
  const [eventData, setEventData] = useState<Record<string, any>>({});
  const [customDescription, setCustomDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { logEvent, isLoading, error, clearError } = useConversionTracking({ leadId });

  // Get available event templates based on current status
  const getAvailableTemplates = (): ConversionEventTemplate[] => {
    const statusOrder = [
      'lead_created',
      'contact_made',
      'qualified',
      'showing_scheduled',
      'showing_completed',
      'offer_submitted',
      'offer_accepted',
      'sale_closed'
    ];

    const currentIndex = statusOrder.indexOf(currentStatus);
    return CONVERSION_EVENT_TEMPLATES.filter(template => {
      const templateIndex = statusOrder.indexOf(template.type);
      return templateIndex > currentIndex;
    });
  };

  const handleTemplateSelect = (template: ConversionEventTemplate) => {
    setSelectedTemplate(template);
    setEventData({});
    setCustomDescription('');
  };

  const handleFieldChange = (field: string, value: any) => {
    setEventData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateEventData = (): boolean => {
    if (!selectedTemplate) return false;

    // Check required fields
    if (selectedTemplate.requiredFields) {
      for (const field of selectedTemplate.requiredFields) {
        if (!eventData[field] || eventData[field].toString().trim() === '') {
          Alert.alert('Validation Error', `Please fill in the ${field} field`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmitEvent = async () => {
    if (!selectedTemplate || !validateEventData()) return;

    setIsSubmitting(true);
    clearError();

    try {
      const eventPayload: ConversionEventData = {
        eventType: selectedTemplate.type,
        eventDescription: customDescription || selectedTemplate.description,
        eventData: {
          ...eventData,
          leadName,
          previousStatus: currentStatus
        },
        userId: 1 // TODO: Get from auth context
      };

      const result = await logEvent(eventPayload);

      if (result) {
        Alert.alert(
          'Success',
          'Conversion event logged successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                setIsModalVisible(false);
                setSelectedTemplate(null);
                setEventData({});
                setCustomDescription('');

                // Notify parent component
                if (onEventLogged && result) {
                  // Create a partial ConversionEvent for callback
                  const eventForCallback: Partial<ConversionEvent> = {
                    leadId,
                    eventType: selectedTemplate.type,
                    eventDescription: customDescription || selectedTemplate.description,
                    eventData: {
                      ...eventData,
                      leadName,
                      previousStatus: currentStatus
                    },
                    eventTimestamp: new Date().toISOString()
                  };
                  onEventLogged(eventForCallback as ConversionEvent);
                }

                // Update status if this event changes the conversion stage
                if (onStatusChanged && selectedTemplate) {
                  onStatusChanged(selectedTemplate.type);
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to log conversion event. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderEventForm = () => {
    if (!selectedTemplate) return null;

    return (
      <ScrollView style={{ maxHeight: 300 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
          {selectedTemplate.name}
        </Text>
        <Text style={{ fontSize: 14, color: '#666', marginBottom: 15 }}>
          {selectedTemplate.description}
        </Text>

        {/* Custom Description */}
        <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 5 }}>
          Event Description (Optional)
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 8,
            padding: 10,
            marginBottom: 15,
            minHeight: 60,
            textAlignVertical: 'top'
          }}
          placeholder="Add custom notes about this event..."
          value={customDescription}
          onChangeText={setCustomDescription}
          multiline
        />

        {/* Required Fields */}
        {selectedTemplate.requiredFields?.map(field => (
          <View key={field} style={{ marginBottom: 15 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 5 }}>
              {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                padding: 10
              }}
              placeholder={`Enter ${field}`}
              value={eventData[field] || ''}
              onChangeText={(value) => handleFieldChange(field, value)}
            />
          </View>
        ))}

        {/* Additional Data Fields */}
        <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 5 }}>
          Additional Information (Optional)
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 8,
            padding: 10,
            minHeight: 60,
            textAlignVertical: 'top'
          }}
          placeholder="Any additional details..."
          value={eventData.notes || ''}
          onChangeText={(value) => handleFieldChange('notes', value)}
          multiline
        />
      </ScrollView>
    );
  };

  return (
    <View>
      {/* Main Action Button */}
      <TouchableOpacity
        style={{
          backgroundColor: '#1976D2',
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onPress={() => setIsModalVisible(true)}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
              Log Conversion Event
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Current Status Display */}
      <View style={{
        marginTop: 10,
        padding: 10,
        backgroundColor: '#f5f5f5',
        borderRadius: 6,
        alignItems: 'center'
      }}>
        <Text style={{ fontSize: 12, color: '#666' }}>Current Status</Text>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginTop: 2 }}>
          {currentStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Text>
      </View>

      {/* Error Display */}
      {error && (
        <View style={{
          marginTop: 10,
          padding: 10,
          backgroundColor: '#ffebee',
          borderRadius: 6,
          borderLeftWidth: 4,
          borderLeftColor: '#f44336'
        }}>
          <Text style={{ color: '#c62828', fontSize: 14 }}>{error}</Text>
          <TouchableOpacity
            style={{ marginTop: 5 }}
            onPress={clearError}
          >
            <Text style={{ color: '#1976D2', fontSize: 12 }}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Event Logging Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 20,
            maxHeight: '80%'
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20
            }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
                Log Conversion Event
              </Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {!selectedTemplate ? (
              <ScrollView>
                <Text style={{ fontSize: 16, marginBottom: 15 }}>
                  Select an event type for {leadName}:
                </Text>
                {getAvailableTemplates().map(template => (
                  <TouchableOpacity
                    key={template.type}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 15,
                      borderWidth: 1,
                      borderColor: '#e0e0e0',
                      borderRadius: 8,
                      marginBottom: 10,
                      backgroundColor: '#f9f9f9'
                    }}
                    onPress={() => handleTemplateSelect(template)}
                  >
                    <View style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: template.color,
                      marginRight: 12
                    }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600' }}>
                        {template.name}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
                        {template.description}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color="#666" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View>
                {renderEventForm()}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: 20
                }}>
                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: '#ddd',
                      borderRadius: 6
                    }}
                    onPress={() => setSelectedTemplate(null)}
                  >
                    <Text style={{ color: '#666' }}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#1976D2',
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 6,
                      opacity: isSubmitting ? 0.6 : 1
                    }}
                    onPress={handleSubmitEvent}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: '600' }}>
                        Log Event
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ConversionTracker;