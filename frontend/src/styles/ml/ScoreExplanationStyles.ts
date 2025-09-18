import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scoreOverview: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  scoreDisplay: {
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  scoreBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownItem: {
    alignItems: 'center',
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 16,
  },
  featureContribution: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  featureInfo: {
    flex: 1,
  },
  featureName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 12,
    color: '#8E8E93',
  },
  contributionInfo: {
    alignItems: 'flex-end',
  },
  contributionValue: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  contributionPercent: {
    fontSize: 12,
    color: '#8E8E93',
  },
  contributionBar: {
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    overflow: 'hidden',
  },
  contributionFill: {
    height: '100%',
    borderRadius: 2,
  },
  similarLead: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  similarLeadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  outcomeIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  similarLeadInfo: {
    flex: 1,
  },
  similarLeadId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  similarityScore: {
    fontSize: 12,
    color: '#8E8E93',
  },
  similarLeadScore: {
    alignItems: 'center',
  },
  recommendation: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  recommendationIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  recommendationText: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
    flex: 1,
  },
  confidenceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confidenceMetric: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
});