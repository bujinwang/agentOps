// Comprehensive Tasks screen with full functionality

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';

import { Task, TaskPriority } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLoadingState } from '../../utils/loadingState';
import { TaskListSkeleton } from '../../components/common/SkeletonList';

interface TasksScreenProps {
  navigation: any;
}

const TasksScreen: React.FC<TasksScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');

  // Enhanced loading state management
  const initialLoadingState = useLoadingState();
  const refreshLoadingState = useLoadingState();

  const loadTasks = useCallback(async (refresh = false) => {
    const currentLoadingState = refresh ? refreshLoadingState : initialLoadingState;

    currentLoadingState.startLoading(refresh ? 'Refreshing tasks...' : 'Loading tasks...');

    try {
      const params: any = {
        page: 1,
        limit: 100,
        sortBy: 'due_date',
        sortOrder: 'ASC',
      };

      if (filter === 'pending') {
        params.completed = false;
      } else if (filter === 'completed') {
        params.completed = true;
      } else if (filter === 'overdue') {
        params.overdue = true;
      }

      const response = await apiService.getTasks(params);

      if (response) {
        setTasks(response.data || []);
        currentLoadingState.stopLoading();
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      currentLoadingState.setError('Failed to load tasks');
    }
  }, [filter, initialLoadingState, refreshLoadingState]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadTasks(true);
    });

    return unsubscribe;
  }, [navigation, loadTasks]);

  const handleRefresh = () => {
    loadTasks(true);
  };

  const toggleTaskCompletion = async (taskId: number, currentStatus: boolean) => {
    try {
      await apiService.updateTask(taskId, {
        isCompleted: !currentStatus,
        completedAt: !currentStatus ? new Date().toISOString() : undefined,
      });
      
      // Update local state
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.taskId === taskId
            ? { ...task, isCompleted: !currentStatus, completedAt: !currentStatus ? new Date().toISOString() : undefined }
            : task
        )
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const navigateToAddTask = () => {
    navigation.navigate('AddTask');
  };

  const navigateToTaskDetail = (taskId: number) => {
    navigation.navigate('TaskDetail', { taskId });
  };

  const getPriorityColor = (priority: TaskPriority): string => {
    switch (priority) {
      case 'High': return '#F44336';
      case 'Medium': return '#FF9800';
      case 'Low': return '#4CAF50';
      default: return '#999';
    }
  };

  const isOverdue = (dueDate: string): boolean => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && !tasks.find(t => t.dueDate === dueDate)?.isCompleted;
  };

  const getFilteredTasks = (): Task[] => {
    const now = new Date();
    
    switch (filter) {
      case 'pending':
        return tasks.filter(task => !task.isCompleted);
      case 'completed':
        return tasks.filter(task => task.isCompleted);
      case 'overdue':
        return tasks.filter(task => 
          task.dueDate && 
          new Date(task.dueDate) < now && 
          !task.isCompleted
        );
      default:
        return tasks;
    }
  };

  const renderTaskItem = ({ item }: { item: Task }) => {
    const overdue = item.dueDate && isOverdue(item.dueDate);
    
    return (
      <TouchableOpacity 
        style={[styles.taskCard, item.isCompleted && styles.completedTask]} 
        onPress={() => navigateToTaskDetail(item.taskId)}
      >
        <View style={styles.taskHeader}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => toggleTaskCompletion(item.taskId, item.isCompleted)}
          >
            <View style={[styles.checkbox, item.isCompleted && styles.checkedBox]}>
              {item.isCompleted && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>
          
          <View style={styles.taskContent}>
            <Text style={[styles.taskTitle, item.isCompleted && styles.completedText]}>
              {item.title}
            </Text>
            
            {item.description && (
              <Text style={[styles.taskDescription, item.isCompleted && styles.completedText]} numberOfLines={2}>
                {item.description}
              </Text>
            )}

            <View style={styles.taskMeta}>
              <View style={styles.taskMetaRow}>
                <Text style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                  {item.priority}
                </Text>
                
                {item.dueDate && (
                  <Text style={[styles.dueDate, overdue && styles.overdueDate]}>
                    Due: {new Date(item.dueDate).toLocaleDateString()}
                  </Text>
                )}
              </View>

              {item.leadId && (
                <Text style={styles.linkedLead}>📋 Linked to lead</Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      {[
        { key: 'all', label: 'All', count: tasks.length },
        { key: 'pending', label: 'Pending', count: tasks.filter(t => !t.isCompleted).length },
        { key: 'completed', label: 'Done', count: tasks.filter(t => t.isCompleted).length },
        { key: 'overdue', label: 'Overdue', count: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !t.isCompleted).length },
      ].map(({ key, label, count }) => (
        <TouchableOpacity
          key={key}
          style={[styles.filterTab, filter === key && styles.activeFilterTab]}
          onPress={() => setFilter(key as any)}
        >
          <Text style={[styles.filterTabText, filter === key && styles.activeFilterTabText]}>
            {label} ({count})
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>✅</Text>
      <Text style={styles.emptyStateTitle}>
        {filter === 'all' ? 'No Tasks Yet' : `No ${filter} Tasks`}
      </Text>
      <Text style={styles.emptyStateText}>
        {filter === 'all' 
          ? 'Create your first task to get organized'
          : filter === 'completed'
          ? 'Complete some tasks to see them here'
          : filter === 'overdue'
          ? 'Great! No overdue tasks'
          : 'All caught up on pending tasks'
        }
      </Text>
      {filter === 'all' && (
        <TouchableOpacity style={styles.addButton} onPress={navigateToAddTask}>
          <Text style={styles.addButtonText}>Add Your First Task</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const filteredTasks = getFilteredTasks();

  if (initialLoadingState.isLoading && tasks.length === 0) {
    return (
      <View style={styles.container}>
        {/* Header skeleton */}
        <View style={styles.header}>
          <View style={{ height: 24, backgroundColor: '#e0e0e0', borderRadius: 4, marginBottom: 8, width: '60%' }} />
          <View style={{ height: 16, backgroundColor: '#e0e0e0', borderRadius: 4, width: '40%' }} />
        </View>

        {/* Filter tabs skeleton */}
        <View style={styles.filterContainer}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={[styles.filterTab, { backgroundColor: '#e0e0e0' }]} />
          ))}
        </View>

        {/* Tasks list skeleton */}
        <TaskListSkeleton count={5} animated={true} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Tasks</Text>
        <Text style={styles.headerSubtitle}>
          {tasks.filter(t => !t.isCompleted).length} pending • {tasks.filter(t => t.isCompleted).length} completed
        </Text>
      </View>

      {/* Filter Tabs */}
      {renderFilterTabs()}

      {/* Tasks List */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.taskId.toString()}
        renderItem={renderTaskItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshLoadingState.isLoading} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={!initialLoadingState.isLoading ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fab} onPress={navigateToAddTask}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginHorizontal: 4,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  activeFilterTab: {
    backgroundColor: '#2196F3',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  activeFilterTabText: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  completedTask: {
    opacity: 0.7,
    backgroundColor: '#f8f9fa',
  },
  taskHeader: {
    flexDirection: 'row',
    padding: 16,
  },
  checkboxContainer: {
    marginRight: 12,
    paddingTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  taskMeta: {
    gap: 8,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
    alignSelf: 'flex-start',
  },
  dueDate: {
    fontSize: 12,
    color: '#666',
  },
  overdueDate: {
    color: '#F44336',
    fontWeight: '600',
  },
  linkedLead: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
    lineHeight: 24,
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
  },
});

export default TasksScreen;