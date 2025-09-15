import { ConversionNotification } from './websocketService';

export interface NotificationPreferences {
  enableMilestoneAlerts: boolean;
  enableTimeWarnings: boolean;
  enableProbabilityAlerts: boolean;
  enableSoundNotifications: boolean;
  enablePushNotifications: boolean;
}

class NotificationService {
  private notifications: ConversionNotification[] = [];
  private preferences: NotificationPreferences = {
    enableMilestoneAlerts: true,
    enableTimeWarnings: true,
    enableProbabilityAlerts: true,
    enableSoundNotifications: true,
    enablePushNotifications: false
  };
  private listeners: Function[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('conversion_notifications');
      if (stored) {
        this.notifications = JSON.parse(stored);
      }

      const prefs = localStorage.getItem('notification_preferences');
      if (prefs) {
        this.preferences = { ...this.preferences, ...JSON.parse(prefs) };
      }
    } catch (error) {
      console.error('Failed to load notifications from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('conversion_notifications', JSON.stringify(this.notifications));
      localStorage.setItem('notification_preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Failed to save notifications to storage:', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener([...this.notifications]);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  // Public API

  public addNotification(notification: Omit<ConversionNotification, 'id' | 'timestamp' | 'isRead'>): void {
    const newNotification: ConversionNotification = {
      ...notification,
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      isRead: false
    };

    this.notifications.unshift(newNotification); // Add to beginning for chronological order
    this.saveToStorage();
    this.notifyListeners();

    // Trigger system notification if enabled
    if (this.preferences.enablePushNotifications) {
      this.showSystemNotification(newNotification);
    }

    // Play sound if enabled
    if (this.preferences.enableSoundNotifications) {
      this.playNotificationSound();
    }
  }

  public markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  public markAllAsRead(): void {
    this.notifications.forEach(notification => {
      notification.isRead = true;
    });
    this.saveToStorage();
    this.notifyListeners();
  }

  public deleteNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveToStorage();
    this.notifyListeners();
  }

  public clearAllNotifications(): void {
    this.notifications = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  public getNotifications(): ConversionNotification[] {
    return [...this.notifications];
  }

  public getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  public updatePreferences(newPreferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...newPreferences };
    this.saveToStorage();
  }

  public getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  public onNotificationsChange(listener: (notifications: ConversionNotification[]) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Specific methods for conversion tracking

  public addMilestoneNotification(
    leadId: number,
    leadName: string,
    milestone: string,
    message: string
  ): void {
    if (!this.preferences.enableMilestoneAlerts) return;

    this.addNotification({
      leadId,
      leadName,
      type: 'milestone',
      title: `Milestone Reached: ${milestone}`,
      message,
      actionRequired: false
    });
  }

  public addTimeWarningNotification(
    leadId: number,
    leadName: string,
    daysInStage: number,
    stage: string
  ): void {
    if (!this.preferences.enableTimeWarnings) return;

    this.addNotification({
      leadId,
      leadName,
      type: 'warning',
      title: `Time Warning: ${stage}`,
      message: `Lead has been in ${stage} for ${daysInStage} days. Consider following up.`,
      actionRequired: true,
      actionUrl: `/leads/${leadId}`
    });
  }

  public addProbabilityAlertNotification(
    leadId: number,
    leadName: string,
    probability: number,
    change: 'increased' | 'decreased'
  ): void {
    if (!this.preferences.enableProbabilityAlerts) return;

    const title = `Conversion Probability ${change === 'increased' ? 'Increased' : 'Decreased'}`;
    const message = `Lead conversion probability is now ${(probability * 100).toFixed(1)}%`;

    this.addNotification({
      leadId,
      leadName,
      type: 'alert',
      title,
      message,
      actionRequired: false
    });
  }

  public addStagnationAlertNotification(
    leadId: number,
    leadName: string,
    stage: string,
    daysStagnant: number
  ): void {
    if (!this.preferences.enableTimeWarnings) return;

    this.addNotification({
      leadId,
      leadName,
      type: 'warning',
      title: `Lead Stagnation Alert`,
      message: `Lead has been stuck in ${stage} for ${daysStagnant} days without progress.`,
      actionRequired: true,
      actionUrl: `/leads/${leadId}`
    });
  }

  private showSystemNotification(notification: ConversionNotification): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico',
            tag: notification.id
          });
        }
      });
    }
  }

  private playNotificationSound(): void {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      // Fallback: try to play an audio file if available
      console.warn('Web Audio API not supported, skipping sound notification');
    }
  }

  // Workflow execution methods

  public async sendInAppNotification(
    leadId: number,
    templateId: string,
    context: any
  ): Promise<void> {
    try {
      // Extract lead name from context or use default
      const leadName = context?.name || context?.leadName || `Lead ${leadId}`;

      // Create notification based on template type
      const notificationType = this.determineNotificationType(templateId);

      switch (notificationType) {
        case 'milestone':
          this.addMilestoneNotification(
            leadId,
            leadName,
            context?.milestone || 'Workflow Step',
            context?.message || 'Automated workflow notification'
          );
          break;

        case 'followup':
          this.addTimeWarningNotification(
            leadId,
            leadName,
            context?.daysInStage || 1,
            context?.stage || 'follow-up'
          );
          break;

        case 'alert':
          this.addProbabilityAlertNotification(
            leadId,
            leadName,
            context?.probability || 0.5,
            context?.change || 'increased'
          );
          break;

        default:
          // Generic notification
          this.addNotification({
            leadId,
            leadName,
            type: 'alert',
            title: context?.title || 'Workflow Notification',
            message: context?.message || 'Automated workflow message',
            actionRequired: false
          });
      }
    } catch (error) {
      console.error('Error sending in-app notification:', error);
      throw error;
    }
  }

  private determineNotificationType(templateId: string): string {
    // Determine notification type based on template ID
    if (templateId.includes('milestone')) return 'milestone';
    if (templateId.includes('followup') || templateId.includes('reminder')) return 'followup';
    if (templateId.includes('alert') || templateId.includes('urgent')) return 'alert';
    return 'info';
  }

  // Cleanup method
  public cleanup(): void {
    this.listeners = [];
  }
}

// Export singleton instance
const notificationService = new NotificationService();
export default notificationService;
export { NotificationService };