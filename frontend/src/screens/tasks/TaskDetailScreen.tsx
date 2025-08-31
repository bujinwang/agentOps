// Task detail screen with edit and completion tracking

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { Task, TaskPriority } from '../../types';
import { apiService } from '../../services/api';

interface TaskDetailScreenProps {
  route: {
    params: {
      taskId: number;
    };
  };
  navigation: any;
}

const TaskDetailScreen: React.FC<TaskDetailScreenProps> = ({ route, navigation }) => {
  const { taskId } = route.params;
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTaskDetail();
  }, [taskId]);

  const loadTaskDetail = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getTask(taskId);
      setTask(response.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load task details';
      Alert.alert('Error', message, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTaskCompletion = async () => {
    if (!task) return;

    const newStatus = !task.isCompleted;
    const actionText = newStatus ? 'complete' : 'reopen';

    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${actionText} this task?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await apiService.updateTask(taskId, {
                is_completed: newStatus,
                completed_at: newStatus ? new Date().toISOString() : undefined,
              });

              setTask(prev => prev ? {
                ...prev,
                isCompleted: newStatus,
                completedAt: newStatus ? new Date().toISOString() : undefined,
              } : null);

              Alert.alert('Success', `Task ${actionText}d successfully`);
            } catch (error) {
              Alert.alert('Error', `Failed to ${actionText} task`);
            }
          },
        },
      ]
    );
  };

  const navigateToEdit = () => {
    navigation.navigate('EditTask', { taskId });
  };

  const navigateToLinkedLead = () => {
    if (task?.leadId) {
      navigation.navigate('Leads', { 
        screen: 'LeadDetail', 
        params: { leadId: task.leadId } 
      });
    }
  };

  const deleteTask = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteTask(taskId);
              Alert.alert('Success', 'Task deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  const getPriorityColor = (priority: TaskPriority): string => {
    switch (priority) {
      case 'High': return '#F44336';
      case 'Medium': return '#FF9800';
      case 'Low': return '#4CAF50';
      default: return '#999';
    }
  };

  const isOverdue = (dueDate: string | undefined): boolean => {
    if (!dueDate || task?.isCompleted) return false;
    return new Date(dueDate) < new Date();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading task details...</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Task not found</Text>
      </View>
    );
  }

  const overdue = isOverdue(task.dueDate);

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <Text style={[styles.taskTitle, task.isCompleted && styles.completedText]}>
              {task.title}
            </Text>
            {task.description && (
              <Text style={[styles.taskDescription, task.isCompleted && styles.completedText]}>
                {task.description}
              </Text>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={toggleTaskCompletion}
          >
            <View style={[styles.checkbox, task.isCompleted && styles.checkedBox]}>
              {task.isCompleted && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) }]}>
            {task.priority} Priority
          </Text>
          
          {task.isCompleted ? (
            <Text style={styles.completedBadge}>✅ Completed</Text>
          ) : overdue ? (
            <Text style={styles.overdueBadge}>⚠️ Overdue</Text>
          ) : (
            <Text style={styles.pendingBadge}>📋 Pending</Text>
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionCard}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={navigateToEdit}>
            <Text style={styles.actionButtonText}>✏️ Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={toggleTaskCompletion}
          >
            <Text style={styles.actionButtonText}>
              {task.isCompleted ? '🔄 Reopen' : '✅ Complete'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={deleteTask}
          >
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>🗑️ Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Task Details */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Task Details</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Priority:</Text>
          <View style={styles.infoValueRow}>
            <Text style={[styles.priorityDot, { backgroundColor: getPriorityColor(task.priority) }]}>
            </Text>
            <Text style={styles.infoValue}>{task.priority}</Text>
          </View>
        </View>

        {task.dueDate && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Due Date:</Text>
            <Text style={[styles.infoValue, overdue && styles.overdueText]}>
              {new Date(task.dueDate).toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
              {overdue && ' (Overdue)'}
            </Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status:</Text>
          <Text style={styles.infoValue}>
            {task.isCompleted ? 'Completed' : 'Pending'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Created:</Text>
          <Text style={styles.infoValue}>
            {new Date(task.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {task.completedAt && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Completed:</Text>
            <Text style={styles.infoValue}>
              {new Date(task.completedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        )}
      </View>

      {/* Linked Lead */}
      {task.leadId && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Linked Lead</Text>
          <TouchableOpacity style={styles.linkedLeadCard} onPress={navigateToLinkedLead}>
            <Text style={styles.linkedLeadIcon}>👤</Text>
            <View style={styles.linkedLeadInfo}>
              <Text style={styles.linkedLeadText}>View Associated Lead</Text>
              <Text style={styles.linkedLeadSubtext}>Tap to view lead details</Text>
            </View>
            <Text style={styles.linkedLeadArrow}>→</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Task History */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Task Timeline</Text>
        
        <View style={styles.timelineItem}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineTitle}>Task Created</Text>
            <Text style={styles.timelineDate}>
              {new Date(task.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        {task.updatedAt && task.updatedAt !== task.createdAt && (
          <View style={styles.timelineItem}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Last Updated</Text>
              <Text style={styles.timelineDate}>
                {new Date(task.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        )}

        {task.completedAt && (
          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, styles.completedDot]} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Task Completed</Text>
              <Text style={styles.timelineDate}>
                {new Date(task.completedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    color: '#f44336',
  },
  headerCard: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
    marginRight: 16,
  },
  taskTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  taskDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  checkboxContainer: {
    alignSelf: 'flex-start',
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkedBox: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkmark: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    alignSelf: 'flex-start',
  },
  completedBadge: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  overdueBadge: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '600',
  },
  pendingBadge: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
  },
  actionCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  deleteButtonText: {
    color: '#f44336',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '400',
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  overdueText: {
    color: '#F44336',
    fontWeight: '600',
  },
  linkedLeadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  linkedLeadIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  linkedLeadInfo: {
    flex: 1,
  },
  linkedLeadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  linkedLeadSubtext: {
    fontSize: 14,
    color: '#666',
  },
  linkedLeadArrow: {
    fontSize: 18,
    color: '#2196F3',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ddd',
    marginRight: 12,
    marginTop: 4,
  },
  completedDot: {
    backgroundColor: '#4CAF50',
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 14,
    color: '#666',
  },
  bottomSpacer: {
    height: 32,
  },
});

export default TaskDetailScreen;