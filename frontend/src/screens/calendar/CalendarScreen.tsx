import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { apiService } from '../../services/api';
import { Task, Interaction } from '../../types';
import { formatDate, formatDateTime, getRelativeTime } from '../../utils/validation';
import { useScreenLayout } from '../../hooks/useScreenLayout';

interface CalendarScreenProps {
  navigation: any;
}

interface CalendarEvent {
  id: string;
  title: string;
  type: 'task' | 'interaction' | 'reminder';
  date: string;
  time?: string;
  description?: string;
  relatedId?: number;
  relatedType?: string;
  priority?: string;
  status?: string;
  isOverdue?: boolean;
}

interface MarkedDates {
  [key: string]: {
    marked: boolean;
    dotColor: string;
    selectedColor?: string;
  };
}

const CalendarScreen: React.FC<CalendarScreenProps> = ({ navigation }) => {
  const { containerStyle, contentStyle, responsive, theme } = useScreenLayout();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dayEvents, setDayEvents] = useState<CalendarEvent[]>([]);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'agenda'>('month');

  const dynamicStyles = useMemo(() => ({
    addButton: { minHeight: responsive.getTouchTargetSize(44) },
    viewModeButton: { minHeight: responsive.getTouchTargetSize(36) },
    eventCard: { 
      minHeight: responsive.getTouchTargetSize(80),
      padding: responsive.getSpacing(12),
    },
  }), [responsive]);

  useEffect(() => {
    loadCalendarData();
  }, []);

  useEffect(() => {
    filterEventsForSelectedDate();
  }, [selectedDate, events]);

  const loadCalendarData = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Load tasks with due dates
      const tasksResponse = await apiService.getTasks({ 
        limit: 100,
        includeCompleted: false 
      });
      const tasks = tasksResponse.data || [];

      // Load recent interactions for meetings/appointments
      const interactionsResponse = await apiService.getInteractions({ 
        type: 'Meeting Scheduled',
        limit: 50 
      });
      const interactions = interactionsResponse.data || [];

      // Convert to calendar events
      const calendarEvents: CalendarEvent[] = [];

      // Add tasks as events
      tasks.forEach((task: Task) => {
        if (task.dueDate) {
          const date = new Date(task.dueDate).toISOString().split('T')[0];
          const isOverdue = new Date(task.dueDate) < new Date();
          
          calendarEvents.push({
            id: `task-${task.taskId}`,
            title: task.title,
            type: 'task',
            date,
            time: formatDateTime(task.dueDate).split(' ')[1],
            description: task.description,
            relatedId: task.taskId,
            relatedType: 'task',
            priority: task.priority,
            status: task.completed ? 'completed' : 'pending',
            isOverdue,
          });
        }
      });

      // Add interactions as events
      interactions.forEach((interaction: Interaction) => {
        const date = new Date(interaction.interactionDate).toISOString().split('T')[0];
        
        calendarEvents.push({
          id: `interaction-${interaction.interactionId}`,
          title: interaction.type,
          type: 'interaction',
          date,
          time: formatDateTime(interaction.interactionDate).split(' ')[1],
          description: interaction.content,
          relatedId: interaction.leadId,
          relatedType: 'lead',
        });
      });

      // Generate follow-up reminders (example logic)
      const today = new Date();
      for (let i = 1; i <= 7; i++) {
        const reminderDate = new Date(today);
        reminderDate.setDate(today.getDate() + i);
        const dateStr = reminderDate.toISOString().split('T')[0];
        
        // Add some sample reminders (in real app, these would come from server)
        if (i % 3 === 0) {
          calendarEvents.push({
            id: `reminder-${i}`,
            title: 'Follow up with leads',
            type: 'reminder',
            date: dateStr,
            time: '09:00 AM',
            description: 'Check on leads that haven\'t been contacted recently',
          });
        }
      }

      setEvents(calendarEvents);
      generateMarkedDates(calendarEvents);
    } catch (error) {
      console.error('Error loading calendar data:', error);
      Alert.alert('Error', 'Failed to load calendar data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const generateMarkedDates = (calendarEvents: CalendarEvent[]) => {
    const marked: MarkedDates = {};
    
    // Mark today
    const today = new Date().toISOString().split('T')[0];
    marked[today] = {
      marked: true,
      dotColor: '#2196F3',
      selectedColor: '#e3f2fd',
    };

    // Mark dates with events
    calendarEvents.forEach((event) => {
      if (!marked[event.date]) {
        marked[event.date] = {
          marked: true,
          dotColor: getEventColor(event),
        };
      }
    });

    // Highlight selected date
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selectedColor: '#2196F3',
      };
    }

    setMarkedDates(marked);
  };

  const getEventColor = (event: CalendarEvent): string => {
    switch (event.type) {
      case 'task':
        if (event.isOverdue) return '#f44336';
        if (event.priority === 'High') return '#FF5722';
        if (event.priority === 'Medium') return '#FF9800';
        return '#4CAF50';
      case 'interaction':
        return '#9C27B0';
      case 'reminder':
        return '#607D8B';
      default:
        return '#666';
    }
  };

  const getEventIcon = (event: CalendarEvent): string => {
    switch (event.type) {
      case 'task':
        return event.status === 'completed' ? '✅' : '📋';
      case 'interaction':
        return '📅';
      case 'reminder':
        return '🔔';
      default:
        return '📌';
    }
  };

  const filterEventsForSelectedDate = () => {
    const filtered = events.filter(event => event.date === selectedDate);
    // Sort by time, then by priority
    filtered.sort((a, b) => {
      if (a.time && b.time) {
        return a.time.localeCompare(b.time);
      }
      if (a.priority && b.priority) {
        const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
        return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
               (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
      }
      return 0;
    });
    setDayEvents(filtered);
  };

  const handleDateSelect = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  const handleEventPress = (event: CalendarEvent) => {
    if (event.relatedType === 'task') {
      navigation.navigate('TaskDetail', { taskId: event.relatedId });
    } else if (event.relatedType === 'lead') {
      navigation.navigate('LeadDetail', { leadId: event.relatedId });
    } else {
      // Show event details in alert for reminders
      Alert.alert(
        event.title,
        event.description || 'No additional details',
        [{ text: 'OK' }]
      );
    }
  };

  const handleAddEvent = () => {
    Alert.alert(
      'Add Event',
      'What would you like to add?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Task', onPress: () => navigation.navigate('AddTask') },
        { text: 'Meeting', onPress: () => {
          // In a real app, this would open a meeting scheduler
          Alert.alert('Info', 'Meeting scheduler would open here');
        }},
      ]
    );
  };

  const renderViewModeSelector = () => (
    <View style={styles.viewModeSelector}>
      {(['month', 'week', 'agenda'] as const).map((mode) => (
        <TouchableOpacity
          key={mode}
          style={[styles.viewModeButton, viewMode === mode && styles.viewModeButtonActive]}
          onPress={() => setViewMode(mode)}
        >
          <Text style={[styles.viewModeButtonText, viewMode === mode && styles.viewModeButtonTextActive]}>
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderEventItem = ({ item }: { item: CalendarEvent }) => (
    <TouchableOpacity style={[styles.eventCard, dynamicStyles.eventCard]} onPress={() => handleEventPress(item)}>
      <View style={styles.eventHeader}>
        <View style={styles.eventIcon}>
          <Text style={styles.eventIconText}>{getEventIcon(item)}</Text>
        </View>
        <View style={styles.eventContent}>
          <View style={styles.eventTitleRow}>
            <Text style={[styles.eventTitle, item.isOverdue && styles.overdueText]}>
              {item.title}
            </Text>
            {item.time && (
              <Text style={[styles.eventTime, item.isOverdue && styles.overdueText]}>
                {item.time}
              </Text>
            )}
          </View>
          
          {item.description && (
            <Text style={styles.eventDescription} numberOfLines={1}>
              {item.description}
            </Text>
          )}

          <View style={styles.eventMeta}>
            <View style={[styles.eventTypeBadge, { backgroundColor: getEventColor(item) }]}>
              <Text style={styles.eventTypeBadgeText}>{item.type}</Text>
            </View>
            
            {item.priority && (
              <Text style={styles.eventPriority}>
                {item.priority} Priority
              </Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyDay = () => (
    <View style={styles.emptyDay}>
      <Text style={styles.emptyDayIcon}>📅</Text>
      <Text style={styles.emptyDayTitle}>No events today</Text>
      <Text style={styles.emptyDayText}>
        Tap the + button to add a task or meeting
      </Text>
    </View>
  );

  const getSelectedDateDisplay = () => {
    const date = new Date(selectedDate);
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (selectedDate === today) {
      return 'Today';
    } else if (selectedDate === tomorrowStr) {
      return 'Tomorrow';
    } else {
      return formatDate(selectedDate);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Header */}
      <View style={[styles.header, contentStyle]}>
        <View>
          <Text style={styles.headerTitle}>Calendar</Text>
          <Text style={styles.headerSubtitle}>Tasks and meetings</Text>
        </View>
        <TouchableOpacity style={[styles.addButton, dynamicStyles.addButton]} onPress={handleAddEvent}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* View Mode Selector */}
      {renderViewModeSelector()}

      {/* Calendar */}
      <Calendar
        current={selectedDate}
        onDayPress={handleDateSelect}
        markedDates={markedDates}
        theme={{
          backgroundColor: '#ffffff',
          calendarBackground: '#ffffff',
          textSectionTitleColor: '#b6c1cd',
          selectedDayBackgroundColor: '#2196F3',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#2196F3',
          dayTextColor: '#2d4150',
          textDisabledColor: '#d9e1e8',
          dotColor: '#00adf5',
          selectedDotColor: '#ffffff',
          arrowColor: '#2196F3',
          monthTextColor: '#2d4150',
          indicatorColor: '#2196F3',
          textDayFontWeight: '500',
          textMonthFontWeight: '600',
          textDayHeaderFontWeight: '600',
          textDayFontSize: 16,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 14,
        }}
        style={styles.calendar}
      />

      {/* Selected Date Events */}
      <View style={styles.eventsSection}>
        <Text style={styles.eventsSectionTitle}>
          {getSelectedDateDisplay()} ({dayEvents.length})
        </Text>
        
        <FlatList
          data={dayEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderEventItem}
          contentContainerStyle={styles.eventsListContainer}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => loadCalendarData(true)} />
          }
          ListEmptyComponent={renderEmptyDay}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
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
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  viewModeSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 4,
  },
  viewModeButtonActive: {
    backgroundColor: '#2196F3',
  },
  viewModeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  viewModeButtonTextActive: {
    color: '#fff',
  },
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  eventsSection: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 16,
  },
  eventsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  eventsListContainer: {
    paddingHorizontal: 16,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  eventIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventIconText: {
    fontSize: 16,
  },
  eventContent: {
    flex: 1,
  },
  eventTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  eventTime: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  overdueText: {
    color: '#f44336',
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  eventMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventTypeBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  eventPriority: {
    fontSize: 12,
    color: '#999',
  },
  emptyDay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyDayIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyDayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyDayText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default CalendarScreen;