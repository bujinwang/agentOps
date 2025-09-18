import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    maxHeight: 300,
  },
  historyItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginHorizontal: 4,
    marginVertical: 2,
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventDescription: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 18,
    marginBottom: 4,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventTimestamp: {
    fontSize: 12,
    color: '#8E8E93',
    marginRight: 8,
  },
  eventUser: {
    fontSize: 12,
    color: '#8E8E93',
  },
  workflowLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  workflowLinkText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
});