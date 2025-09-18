import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  bulkButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#007AFF',
    marginTop: 8,
  },
  historySection: {
    padding: 16,
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
    color: '#1C1C1E',
  },
  viewAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  statusSection: {
    padding: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 16,
  },
  statusRules: {
    gap: 12,
  },
  statusRule: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
  },
  statusRuleText: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 18,
    flex: 1,
    marginLeft: 12,
  },
  statusRuleBold: {
    fontWeight: '600',
  },
});