// Lead detail screen with enhanced Material Design layout and interactions

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';

import { Lead, LeadStatus } from '../../types';
import { apiService } from '../../services/api';
import { formatCurrency, formatPhoneNumber } from '../../utils/validation';
import {
  MaterialColors,
  MaterialElevation,
  MaterialSpacing,
  MaterialTypography,
  MaterialShape,
  MaterialMotion,
} from '../../styles/MaterialDesign';
import { BusinessIcon } from '../../components/MaterialIcon';
import { useLoadingState } from '../../utils/loadingState';
import { LeadDetailSkeleton } from '../../components/common/SkeletonCard';
import { InlineLoader } from '../../components/common/LoadingIndicator';
import { useScreenLayout } from '../../hooks/useScreenLayout';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface LeadDetailScreenProps {
  route: {
    params: {
      leadId: number;
    };
  };
  navigation: any;
}

const LeadDetailScreen: React.FC<LeadDetailScreenProps> = ({ route, navigation }) => {
  const { leadId } = route.params;
  const { containerStyle, responsive, theme } = useScreenLayout();

  const dynamicStyles = useMemo(() => ({
    button: { minHeight: responsive.getTouchTargetSize(44) },
    text: { fontSize: responsive.getResponsiveFontSize(16) },
  }), [responsive]);
  const [lead, setLead] = useState<Lead | null>(null);
  const loadingState = useLoadingState({ isLoading: true });
  const mutationLoadingState = useLoadingState();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [actionScaleAnim] = useState(new Animated.Value(1));

  const loadLeadDetail = useCallback(async () => {
    try {
      const response = await apiService.getLeadWithLoading(leadId, {
        onStart: () => loadingState.startLoading('Loading lead details…', { timeout: 15000 }),
        onProgress: loadingState.updateProgress,
        onComplete: loadingState.stopLoading,
        onError: (message) => loadingState.setError(message),
      });

      if (response?.data) {
        setLead(response.data);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load lead details';
      loadingState.setError(message);
    }
  }, [leadId, loadingState]);

  useEffect(() => {
    loadLeadDetail();
  }, [loadLeadDetail]);

  useEffect(() => {
    if (lead) {
      // Start entrance animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: MaterialMotion.duration.medium1,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: MaterialMotion.duration.medium2,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [lead]);


  const handleStatusChange = (newStatus: LeadStatus) => {
    Alert.alert(
      'Update Status',
      `Change lead status to "${newStatus}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: () => updateLeadStatus(newStatus),
        },
      ]
    );
  };

  const updateLeadStatus = async (newStatus: LeadStatus) => {
    if (!lead) return;

    try {
      mutationLoadingState.startLoading('Updating lead status…');

      await apiService.updateLeadStatus(leadId, newStatus);
      setLead(prev => prev ? { ...prev, status: newStatus } : null);
      Alert.alert('Success', 'Lead status updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update status';
      mutationLoadingState.setError(message);
      Alert.alert('Error', message);
    } finally {
      mutationLoadingState.stopLoading();
    }
  };

  const navigateToEdit = () => {
    navigation.navigate('EditLead', { leadId });
  };

  const animateActionPress = () => {
    Animated.sequence([
      Animated.timing(actionScaleAnim, {
        toValue: 0.95,
        duration: MaterialMotion.duration.short2,
        useNativeDriver: true,
      }),
      Animated.timing(actionScaleAnim, {
        toValue: 1,
        duration: MaterialMotion.duration.short2,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getStatusColor = (status: LeadStatus): string => {
    const colors = {
      'New': MaterialColors.secondary[500],
      'Contacted': MaterialColors.warning[500],
      'Qualified': MaterialColors.primary[500],
      'Showing Scheduled': MaterialColors.neutral[600],
      'Offer Made': MaterialColors.error[500],
      'Closed Won': MaterialColors.secondary[700],
      'Closed Lost': MaterialColors.error[600],
      'Archived': MaterialColors.neutral[400],
    };
    return colors[status] || MaterialColors.neutral[500];
  };

  const getPriorityColor = (priority: string): string => {
    const colors = {
      'High': MaterialColors.error[500],
      'Medium': MaterialColors.warning[500],
      'Low': MaterialColors.secondary[500],
    };
    return colors[priority as keyof typeof colors] || MaterialColors.neutral[500];
  };

  const statusOptions: LeadStatus[] = [
    'New',
    'Contacted',
    'Qualified',
    'Showing Scheduled',
    'Offer Made',
    'Closed Won',
    'Closed Lost',
    'Archived',
  ];

  if (loadingState.isLoading) {
    return (
      <View style={styles.skeletonContainer}>
        <LeadDetailSkeleton animated theme="auto" />
      </View>
    );
  }

  if (loadingState.error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Unable to load this lead</Text>
        <Text style={styles.errorMessage}>{loadingState.error}</Text>
        <View style={styles.errorActions}>
          <TouchableOpacity style={styles.retryButton} onPress={loadLeadDetail}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!lead) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Lead not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <Animated.View
        style={[
          styles.headerCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <Text style={styles.leadName}>
              {lead.firstName} {lead.lastName}
            </Text>
            <Text style={styles.leadEmail}>{lead.email}</Text>
            {lead.phoneNumber && (
              <View style={styles.contactRow}>
                <BusinessIcon
                  name="call"
                  size={16}
                  color={MaterialColors.neutral[600]}
                  state="default"
                />
                <Text style={styles.leadPhone}>
                  {formatPhoneNumber(lead.phoneNumber)}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.headerBadges}>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(lead.priority) }]}>
              <Text style={styles.priorityText}>{lead.priority}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statusContainer}>
          <BusinessIcon
            name="flag"
            size={16}
            color={getStatusColor(lead.status)}
            state="default"
          />
          <Text style={[styles.statusBadge, { color: getStatusColor(lead.status) }]}>
            {lead.status}
          </Text>
        </View>

        {mutationLoadingState.isLoading && (
          <View style={styles.inlineLoader}>
            <InlineLoader color="secondary" size="sm" accessibilityLabel="Updating lead status" />
            <Text style={styles.inlineLoaderText}>Updating lead status…</Text>
          </View>
        )}
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View
        style={[
          styles.actionCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <AnimatedTouchableOpacity
            style={[
              styles.actionButton,
              { transform: [{ scale: actionScaleAnim }] },
            ]}
            onPress={() => {
              animateActionPress();
              setTimeout(navigateToEdit, MaterialMotion.duration.short2);
            }}
          >
            <BusinessIcon
              name="edit"
              size={20}
              color={MaterialColors.primary[600]}
              state="default"
            />
            <Text style={styles.actionButtonText}>Edit</Text>
          </AnimatedTouchableOpacity>
          <AnimatedTouchableOpacity
            style={[
              styles.actionButton,
              { transform: [{ scale: actionScaleAnim }] },
            ]}
            onPress={() => {
              animateActionPress();
              setTimeout(() => {
                if (lead?.phoneNumber) {
                  Alert.alert('Call', `Call ${lead.phoneNumber}?`);
                }
              }, MaterialMotion.duration.short2);
            }}
          >
            <BusinessIcon
              name="call"
              size={20}
              color={MaterialColors.secondary[600]}
              state="default"
            />
            <Text style={styles.actionButtonText}>Call</Text>
          </AnimatedTouchableOpacity>
          <AnimatedTouchableOpacity
            style={[
              styles.actionButton,
              { transform: [{ scale: actionScaleAnim }] },
            ]}
            onPress={() => {
              animateActionPress();
              setTimeout(() => {
                if (lead?.email) {
                  Alert.alert('Email', `Send email to ${lead.email}?`);
                }
              }, MaterialMotion.duration.short2);
            }}
          >
            <BusinessIcon
              name="email"
              size={20}
              color={MaterialColors.neutral[700]}
              state="default"
            />
            <Text style={styles.actionButtonText}>Email</Text>
          </AnimatedTouchableOpacity>
        </View>
      </Animated.View>

      {/* Lead Scoring */}
      {lead.score && (
        <View style={styles.card}>
          <View style={styles.scoringHeader}>
            <Text style={styles.sectionTitle}>Lead Scoring</Text>
            <View style={[styles.scoreBadge, {
              backgroundColor: lead.scoreCategory === 'High' ? MaterialColors.secondary[600] :
                              lead.scoreCategory === 'Medium' ? MaterialColors.warning[600] :
                              MaterialColors.error[600]
            }]}>
              <BusinessIcon
                name="star"
                size={16}
                color={MaterialColors.onPrimary}
                state="active"
              />
              <Text style={styles.scoreText}>{lead.score}/100</Text>
              <Text style={styles.categoryText}>{lead.scoreCategory}</Text>
            </View>
          </View>

          {/* Scoring Breakdown */}
          {lead.scoreBreakdown && (
            <View style={styles.scoringBreakdown}>
              <Text style={styles.subsectionTitle}>Scoring Breakdown</Text>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Budget (30%):</Text>
                <Text style={styles.breakdownValue}>{lead.scoreBreakdown.budget}/30</Text>
              </View>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Timeline (25%):</Text>
                <Text style={styles.breakdownValue}>{lead.scoreBreakdown.timeline}/25</Text>
              </View>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Property Type (20%):</Text>
                <Text style={styles.breakdownValue}>{lead.scoreBreakdown.propertyType}/20</Text>
              </View>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Location (15%):</Text>
                <Text style={styles.breakdownValue}>{lead.scoreBreakdown.location}/15</Text>
              </View>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Engagement (10%):</Text>
                <Text style={styles.breakdownValue}>{lead.scoreBreakdown.engagement}/10</Text>
              </View>
            </View>
          )}

          {/* Manual Override */}
          <View style={styles.overrideSection}>
            <Text style={styles.subsectionTitle}>Manual Override</Text>
            {lead.manualScoreOverride ? (
              <View style={styles.overrideInfo}>
                <Text style={styles.overrideText}>
                  Manual Score: {lead.manualScoreOverride}/100
                </Text>
                {lead.manualScoreReason && (
                  <Text style={styles.overrideReason}>
                    Reason: {lead.manualScoreReason}
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.overrideButton}
                  onPress={() => Alert.alert('Override Score', 'Remove manual score override?')}
                >
                  <Text style={styles.overrideButtonText}>Remove Override</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.overrideButton}
                onPress={() => Alert.alert('Override Score', 'Set manual score override?')}
              >
                <Text style={styles.overrideButtonText}>Set Manual Score</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Scoring History */}
          {lead.scoreHistory && lead.scoreHistory.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.subsectionTitle}>Scoring History</Text>
              {lead.scoreHistory.slice(0, 5).map((history, index) => (
                <View key={index} style={styles.historyItem}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyScore}>{history.score}/100</Text>
                    <Text style={styles.historyDate}>
                      {new Date(history.calculatedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.historyTrigger}>{history.trigger}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Last Calculated */}
          {lead.scoreLastCalculated && (
            <Text style={styles.lastCalculated}>
              Last calculated: {new Date(lead.scoreLastCalculated).toLocaleString()}
            </Text>
          )}
        </View>
      )}

      {/* Property Requirements */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Property Requirements</Text>

        {(lead.budgetMin || lead.budgetMax) && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Budget Range:</Text>
            <Text style={styles.infoValue}>
              {formatCurrency(lead.budgetMin || 0)} - {formatCurrency(lead.budgetMax || 0)}
            </Text>
          </View>
        )}

        {lead.desiredLocation && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Preferred Location:</Text>
            <Text style={styles.infoValue}>{lead.desiredLocation}</Text>
          </View>
        )}

        {lead.propertyType && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Property Type:</Text>
            <Text style={styles.infoValue}>{lead.propertyType}</Text>
          </View>
        )}

        {lead.bedroomsMin && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Min Bedrooms:</Text>
            <Text style={styles.infoValue}>{lead.bedroomsMin}</Text>
          </View>
        )}

        {lead.bathroomsMin && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Min Bathrooms:</Text>
            <Text style={styles.infoValue}>{lead.bathroomsMin}</Text>
          </View>
        )}
      </View>

      {/* AI Summary */}
      {lead.aiSummary && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🤖 AI Summary</Text>
          <Text style={styles.aiSummaryText}>{lead.aiSummary}</Text>
        </View>
      )}

      {/* Notes */}
      {lead.notes && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{lead.notes}</Text>
        </View>
      )}

      {/* Lead Information */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Lead Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Source:</Text>
          <Text style={styles.infoValue}>{lead.source}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Created:</Text>
          <Text style={styles.infoValue}>
            {new Date(lead.createdAt).toLocaleDateString()} at{' '}
            {new Date(lead.createdAt).toLocaleTimeString()}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Last Updated:</Text>
          <Text style={styles.infoValue}>
            {new Date(lead.updatedAt).toLocaleDateString()} at{' '}
            {new Date(lead.updatedAt).toLocaleTimeString()}
          </Text>
        </View>

        {lead.lastContactedAt && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Contacted:</Text>
            <Text style={styles.infoValue}>
              {new Date(lead.lastContactedAt).toLocaleDateString()}
            </Text>
          </View>
        )}

        {lead.followUpDate && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Follow Up Date:</Text>
            <Text style={styles.infoValue}>
              {new Date(lead.followUpDate).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      {/* Status Update */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Update Status</Text>
        <View style={styles.statusGrid}>
          {statusOptions.map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusOption,
                lead.status === status && styles.statusOptionActive,
                mutationLoadingState.isLoading && styles.statusOptionDisabled,
              ]}
              onPress={() => handleStatusChange(status)}
              disabled={lead.status === status || mutationLoadingState.isLoading}
            >
              <Text
                style={[
                  styles.statusOptionText,
                  lead.status === status && styles.statusOptionTextActive,
                  mutationLoadingState.isLoading && styles.statusOptionTextDisabled,
                ]}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MaterialColors.neutral[50],
  },
  skeletonContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: MaterialSpacing.xl,
    backgroundColor: MaterialColors.neutral[50],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: MaterialColors.neutral[50],
  },
  errorTitle: {
    ...MaterialTypography.titleLarge,
    color: MaterialColors.error[600],
    marginBottom: MaterialSpacing.sm,
    textAlign: 'center',
    paddingHorizontal: MaterialSpacing.xl,
  },
  errorMessage: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
    textAlign: 'center',
    paddingHorizontal: MaterialSpacing.xl,
    marginBottom: MaterialSpacing.lg,
  },
  errorActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  errorText: {
    ...MaterialTypography.headlineSmall,
    color: MaterialColors.error[600],
  },
  retryButton: {
    backgroundColor: MaterialColors.primary[500],
    paddingHorizontal: MaterialSpacing.lg,
    paddingVertical: MaterialSpacing.sm,
    borderRadius: MaterialShape.small,
    marginHorizontal: MaterialSpacing.xs,
  },
  retryButtonText: {
    ...MaterialTypography.labelLarge,
    color: MaterialColors.onPrimary,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingHorizontal: MaterialSpacing.lg,
    paddingVertical: MaterialSpacing.sm,
    borderRadius: MaterialShape.small,
    backgroundColor: MaterialColors.neutral[200],
    marginHorizontal: MaterialSpacing.xs,
  },
  secondaryButtonText: {
    ...MaterialTypography.labelLarge,
    color: MaterialColors.neutral[700],
    fontWeight: '600',
  },
  headerCard: {
    backgroundColor: MaterialColors.surface,
    padding: MaterialSpacing.lg,
    margin: MaterialSpacing.md,
    marginBottom: MaterialSpacing.sm,
    borderRadius: MaterialShape.medium,
    ...MaterialElevation.level2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: MaterialSpacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  headerBadges: {
    alignItems: 'flex-end',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: MaterialSpacing.xs,
  },
  leadName: {
    ...MaterialTypography.headlineSmall,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.xs,
  },
  leadEmail: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
    marginBottom: MaterialSpacing.xs,
  },
  leadPhone: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
    marginLeft: MaterialSpacing.xs,
  },
  priorityBadge: {
    paddingHorizontal: MaterialSpacing.sm,
    paddingVertical: MaterialSpacing.xs,
    borderRadius: MaterialShape.full,
    marginBottom: MaterialSpacing.xs,
  },
  priorityText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.onPrimary,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: MaterialSpacing.sm,
  },
  statusBadge: {
    ...MaterialTypography.labelLarge,
    fontWeight: '600',
    marginLeft: MaterialSpacing.xs,
  },
  inlineLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: MaterialSpacing.sm,
  },
  inlineLoaderText: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
    marginLeft: MaterialSpacing.xs,
  },
  actionCard: {
    backgroundColor: MaterialColors.surface,
    padding: MaterialSpacing.lg,
    marginHorizontal: MaterialSpacing.md,
    marginBottom: MaterialSpacing.sm,
    borderRadius: MaterialShape.medium,
    ...MaterialElevation.level2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flex: 1,
    backgroundColor: MaterialColors.neutral[100],
    paddingVertical: MaterialSpacing.md,
    marginHorizontal: MaterialSpacing.xs,
    borderRadius: MaterialShape.medium,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
    minHeight: 60,
  },
  actionButtonText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.neutral[800],
    fontWeight: '500',
    marginTop: MaterialSpacing.xs,
  },
  card: {
    backgroundColor: MaterialColors.surface,
    padding: MaterialSpacing.lg,
    marginHorizontal: MaterialSpacing.md,
    marginBottom: MaterialSpacing.sm,
    borderRadius: MaterialShape.medium,
    ...MaterialElevation.level1,
  },
  sectionTitle: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: MaterialSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: MaterialColors.neutral[200],
  },
  infoLabel: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[900],
    flex: 2,
    textAlign: 'right',
  },
  aiSummaryText: {
    ...MaterialTypography.bodyLarge,
    color: MaterialColors.neutral[800],
    lineHeight: 24,
    fontStyle: 'italic',
  },
  notesText: {
    ...MaterialTypography.bodyLarge,
    color: MaterialColors.neutral[800],
    lineHeight: 24,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusOption: {
    width: '48%',
    paddingVertical: MaterialSpacing.md,
    paddingHorizontal: MaterialSpacing.md,
    marginBottom: MaterialSpacing.sm,
    borderRadius: MaterialShape.medium,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
    backgroundColor: MaterialColors.surface,
    alignItems: 'center',
    ...MaterialElevation.level1,
  },
  statusOptionActive: {
    backgroundColor: MaterialColors.primary[500],
    borderColor: MaterialColors.primary[500],
  },
  statusOptionDisabled: {
    opacity: 0.6,
  },
  statusOptionText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
    fontWeight: '500',
  },
  statusOptionTextActive: {
    color: MaterialColors.onPrimary,
  },
  statusOptionTextDisabled: {
    color: MaterialColors.neutral[400],
  },
  bottomSpacer: {
    height: MaterialSpacing.xxxl,
  },
  scoringHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.md,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    borderRadius: MaterialShape.full,
  },
  scoreText: {
    ...MaterialTypography.labelLarge,
    color: MaterialColors.onPrimary,
    fontWeight: '600',
    marginLeft: MaterialSpacing.xs,
  },
  categoryText: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.onPrimary,
    marginLeft: MaterialSpacing.sm,
  },
  subsectionTitle: {
    ...MaterialTypography.titleSmall,
    color: MaterialColors.neutral[800],
    marginBottom: MaterialSpacing.sm,
  },
  scoringBreakdown: {
    marginBottom: MaterialSpacing.lg,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: MaterialSpacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: MaterialColors.neutral[200],
  },
  breakdownLabel: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
    fontWeight: '500',
    flex: 1,
  },
  breakdownValue: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[900],
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  overrideSection: {
    marginBottom: MaterialSpacing.lg,
  },
  overrideInfo: {
    backgroundColor: MaterialColors.neutral[50],
    padding: MaterialSpacing.md,
    borderRadius: MaterialShape.medium,
    marginTop: MaterialSpacing.sm,
  },
  overrideText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[900],
    fontWeight: '600',
  },
  overrideReason: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
    marginTop: MaterialSpacing.xs,
  },
  overrideButton: {
    backgroundColor: MaterialColors.primary[500],
    paddingHorizontal: MaterialSpacing.lg,
    paddingVertical: MaterialSpacing.sm,
    borderRadius: MaterialShape.medium,
    alignItems: 'center',
    marginTop: MaterialSpacing.sm,
  },
  overrideButtonText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.onPrimary,
    fontWeight: '600',
  },
  historySection: {
    marginBottom: MaterialSpacing.lg,
  },
  historyItem: {
    backgroundColor: MaterialColors.neutral[50],
    padding: MaterialSpacing.md,
    borderRadius: MaterialShape.medium,
    marginBottom: MaterialSpacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MaterialSpacing.xs,
  },
  historyScore: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[900],
    fontWeight: '600',
  },
  historyDate: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
  },
  historyTrigger: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[500],
    fontStyle: 'italic',
  },
  lastCalculated: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[500],
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: MaterialSpacing.sm,
  },
});

export default LeadDetailScreen;
