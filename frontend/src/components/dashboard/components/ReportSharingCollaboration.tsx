import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MaterialColors } from '../../../styles/MaterialDesign';
import { ReportTemplate } from '../../../services/exportService';

interface SharedReport {
  id: string;
  reportId: string;
  reportName: string;
  sharedBy: {
    id: string;
    name: string;
    email: string;
  };
  sharedWith: {
    id: string;
    name: string;
    email: string;
    role: 'viewer' | 'editor' | 'admin';
  }[];
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
  };
  sharedAt: Date;
  expiresAt?: Date;
  accessCount: number;
  lastAccessed?: Date;
}

interface CollaborationSession {
  id: string;
  reportId: string;
  reportName: string;
  participants: {
    id: string;
    name: string;
    email: string;
    role: 'owner' | 'editor' | 'viewer';
    joinedAt: Date;
    lastActivity: Date;
    isOnline: boolean;
  }[];
  createdAt: Date;
  lastActivity: Date;
  status: 'active' | 'paused' | 'ended';
}

interface ReportSharingCollaborationProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
  };
  sharedReports: SharedReport[];
  collaborationSessions: CollaborationSession[];
  onShareReport: (reportId: string, shareOptions: ShareOptions) => Promise<void>;
  onUpdatePermissions: (reportId: string, userId: string, permissions: any) => Promise<void>;
  onRevokeAccess: (reportId: string, userId: string) => Promise<void>;
  onStartCollaboration: (reportId: string) => Promise<string>;
  onJoinCollaboration: (sessionId: string) => Promise<void>;
  onLeaveCollaboration: (sessionId: string) => Promise<void>;
  onSendCollaborationMessage: (sessionId: string, message: string) => Promise<void>;
}

interface ShareOptions {
  users: string[];
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
  };
  expiresAt?: Date;
  message?: string;
}

const ReportSharingCollaboration: React.FC<ReportSharingCollaborationProps> = ({
  currentUser,
  sharedReports,
  collaborationSessions,
  onShareReport,
  onUpdatePermissions,
  onRevokeAccess,
  onStartCollaboration,
  onJoinCollaboration,
  onLeaveCollaboration,
  onSendCollaborationMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'sharing' | 'collaboration'>('sharing');
  const [shareModal, setShareModal] = useState<{
    visible: boolean;
    reportId: string;
    reportName: string;
  }>({ visible: false, reportId: '', reportName: '' });
  const [shareOptions, setShareOptions] = useState<ShareOptions>({
    users: [],
    permissions: {
      canView: true,
      canEdit: false,
      canDelete: false,
      canShare: false,
    },
    message: '',
  });
  const [userSearch, setUserSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');

  // Mock user search results - in real app, this would come from API
  const searchUsers = useCallback((query: string) => {
    if (!query.trim()) return [];

    // Mock users - replace with actual API call
    const mockUsers = [
      { id: '1', name: 'Alice Johnson', email: 'alice@company.com' },
      { id: '2', name: 'Bob Smith', email: 'bob@company.com' },
      { id: '3', name: 'Carol Davis', email: 'carol@company.com' },
      { id: '4', name: 'David Wilson', email: 'david@company.com' },
    ];

    return mockUsers.filter(user =>
      user.name.toLowerCase().includes(query.toLowerCase()) ||
      user.email.toLowerCase().includes(query.toLowerCase())
    );
  }, []);

  const handleShareReport = useCallback(async () => {
    if (selectedUsers.length === 0) {
      Alert.alert('Error', 'Please select at least one user to share with');
      return;
    }

    try {
      await onShareReport(shareModal.reportId, {
        ...shareOptions,
        users: selectedUsers,
      });

      Alert.alert('Success', `Report shared with ${selectedUsers.length} user(s)`);
      setShareModal({ visible: false, reportId: '', reportName: '' });
      setSelectedUsers([]);
      setShareOptions({
        users: [],
        permissions: {
          canView: true,
          canEdit: false,
          canDelete: false,
          canShare: false,
        },
        message: '',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share report. Please try again.');
    }
  }, [shareModal, shareOptions, selectedUsers, onShareReport]);

  const handleStartCollaboration = useCallback(async (reportId: string, reportName: string) => {
    try {
      const sessionId = await onStartCollaboration(reportId);
      setActiveSession(sessionId);
      Alert.alert('Success', `Collaboration session started for "${reportName}"`);
    } catch (error) {
      Alert.alert('Error', 'Failed to start collaboration session');
    }
  }, [onStartCollaboration]);

  const handleSendMessage = useCallback(async () => {
    if (!chatMessage.trim() || !activeSession) return;

    try {
      await onSendCollaborationMessage(activeSession, chatMessage);
      setChatMessage('');
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
  }, [activeSession, chatMessage, onSendCollaborationMessage]);

  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  }, []);

  const togglePermission = useCallback((permission: keyof ShareOptions['permissions']) => {
    setShareOptions(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: !prev.permissions[permission],
      },
    }));
  }, []);

  const getPermissionIcon = (permission: keyof ShareOptions['permissions']) => {
    switch (permission) {
      case 'canView':
        return 'visibility';
      case 'canEdit':
        return 'edit';
      case 'canDelete':
        return 'delete';
      case 'canShare':
        return 'share';
      default:
        return 'settings';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return MaterialColors.error[500];
      case 'editor':
        return MaterialColors.primary[500];
      case 'viewer':
        return MaterialColors.secondary[500];
      default:
        return MaterialColors.neutral[500];
    }
  };

  const renderShareModal = () => {
    if (!shareModal.visible) return null;

    const searchResults = searchUsers(userSearch);

    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Share "{shareModal.reportName}"</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShareModal({ visible: false, reportId: '', reportName: '' })}
            >
              <MaterialIcons name="close" size={24} color={MaterialColors.neutral[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* User Search */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Search Users</Text>
              <TextInput
                style={styles.searchInput}
                value={userSearch}
                onChangeText={setUserSearch}
                placeholder="Search by name or email"
              />
            </View>

            {/* User Selection */}
            {searchResults.length > 0 && (
              <View style={styles.userList}>
                {searchResults.map(user => (
                  <TouchableOpacity
                    key={user.id}
                    style={[
                      styles.userItem,
                      selectedUsers.includes(user.id) && styles.userItemSelected,
                    ]}
                    onPress={() => toggleUserSelection(user.id)}
                  >
                    <View style={styles.userAvatar}>
                      <Text style={styles.userInitials}>
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.name}</Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                    </View>
                    {selectedUsers.includes(user.id) && (
                      <MaterialIcons name="check-circle" size={20} color={MaterialColors.primary[500]} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Permissions */}
            <View style={styles.permissionsSection}>
              <Text style={styles.sectionTitle}>Permissions</Text>
              {Object.entries(shareOptions.permissions).map(([key, value]) => (
                <TouchableOpacity
                  key={key}
                  style={styles.permissionItem}
                  onPress={() => togglePermission(key as keyof ShareOptions['permissions'])}
                >
                  <MaterialIcons
                    name={getPermissionIcon(key as keyof ShareOptions['permissions'])}
                    size={20}
                    color={value ? MaterialColors.primary[500] : MaterialColors.neutral[400]}
                  />
                  <Text style={styles.permissionText}>
                    {key.replace('can', '').replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </Text>
                  <MaterialIcons
                    name={value ? 'check-box' : 'check-box-outline-blank'}
                    size={20}
                    color={value ? MaterialColors.primary[500] : MaterialColors.neutral[400]}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Message */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Message (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={shareOptions.message}
                onChangeText={(value) => setShareOptions(prev => ({ ...prev, message: value }))}
                placeholder="Add a message to the recipients"
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShareModal({ visible: false, reportId: '', reportName: '' })}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.shareButton]}
              onPress={handleShareReport}
            >
              <Text style={styles.shareButtonText}>Share Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Report Sharing & Collaboration</Text>
        <Text style={styles.subtitle}>Share reports and collaborate with your team</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {(['sharing', 'collaboration'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.tabActive,
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'sharing' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Shared Reports</Text>

            {sharedReports.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="share" size={48} color={MaterialColors.neutral[400]} />
                <Text style={styles.emptyText}>No shared reports yet</Text>
                <Text style={styles.emptySubtext}>Reports you share will appear here</Text>
              </View>
            ) : (
              sharedReports.map(report => (
                <View key={report.id} style={styles.reportCard}>
                  <View style={styles.reportHeader}>
                    <View style={styles.reportInfo}>
                      <Text style={styles.reportName}>{report.reportName}</Text>
                      <Text style={styles.reportMeta}>
                        Shared by {report.sharedBy.name} • {report.accessCount} views
                      </Text>
                    </View>
                    <View style={styles.reportActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleStartCollaboration(report.reportId, report.reportName)}
                      >
                        <MaterialIcons name="group" size={16} color={MaterialColors.primary[500]} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.sharedWith}>
                    <Text style={styles.sharedWithTitle}>Shared with:</Text>
                    <View style={styles.sharedUsers}>
                      {report.sharedWith.slice(0, 3).map(user => (
                        <View key={user.id} style={styles.sharedUser}>
                          <View style={styles.userAvatarSmall}>
                            <Text style={styles.userInitialsSmall}>
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </Text>
                          </View>
                          <Text style={styles.sharedUserName}>{user.name}</Text>
                          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
                            <Text style={styles.roleText}>{user.role}</Text>
                          </View>
                        </View>
                      ))}
                      {report.sharedWith.length > 3 && (
                        <Text style={styles.moreUsers}>+{report.sharedWith.length - 3} more</Text>
                      )}
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'collaboration' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Active Collaboration Sessions</Text>

            {collaborationSessions.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="groups" size={48} color={MaterialColors.neutral[400]} />
                <Text style={styles.emptyText}>No active collaboration sessions</Text>
                <Text style={styles.emptySubtext}>Start collaborating on reports with your team</Text>
              </View>
            ) : (
              collaborationSessions.map(session => (
                <View key={session.id} style={styles.sessionCard}>
                  <View style={styles.sessionHeader}>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionName}>{session.reportName}</Text>
                      <Text style={styles.sessionMeta}>
                        {session.participants.length} participants • Last activity {session.lastActivity.toLocaleTimeString()}
                      </Text>
                    </View>
                    <View style={styles.sessionStatus}>
                      <View style={[styles.statusIndicator, { backgroundColor: getRoleColor('viewer') }]} />
                      <Text style={styles.statusText}>{session.status}</Text>
                    </View>
                  </View>

                  <View style={styles.participants}>
                    {session.participants.slice(0, 4).map(participant => (
                      <View key={participant.id} style={styles.participant}>
                        <View style={[styles.participantAvatar, participant.isOnline && styles.participantOnline]}>
                          <Text style={styles.participantInitials}>
                            {participant.name.split(' ').map(n => n[0]).join('')}
                          </Text>
                        </View>
                        <Text style={styles.participantName}>{participant.name}</Text>
                      </View>
                    ))}
                  </View>

                  {activeSession === session.id && (
                    <View style={styles.chatSection}>
                      <View style={styles.chatInput}>
                        <TextInput
                          style={styles.chatTextInput}
                          value={chatMessage}
                          onChangeText={setChatMessage}
                          placeholder="Type a message..."
                          onSubmitEditing={handleSendMessage}
                        />
                        <TouchableOpacity
                          style={styles.sendButton}
                          onPress={handleSendMessage}
                        >
                          <MaterialIcons name="send" size={20} color={MaterialColors.onPrimary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <View style={styles.sessionActions}>
                    {activeSession === session.id ? (
                      <TouchableOpacity
                        style={[styles.sessionButton, styles.leaveButton]}
                        onPress={() => onLeaveCollaboration(session.id)}
                      >
                        <Text style={styles.leaveButtonText}>Leave Session</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.sessionButton, styles.joinButton]}
                        onPress={() => onJoinCollaboration(session.id)}
                      >
                        <Text style={styles.joinButtonText}>Join Session</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Share Modal */}
      {renderShareModal()}
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: MaterialColors.neutral[200],
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  tabActive: {
    backgroundColor: MaterialColors.primary[500],
  },
  tabText: {
    fontSize: 14,
    color: MaterialColors.neutral[600],
    fontWeight: '500',
  },
  tabTextActive: {
    color: MaterialColors.onPrimary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  tabContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: MaterialColors.onSurface,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
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
  reportCard: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[200],
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportName: {
    fontSize: 16,
    fontWeight: '600',
    color: MaterialColors.onSurface,
    marginBottom: 4,
  },
  reportMeta: {
    fontSize: 12,
    color: MaterialColors.neutral[600],
  },
  reportActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: MaterialColors.neutral[100],
  },
  sharedWith: {
    borderTopWidth: 1,
    borderTopColor: MaterialColors.neutral[100],
    paddingTop: 12,
  },
  sharedWithTitle: {
    fontSize: 14,
    color: MaterialColors.neutral[700],
    marginBottom: 8,
  },
  sharedUsers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sharedUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userAvatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: MaterialColors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitialsSmall: {
    fontSize: 10,
    color: MaterialColors.onPrimary,
    fontWeight: 'bold',
  },
  sharedUserName: {
    fontSize: 12,
    color: MaterialColors.onSurface,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 10,
    color: MaterialColors.onPrimary,
    fontWeight: 'bold',
  },
  moreUsers: {
    fontSize: 12,
    color: MaterialColors.neutral[600],
    fontStyle: 'italic',
  },
  sessionCard: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[200],
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '600',
    color: MaterialColors.onSurface,
    marginBottom: 4,
  },
  sessionMeta: {
    fontSize: 12,
    color: MaterialColors.neutral[600],
  },
  sessionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: MaterialColors.neutral[600],
    fontWeight: '500',
  },
  participants: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  participant: {
    alignItems: 'center',
    gap: 4,
  },
  participantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: MaterialColors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantOnline: {
    borderWidth: 2,
    borderColor: MaterialColors.secondary[500],
  },
  participantInitials: {
    fontSize: 12,
    color: MaterialColors.onPrimary,
    fontWeight: 'bold',
  },
  participantName: {
    fontSize: 10,
    color: MaterialColors.neutral[600],
  },
  chatSection: {
    borderTopWidth: 1,
    borderTopColor: MaterialColors.neutral[100],
    paddingTop: 12,
  },
  chatInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: MaterialColors.onSurface,
    backgroundColor: MaterialColors.surface,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: MaterialColors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  sessionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  joinButton: {
    backgroundColor: MaterialColors.primary[500],
  },
  joinButtonText: {
    fontSize: 12,
    color: MaterialColors.onPrimary,
    fontWeight: '500',
  },
  leaveButton: {
    backgroundColor: MaterialColors.error[500],
  },
  leaveButtonText: {
    fontSize: 12,
    color: MaterialColors.onPrimary,
    fontWeight: '500',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: MaterialColors.neutral[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: MaterialColors.onSurface,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: MaterialColors.neutral[700],
    marginBottom: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: MaterialColors.onSurface,
    backgroundColor: MaterialColors.surface,
  },
  userList: {
    marginBottom: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: MaterialColors.neutral[200],
  },
  userItemSelected: {
    backgroundColor: MaterialColors.primary[50],
    borderColor: MaterialColors.primary[500],
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: MaterialColors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInitials: {
    fontSize: 14,
    color: MaterialColors.onPrimary,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    color: MaterialColors.onSurface,
    fontWeight: '500',
  },
  userEmail: {
    fontSize: 12,
    color: MaterialColors.neutral[600],
  },
  permissionsSection: {
    marginBottom: 16,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  permissionText: {
    flex: 1,
    fontSize: 14,
    color: MaterialColors.onSurface,
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
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: MaterialColors.neutral[200],
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: MaterialColors.neutral[100],
    borderWidth: 1,
    borderColor: MaterialColors.neutral[300],
  },
  cancelButtonText: {
    fontSize: 14,
    color: MaterialColors.neutral[700],
    fontWeight: '500',
  },
  shareButton: {
    backgroundColor: MaterialColors.primary[500],
  },
  shareButtonText: {
    fontSize: 14,
    color: MaterialColors.onPrimary,
    fontWeight: '500',
  },
});

export default ReportSharingCollaboration;