// Comprehensive Tasks screen with full functionality

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useLoadingState } from '../../utils/loadingState';
import { TaskListSkeleton } from '../../components/common/SkeletonList';
import SkeletonCard from '../../components/common/SkeletonCard';
import { InlineLoader } from '../../components/common/LoadingIndicator';
import {
  MaterialColors,
  MaterialSpacing,
  MaterialTypography,
} from '../../styles/MaterialDesign';

interface TasksScreenProps {
  navigation: any;
}

const TasksScreen: React.FC<TasksScreenProps> = ({ navigation }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [togglingTaskId, setTogglingTaskId] = useState<number | null>(null);

  // Enhanced loading state management
  const initialLoadingState = useLoadingState({ isLoading: true });
  const refreshLoadingState = useLoadingState();
  const mutationLoadingState = useLoadingState();

  const taskFilters = useMemo(() => ([
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'completed', label: 'Done' },
    { key: 'overdue', label: 'Overdue' },
  ] as const), []);

  const loadTasks = useCallback(async (refresh = false) => {
    const currentLoadingState = refresh ? refreshLoadingState : initialLoadingState;

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

      const response = await apiService.getTasksWithLoading(params, {
        onStart: (message) => currentLoadingState.startLoading(
          refresh ? 'Refreshing tasks…' : message || 'Loading tasks…',
          { timeout: 20000 }
        ),
        onProgress: currentLoadingState.updateProgress,
        onComplete: currentLoadingState.stopLoading,
        onError: (errorMessage) => currentLoadingState.setError(errorMessage),
      });

      if (response?.data) {
        setTasks(response.data);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      const message = error instanceof Error ? error.message : 'Failed to load tasks';
      currentLoadingState.setError(message);
      Alert.alert('Error', message);
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
      setTogglingTaskId(taskId);

      await apiService.updateTaskWithLoading(taskId, {
        isCompleted: !currentStatus,
        completedAt: !currentStatus ? new Date().toISOString() : undefined,
      }, {
        onStart: () => mutationLoadingState.startLoading('Updating task…'),
        onComplete: mutationLoadingState.stopLoading,
        onError: (message) => mutationLoadingState.setError(message),
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
      const message = error instanceof Error ? error.message : 'Failed to update task';
      mutationLoadingState.setError(message);
      Alert.alert('Error', message);
    } finally {
      setTogglingTaskId(null);
      mutationLoadingState.stopLoading();
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

              {togglingTaskId === item.taskId && mutationLoadingState.isLoading && (
                <View style={styles.inlineLoader}>
                  <InlineLoader color="secondary" size="sm" accessibilityLabel="Updating task" />
                  <Text style={styles.inlineLoaderText}>Updating task…</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      {taskFilters.map(({ key, label }) => {
        const count = (() => {
          switch (key) {
            case 'pending':
              return tasks.filter(t => !t.isCompleted).length;
            case 'completed':
              return tasks.filter(t => t.isCompleted).length;
            case 'overdue':
              return tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !t.isCompleted).length;
            default:
              return tasks.length;
          }
        })();

        return (
          <TouchableOpacity
            key={key}
            style={[styles.filterTab, filter === key && styles.activeFilterTab]}
            onPress={() => setFilter(key as typeof filter)}
          >
            <Text style={[styles.filterTabText, filter === key && styles.activeFilterTabText]}>
              {label} ({count})
            </Text>
          </TouchableOpacity>
        );
      })}
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
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonBlock}>
            <SkeletonCard height={120} animated theme="auto" />
          </View>
          <View style={styles.skeletonBlock}>
            <SkeletonCard height={80} animated theme="auto" />
          </View>
        </View>
        <TaskListSkeleton count={6} animated={true} />
      </View>
    );
  }

  if (initialLoadingState.error && tasks.length === 0) {
    return (
      <View style={styles.errorState}>
        <Text style={styles.errorStateTitle}>We couldn&apos;t load your tasks</Text>
        <Text style={styles.errorStateMessage}>{initialLoadingState.error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadTasks()}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
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
      <TouchableOpacity
        style={styles.fab}
        onPress={navigateToAddTask}
        accessibilityRole="button"
        accessibilityLabel="Add task"
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MaterialColors.neutral[50],
  },
  header: {
    backgroundColor: MaterialColors.surface,
    paddingHorizontal: MaterialSpacing.lg,
    paddingTop: MaterialSpacing.lg,
    paddingBottom: MaterialSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: MaterialColors.neutral[200],
  },
  headerTitle: {
    ...MaterialTypography.headlineSmall,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.xs,
  },
  headerSubtitle: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: MaterialColors.surface,
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: MaterialColors.neutral[200],
  },
  filterTab: {
    flex: 1,
    paddingVertical: MaterialSpacing.sm,
    paddingHorizontal: MaterialSpacing.md,
    borderRadius: 16,
    marginHorizontal: MaterialSpacing.xs,
    backgroundColor: MaterialColors.neutral[100],
    alignItems: 'center',
  },
  activeFilterTab: {
    backgroundColor: MaterialColors.primary[500],
  },
  filterTabText: {
    ...MaterialTypography.labelMedium,
    color: MaterialColors.neutral[600],
  },
  activeFilterTabText: {
    color: MaterialColors.onPrimary,
  },
  listContainer: {
    padding: MaterialSpacing.md,
  },
  taskCard: {
    backgroundColor: MaterialColors.surface,
    borderRadius: 12,
    marginBottom: MaterialSpacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  completedTask: {
    opacity: 0.75,
    backgroundColor: MaterialColors.neutral[100],
  },
  taskHeader: {
    flexDirection: 'row',
    padding: MaterialSpacing.md,
  },
  checkboxContainer: {
    marginRight: MaterialSpacing.sm,
    paddingTop: MaterialSpacing.xs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: MaterialColors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MaterialColors.surface,
  },
  checkedBox: {
    backgroundColor: MaterialColors.secondary[500],
    borderColor: MaterialColors.secondary[500],
  },
  checkmark: {
    color: MaterialColors.onSecondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    ...MaterialTypography.titleMedium,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.xs,
  },
  taskDescription: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
    marginBottom: MaterialSpacing.xs,
  },
  completedText: {
    color: MaterialColors.neutral[500],
    textDecorationLine: 'line-through',
  },
  taskMeta: {
    marginTop: MaterialSpacing.sm,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: MaterialSpacing.xs,
  },
  priorityBadge: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.onSecondary,
    paddingVertical: MaterialSpacing.xs,
    paddingHorizontal: MaterialSpacing.sm,
    borderRadius: 12,
  },
  dueDate: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.neutral[600],
  },
  overdueDate: {
    color: MaterialColors.error[600],
    fontWeight: '600',
  },
  linkedLead: {
    ...MaterialTypography.labelSmall,
    color: MaterialColors.primary[600],
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: MaterialSpacing.xxl,
    paddingHorizontal: MaterialSpacing.xl,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: MaterialSpacing.md,
  },
  emptyStateTitle: {
    ...MaterialTypography.titleLarge,
    color: MaterialColors.neutral[900],
    marginBottom: MaterialSpacing.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
    textAlign: 'center',
    marginBottom: MaterialSpacing.lg,
  },
  addButton: {
    backgroundColor: MaterialColors.primary[500],
    paddingHorizontal: MaterialSpacing.lg,
    paddingVertical: MaterialSpacing.sm,
    borderRadius: 8,
  },
  addButtonText: {
    ...MaterialTypography.labelLarge,
    color: MaterialColors.onPrimary,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: MaterialSpacing.xl,
    bottom: MaterialSpacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: MaterialColors.secondary[500],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fabText: {
    fontSize: 32,
    color: MaterialColors.onSecondary,
    lineHeight: 32,
  },
  skeletonHeader: {
    paddingHorizontal: MaterialSpacing.md,
    paddingVertical: MaterialSpacing.md,
  },
  skeletonBlock: {
    marginBottom: MaterialSpacing.sm,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: MaterialSpacing.xxl,
    backgroundColor: MaterialColors.neutral[50],
  },
  errorStateTitle: {
    ...MaterialTypography.titleLarge,
    color: MaterialColors.error[600],
    marginBottom: MaterialSpacing.sm,
    textAlign: 'center',
  },
  errorStateMessage: {
    ...MaterialTypography.bodyMedium,
    color: MaterialColors.neutral[600],
    marginBottom: MaterialSpacing.lg,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: MaterialColors.primary[500],
    paddingHorizontal: MaterialSpacing.xl,
    paddingVertical: MaterialSpacing.sm,
    borderRadius: 999,
  },
  retryButtonText: {
    ...MaterialTypography.labelLarge,
    color: MaterialColors.onPrimary,
    fontWeight: '600',
  },
  inlineLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: MaterialSpacing.xs,
  },
  inlineLoaderText: {
    ...MaterialTypography.bodySmall,
    color: MaterialColors.neutral[600],
    marginLeft: MaterialSpacing.xs,
  },
});

export default TasksScreen;
