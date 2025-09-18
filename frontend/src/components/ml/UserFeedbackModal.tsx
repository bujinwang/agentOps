import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { styles } from '../../styles/ml/UserFeedbackStyles';

interface UserFeedbackModalProps {
  leadId: number;
  currentScore: number;
  onSubmit: (feedback: {
    scoreAccuracy: 'accurate' | 'overestimated' | 'underestimated';
    confidenceLevel: 'appropriate' | 'too_high' | 'too_low';
    usefulFeatures: string[];
    missingFactors: string[];
    comments?: string;
  }) => Promise<void>;
  onClose: () => void;
  visible: boolean;
}

export const UserFeedbackModal: React.FC<UserFeedbackModalProps> = ({
  leadId,
  currentScore,
  onSubmit,
  onClose,
  visible
}) => {
  const [scoreAccuracy, setScoreAccuracy] = useState<'accurate' | 'overestimated' | 'underestimated' | null>(null);
  const [confidenceLevel, setConfidenceLevel] = useState<'appropriate' | 'too_high' | 'too_low' | null>(null);
  const [usefulFeatures, setUsefulFeatures] = useState<string[]>([]);
  const [missingFactors, setMissingFactors] = useState<string[]>([]);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const predefinedFeatures = [
    'Lead contact frequency',
    'Property budget range',
    'Timeline urgency',
    'Previous engagement history',
    'Lead source quality',
    'Demographic information',
    'Behavioral patterns'
  ];

  const predefinedFactors = [
    'Market conditions',
    'Competitor activity',
    'Economic indicators',
    'Seasonal trends',
    'Lead financial situation',
    'Property market timing',
    'Lead decision-making style'
  ];

  const handleFeatureToggle = (feature: string) => {
    setUsefulFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  const handleFactorToggle = (factor: string) => {
    setMissingFactors(prev =>
      prev.includes(factor)
        ? prev.filter(f => f !== factor)
        : [...prev, factor]
    );
  };

  const handleSubmit = async () => {
    if (!scoreAccuracy || !confidenceLevel) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        scoreAccuracy,
        confidenceLevel,
        usefulFeatures,
        missingFactors,
        comments: comments.trim() || undefined
      });

      // Reset form
      setScoreAccuracy(null);
      setConfidenceLevel(null);
      setUsefulFeatures([]);
      setMissingFactors([]);
      setComments('');
      onClose();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = scoreAccuracy && confidenceLevel && !isSubmitting;

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Provide ML Feedback</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Lead Info */}
          <View style={styles.leadInfo}>
            <Text style={styles.leadId}>Lead #{leadId}</Text>
            <Text style={styles.currentScore}>
              Current Score: {(currentScore * 100).toFixed(1)}%
            </Text>
          </View>

          {/* Score Accuracy */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How accurate is this score?</Text>
            <View style={styles.optionsGrid}>
              {[
                { value: 'accurate', label: 'Accurate', icon: 'check-circle' },
                { value: 'overestimated', label: 'Too High', icon: 'trending-up' },
                { value: 'underestimated', label: 'Too Low', icon: 'trending-down' }
              ].map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    scoreAccuracy === option.value && styles.optionButtonSelected
                  ]}
                  onPress={() => setScoreAccuracy(option.value as any)}
                >
                  <MaterialIcons
                    name={option.icon}
                    size={20}
                    color={scoreAccuracy === option.value ? '#FFFFFF' : '#007AFF'}
                  />
                  <Text style={[
                    styles.optionText,
                    scoreAccuracy === option.value && styles.optionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Confidence Level */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How confident does the model seem?</Text>
            <View style={styles.optionsGrid}>
              {[
                { value: 'appropriate', label: 'Appropriate', icon: 'balance' },
                { value: 'too_high', label: 'Too Confident', icon: 'warning' },
                { value: 'too_low', label: 'Not Confident Enough', icon: 'help' }
              ].map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    confidenceLevel === option.value && styles.optionButtonSelected
                  ]}
                  onPress={() => setConfidenceLevel(option.value as any)}
                >
                  <MaterialIcons
                    name={option.icon}
                    size={20}
                    color={confidenceLevel === option.value ? '#FFFFFF' : '#007AFF'}
                  />
                  <Text style={[
                    styles.optionText,
                    confidenceLevel === option.value && styles.optionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Useful Features */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Which features were most useful?</Text>
            <View style={styles.checkboxGrid}>
              {predefinedFeatures.map(feature => (
                <TouchableOpacity
                  key={feature}
                  style={[
                    styles.checkboxItem,
                    usefulFeatures.includes(feature) && styles.checkboxItemSelected
                  ]}
                  onPress={() => handleFeatureToggle(feature)}
                >
                  <View style={[
                    styles.checkbox,
                    usefulFeatures.includes(feature) && styles.checkboxSelected
                  ]}>
                    {usefulFeatures.includes(feature) && (
                      <MaterialIcons name="check" size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={[
                    styles.checkboxText,
                    usefulFeatures.includes(feature) && styles.checkboxTextSelected
                  ]}>
                    {feature}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Missing Factors */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What factors should be considered?</Text>
            <View style={styles.checkboxGrid}>
              {predefinedFactors.map(factor => (
                <TouchableOpacity
                  key={factor}
                  style={[
                    styles.checkboxItem,
                    missingFactors.includes(factor) && styles.checkboxItemSelected
                  ]}
                  onPress={() => handleFactorToggle(factor)}
                >
                  <View style={[
                    styles.checkbox,
                    missingFactors.includes(factor) && styles.checkboxSelected
                  ]}>
                    {missingFactors.includes(factor) && (
                      <MaterialIcons name="check" size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={[
                    styles.checkboxText,
                    missingFactors.includes(factor) && styles.checkboxTextSelected
                  ]}>
                    {factor}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Comments */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Comments (Optional)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Share any additional thoughts about this prediction..."
              value={comments}
              onChangeText={setComments}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton, !canSubmit && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};