import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { Task, Interaction } from '../types';

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'task' | 'interaction' | 'reminder' | 'meeting';
  date: string;
  time?: string;
  description?: string;
  relatedId?: number;
  relatedType?: string;
  priority?: string;
  status?: string;
  isOverdue?: boolean;
  isAllDay?: boolean;
  duration?: number; // minutes
  location?: string;
  attendees?: string[];
}

interface UseCalendarEventsReturn {
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
  refreshEvents: () => Promise<void>;
  getEventsForDate: (date: string) => CalendarEvent[];
  getEventsForDateRange: (startDate: string, endDate: string) => CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>;
  updateEvent: (eventId: string, updates: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
}

export const useCalendarEvents = (): UseCalendarEventsReturn => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load tasks with due dates
      const tasksResponse = await apiService.getTasks({ 
        limit: 200,
        includeCompleted: true 
      });
      const tasks = tasksResponse.data || [];

      // Load interactions for meetings/appointments
      const interactionsResponse = await apiService.getInteractions({ 
        limit: 100 
      });
      const interactions = interactionsResponse.data || [];

      const calendarEvents: CalendarEvent[] = [];

      // Convert tasks to calendar events
      tasks.forEach((task: Task) => {
        if (task.dueDate) {
          const date = new Date(task.dueDate).toISOString().split('T')[0];
          const time = new Date(task.dueDate).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
          const isOverdue = new Date(task.dueDate) < new Date() && !task.completed;
          
          calendarEvents.push({
            id: `task-${task.taskId}`,
            title: task.title,
            type: 'task',
            date,
            time,
            description: task.description,
            relatedId: task.taskId,
            relatedType: 'task',
            priority: task.priority,
            status: task.completed ? 'completed' : 'pending',
            isOverdue,
            isAllDay: false,
          });
        }
      });

      // Convert interactions to calendar events
      interactions.forEach((interaction: Interaction) => {
        const date = new Date(interaction.interactionDate).toISOString().split('T')[0];
        const time = new Date(interaction.interactionDate).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        
        let eventType: CalendarEvent['type'] = 'interaction';
        if (interaction.type === 'Meeting Scheduled') {
          eventType = 'meeting';
        }
        
        calendarEvents.push({
          id: `interaction-${interaction.interactionId}`,
          title: interaction.type,
          type: eventType,
          date,
          time,
          description: interaction.content,
          relatedId: interaction.leadId,
          relatedType: 'lead',
          isAllDay: false,
          duration: eventType === 'meeting' ? 60 : undefined, // Default meeting duration
        });
      });

      // Generate follow-up reminders
      const today = new Date();
      for (let i = 1; i <= 14; i++) {
        const reminderDate = new Date(today);
        reminderDate.setDate(today.getDate() + i);
        const dateStr = reminderDate.toISOString().split('T')[0];
        
        // Add weekly follow-up reminders
        if (i % 7 === 0) {
          calendarEvents.push({
            id: `reminder-weekly-${i}`,
            title: 'Weekly Lead Review',
            type: 'reminder',
            date: dateStr,
            time: '09:00 AM',
            description: 'Review all active leads and follow-up actions',
            isAllDay: false,
            duration: 30,
          });
        }

        // Add bi-weekly pipeline review
        if (i % 14 === 0) {
          calendarEvents.push({
            id: `reminder-pipeline-${i}`,
            title: 'Pipeline Review Meeting',
            type: 'reminder',
            date: dateStr,
            time: '02:00 PM',
            description: 'Review sales pipeline and update forecasts',
            isAllDay: false,
            duration: 60,
          });
        }
      }

      // Sort events by date and time
      calendarEvents.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        
        if (a.time && b.time) {
          return a.time.localeCompare(b.time);
        }
        return 0;
      });

      setEvents(calendarEvents);
    } catch (err) {
      console.error('Error loading calendar events:', err);
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const refreshEvents = useCallback(async () => {
    await loadEvents();
  }, [loadEvents]);

  const getEventsForDate = useCallback((date: string): CalendarEvent[] => {
    return events.filter(event => event.date === date);
  }, [events]);

  const getEventsForDateRange = useCallback((startDate: string, endDate: string): CalendarEvent[] => {
    return events.filter(event => event.date >= startDate && event.date <= endDate);
  }, [events]);

  const addEvent = useCallback(async (eventData: Omit<CalendarEvent, 'id'>): Promise<void> => {
    try {
      // In a real implementation, this would call an API
      const newEvent: CalendarEvent = {
        ...eventData,
        id: `custom-${Date.now()}`,
      };
      
      setEvents(prev => [...prev, newEvent].sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        if (a.time && b.time) return a.time.localeCompare(b.time);
        return 0;
      }));
    } catch (err) {
      console.error('Error adding event:', err);
      throw err;
    }
  }, []);

  const updateEvent = useCallback(async (eventId: string, updates: Partial<CalendarEvent>): Promise<void> => {
    try {
      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, ...updates } : event
      ));
    } catch (err) {
      console.error('Error updating event:', err);
      throw err;
    }
  }, []);

  const deleteEvent = useCallback(async (eventId: string): Promise<void> => {
    try {
      setEvents(prev => prev.filter(event => event.id !== eventId));
    } catch (err) {
      console.error('Error deleting event:', err);
      throw err;
    }
  }, []);

  return {
    events,
    isLoading,
    error,
    refreshEvents,
    getEventsForDate,
    getEventsForDateRange,
    addEvent,
    updateEvent,
    deleteEvent,
  };
};