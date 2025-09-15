import AsyncStorage from '@react-native-async-storage/async-storage';
import { communicationApiService } from './communicationApiService';
import notificationService from './notificationService';

export interface EmailTrackingData {
  messageId: string;
  leadId: number;
  workflowId: string;
  stepId: string;
  templateId: string;
  sentAt: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  unsubscribedAt?: Date;
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed';
  userAgent?: string;
  ipAddress?: string;
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
}

export interface SMSTrackingData {
  messageId: string;
  leadId: number;
  workflowId: string;
  stepId: string;
  templateId: string;
  sentAt: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  status: 'sent' | 'delivered' | 'failed';
  errorCode?: string;
  errorMessage?: string;
  carrier?: string;
  deliveryAttempts: number;
}

export interface InAppTrackingData {
  notificationId: string;
  leadId: number;
  workflowId: string;
  stepId: string;
  templateId: string;
  sentAt: Date;
  displayedAt?: Date;
  interactedAt?: Date;
  dismissedAt?: Date;
  status: 'sent' | 'displayed' | 'interacted' | 'dismissed';
  interactionType?: 'tap' | 'swipe' | 'button_click';
  timeToInteract?: number; // seconds
  deviceInfo?: {
    platform: string;
    version: string;
    model?: string;
  };
}

export interface ResponseAnalytics {
  leadId: number;
  workflowId: string;
  totalEmails: number;
  openedEmails: number;
  clickedEmails: number;
  bouncedEmails: number;
  totalSMS: number;
  deliveredSMS: number;
  failedSMS: number;
  totalInApp: number;
  displayedInApp: number;
  interactedInApp: number;
  dismissedInApp: number;
  openRate: number;
  clickRate: number;
  deliveryRate: number;
  engagementRate: number;
  averageResponseTime: number; // seconds
  lastActivity: Date;
  engagementScore: number; // 0-100
}

export interface WorkflowAdjustment {
  workflowId: string;
  leadId: number;
  adjustmentType: 'delay_increase' | 'delay_decrease' | 'channel_switch' | 'content_adjustment' | 'frequency_change';
  reason: string;
  oldValue: any;
  newValue: any;
  appliedAt: Date;
  effectiveness?: number; // measured improvement
}

class ResponseTrackingService {
  private static instance: ResponseTrackingService;
  private communicationService: typeof communicationApiService;
  private notificationService: typeof notificationService;

  private readonly STORAGE_KEYS = {
    EMAIL_TRACKING: 'email_tracking_data',
    SMS_TRACKING: 'sms_tracking_data',
    INAPP_TRACKING: 'inapp_tracking_data',
    ANALYTICS: 'response_analytics',
    ADJUSTMENTS: 'workflow_adjustments',
  };

  private emailTrackingData: EmailTrackingData[] = [];
  private smsTrackingData: SMSTrackingData[] = [];
  private inAppTrackingData: InAppTrackingData[] = [];
  private analyticsData: ResponseAnalytics[] = [];
  private adjustmentsData: WorkflowAdjustment[] = [];

  private constructor() {
    this.communicationService = communicationApiService;
    this.notificationService = notificationService;
    this.initializeTracking();
  }

  public static getInstance(): ResponseTrackingService {
    if (!ResponseTrackingService.instance) {
      ResponseTrackingService.instance = new ResponseTrackingService();
    }
    return ResponseTrackingService.instance;
  }

  private async initializeTracking(): Promise<void> {
    try {
      await this.loadPersistedData();
      console.log('Response tracking service initialized');
    } catch (error) {
      console.error('Failed to initialize response tracking:', error);
    }
  }

  private async loadPersistedData(): Promise<void> {
    try {
      const [
        emailData,
        smsData,
        inAppData,
        analyticsData,
        adjustmentsData,
      ] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEYS.EMAIL_TRACKING),
        AsyncStorage.getItem(this.STORAGE_KEYS.SMS_TRACKING),
        AsyncStorage.getItem(this.STORAGE_KEYS.INAPP_TRACKING),
        AsyncStorage.getItem(this.STORAGE_KEYS.ANALYTICS),
        AsyncStorage.getItem(this.STORAGE_KEYS.ADJUSTMENTS),
      ]);

      if (emailData) {
        this.emailTrackingData = JSON.parse(emailData).map((item: any) => ({
          ...item,
          sentAt: new Date(item.sentAt),
          openedAt: item.openedAt ? new Date(item.openedAt) : undefined,
          clickedAt: item.clickedAt ? new Date(item.clickedAt) : undefined,
          bouncedAt: item.bouncedAt ? new Date(item.bouncedAt) : undefined,
          unsubscribedAt: item.unsubscribedAt ? new Date(item.unsubscribedAt) : undefined,
        }));
      }

      if (smsData) {
        this.smsTrackingData = JSON.parse(smsData).map((item: any) => ({
          ...item,
          sentAt: new Date(item.sentAt),
          deliveredAt: item.deliveredAt ? new Date(item.deliveredAt) : undefined,
          failedAt: item.failedAt ? new Date(item.failedAt) : undefined,
        }));
      }

      if (inAppData) {
        this.inAppTrackingData = JSON.parse(inAppData).map((item: any) => ({
          ...item,
          sentAt: new Date(item.sentAt),
          displayedAt: item.displayedAt ? new Date(item.displayedAt) : undefined,
          interactedAt: item.interactedAt ? new Date(item.interactedAt) : undefined,
          dismissedAt: item.dismissedAt ? new Date(item.dismissedAt) : undefined,
        }));
      }

      if (analyticsData) {
        this.analyticsData = JSON.parse(analyticsData).map((item: any) => ({
          ...item,
          lastActivity: new Date(item.lastActivity),
        }));
      }

      if (adjustmentsData) {
        this.adjustmentsData = JSON.parse(adjustmentsData).map((item: any) => ({
          ...item,
          appliedAt: new Date(item.appliedAt),
        }));
      }
    } catch (error) {
      console.error('Failed to load persisted tracking data:', error);
    }
  }

  private async persistData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(this.STORAGE_KEYS.EMAIL_TRACKING, JSON.stringify(this.emailTrackingData)),
        AsyncStorage.setItem(this.STORAGE_KEYS.SMS_TRACKING, JSON.stringify(this.smsTrackingData)),
        AsyncStorage.setItem(this.STORAGE_KEYS.INAPP_TRACKING, JSON.stringify(this.inAppTrackingData)),
        AsyncStorage.setItem(this.STORAGE_KEYS.ANALYTICS, JSON.stringify(this.analyticsData)),
        AsyncStorage.setItem(this.STORAGE_KEYS.ADJUSTMENTS, JSON.stringify(this.adjustmentsData)),
      ]);
    } catch (error) {
      console.error('Failed to persist tracking data:', error);
    }
  }

  // Email Tracking Methods

  public async trackEmailSent(
    messageId: string,
    leadId: number,
    workflowId: string,
    stepId: string,
    templateId: string
  ): Promise<void> {
    const trackingData: EmailTrackingData = {
      messageId,
      leadId,
      workflowId,
      stepId,
      templateId,
      sentAt: new Date(),
      status: 'sent',
    };

    this.emailTrackingData.push(trackingData);
    await this.persistData();
    await this.updateAnalytics(leadId, workflowId);

    console.log(`Email sent tracked: ${messageId} for lead ${leadId}`);
  }

  public async trackEmailOpened(
    messageId: string,
    userAgent?: string,
    ipAddress?: string,
    location?: EmailTrackingData['location']
  ): Promise<void> {
    const emailData = this.emailTrackingData.find(item => item.messageId === messageId);
    if (emailData && !emailData.openedAt) {
      emailData.openedAt = new Date();
      emailData.status = 'opened';
      emailData.userAgent = userAgent;
      emailData.ipAddress = ipAddress;
      emailData.location = location;

      await this.persistData();
      await this.updateAnalytics(emailData.leadId, emailData.workflowId);

      console.log(`Email opened tracked: ${messageId}`);
    }
  }

  public async trackEmailClicked(messageId: string): Promise<void> {
    const emailData = this.emailTrackingData.find(item => item.messageId === messageId);
    if (emailData && !emailData.clickedAt) {
      emailData.clickedAt = new Date();
      emailData.status = 'clicked';

      await this.persistData();
      await this.updateAnalytics(emailData.leadId, emailData.workflowId);

      console.log(`Email clicked tracked: ${messageId}`);
    }
  }

  public async trackEmailBounced(messageId: string): Promise<void> {
    const emailData = this.emailTrackingData.find(item => item.messageId === messageId);
    if (emailData && !emailData.bouncedAt) {
      emailData.bouncedAt = new Date();
      emailData.status = 'bounced';

      await this.persistData();
      await this.updateAnalytics(emailData.leadId, emailData.workflowId);

      console.log(`Email bounced tracked: ${messageId}`);
    }
  }

  // SMS Tracking Methods

  public async trackSMSSent(
    messageId: string,
    leadId: number,
    workflowId: string,
    stepId: string,
    templateId: string,
    carrier?: string
  ): Promise<void> {
    const trackingData: SMSTrackingData = {
      messageId,
      leadId,
      workflowId,
      stepId,
      templateId,
      sentAt: new Date(),
      status: 'sent',
      carrier,
      deliveryAttempts: 1,
    };

    this.smsTrackingData.push(trackingData);
    await this.persistData();
    await this.updateAnalytics(leadId, workflowId);

    console.log(`SMS sent tracked: ${messageId} for lead ${leadId}`);
  }

  public async trackSMSDelivered(messageId: string): Promise<void> {
    const smsData = this.smsTrackingData.find(item => item.messageId === messageId);
    if (smsData && !smsData.deliveredAt) {
      smsData.deliveredAt = new Date();
      smsData.status = 'delivered';

      await this.persistData();
      await this.updateAnalytics(smsData.leadId, smsData.workflowId);

      console.log(`SMS delivered tracked: ${messageId}`);
    }
  }

  public async trackSMSFailed(
    messageId: string,
    errorCode?: string,
    errorMessage?: string
  ): Promise<void> {
    const smsData = this.smsTrackingData.find(item => item.messageId === messageId);
    if (smsData && !smsData.failedAt) {
      smsData.failedAt = new Date();
      smsData.status = 'failed';
      smsData.errorCode = errorCode;
      smsData.errorMessage = errorMessage;
      smsData.deliveryAttempts++;

      await this.persistData();
      await this.updateAnalytics(smsData.leadId, smsData.workflowId);

      console.log(`SMS failed tracked: ${messageId}`);
    }
  }

  // In-App Notification Tracking Methods

  public async trackInAppSent(
    notificationId: string,
    leadId: number,
    workflowId: string,
    stepId: string,
    templateId: string,
    deviceInfo?: InAppTrackingData['deviceInfo']
  ): Promise<void> {
    const trackingData: InAppTrackingData = {
      notificationId,
      leadId,
      workflowId,
      stepId,
      templateId,
      sentAt: new Date(),
      status: 'sent',
      deviceInfo,
    };

    this.inAppTrackingData.push(trackingData);
    await this.persistData();
    await this.updateAnalytics(leadId, workflowId);

    console.log(`In-app notification sent tracked: ${notificationId} for lead ${leadId}`);
  }

  public async trackInAppDisplayed(notificationId: string): Promise<void> {
    const inAppData = this.inAppTrackingData.find(item => item.notificationId === notificationId);
    if (inAppData && !inAppData.displayedAt) {
      inAppData.displayedAt = new Date();
      inAppData.status = 'displayed';

      await this.persistData();
      await this.updateAnalytics(inAppData.leadId, inAppData.workflowId);

      console.log(`In-app notification displayed tracked: ${notificationId}`);
    }
  }

  public async trackInAppInteracted(
    notificationId: string,
    interactionType: InAppTrackingData['interactionType'],
    timeToInteract?: number
  ): Promise<void> {
    const inAppData = this.inAppTrackingData.find(item => item.notificationId === notificationId);
    if (inAppData && !inAppData.interactedAt) {
      inAppData.interactedAt = new Date();
      inAppData.status = 'interacted';
      inAppData.interactionType = interactionType;
      inAppData.timeToInteract = timeToInteract;

      await this.persistData();
      await this.updateAnalytics(inAppData.leadId, inAppData.workflowId);

      console.log(`In-app notification interacted tracked: ${notificationId}`);
    }
  }

  public async trackInAppDismissed(notificationId: string): Promise<void> {
    const inAppData = this.inAppTrackingData.find(item => item.notificationId === notificationId);
    if (inAppData && !inAppData.dismissedAt) {
      inAppData.dismissedAt = new Date();
      inAppData.status = 'dismissed';

      await this.persistData();
      await this.updateAnalytics(inAppData.leadId, inAppData.workflowId);

      console.log(`In-app notification dismissed tracked: ${notificationId}`);
    }
  }

  // Analytics Methods

  private async updateAnalytics(leadId: number, workflowId: string): Promise<void> {
    const existingAnalytics = this.analyticsData.find(
      item => item.leadId === leadId && item.workflowId === workflowId
    );

    if (existingAnalytics) {
      await this.recalculateAnalytics(existingAnalytics);
    } else {
      const newAnalytics: ResponseAnalytics = {
        leadId,
        workflowId,
        totalEmails: 0,
        openedEmails: 0,
        clickedEmails: 0,
        bouncedEmails: 0,
        totalSMS: 0,
        deliveredSMS: 0,
        failedSMS: 0,
        totalInApp: 0,
        displayedInApp: 0,
        interactedInApp: 0,
        dismissedInApp: 0,
        openRate: 0,
        clickRate: 0,
        deliveryRate: 0,
        engagementRate: 0,
        averageResponseTime: 0,
        lastActivity: new Date(),
        engagementScore: 0,
      };

      this.analyticsData.push(newAnalytics);
      await this.recalculateAnalytics(newAnalytics);
    }
  }

  private async recalculateAnalytics(analytics: ResponseAnalytics): Promise<void> {
    const leadEmails = this.emailTrackingData.filter(
      item => item.leadId === analytics.leadId && item.workflowId === analytics.workflowId
    );
    const leadSMS = this.smsTrackingData.filter(
      item => item.leadId === analytics.leadId && item.workflowId === analytics.workflowId
    );
    const leadInApp = this.inAppTrackingData.filter(
      item => item.leadId === analytics.leadId && item.workflowId === analytics.workflowId
    );

    // Email metrics
    analytics.totalEmails = leadEmails.length;
    analytics.openedEmails = leadEmails.filter(item => item.status === 'opened').length;
    analytics.clickedEmails = leadEmails.filter(item => item.status === 'clicked').length;
    analytics.bouncedEmails = leadEmails.filter(item => item.status === 'bounced').length;

    // SMS metrics
    analytics.totalSMS = leadSMS.length;
    analytics.deliveredSMS = leadSMS.filter(item => item.status === 'delivered').length;
    analytics.failedSMS = leadSMS.filter(item => item.status === 'failed').length;

    // In-app metrics
    analytics.totalInApp = leadInApp.length;
    analytics.displayedInApp = leadInApp.filter(item => item.status === 'displayed').length;
    analytics.interactedInApp = leadInApp.filter(item => item.status === 'interacted').length;
    analytics.dismissedInApp = leadInApp.filter(item => item.status === 'dismissed').length;

    // Calculate rates
    analytics.openRate = analytics.totalEmails > 0 ? (analytics.openedEmails / analytics.totalEmails) * 100 : 0;
    analytics.clickRate = analytics.totalEmails > 0 ? (analytics.clickedEmails / analytics.totalEmails) * 100 : 0;
    analytics.deliveryRate = analytics.totalSMS > 0 ? (analytics.deliveredSMS / analytics.totalSMS) * 100 : 0;

    const totalEngagements = analytics.openedEmails + analytics.clickedEmails + analytics.interactedInApp;
    const totalCommunications = analytics.totalEmails + analytics.totalSMS + analytics.totalInApp;
    analytics.engagementRate = totalCommunications > 0 ? (totalEngagements / totalCommunications) * 100 : 0;

    // Calculate average response time
    const responseTimes: number[] = [];
    leadEmails.forEach(email => {
      if (email.openedAt) {
        responseTimes.push(email.openedAt.getTime() - email.sentAt.getTime());
      }
    });
    leadInApp.forEach(inApp => {
      if (inApp.interactedAt && inApp.timeToInteract) {
        responseTimes.push(inApp.timeToInteract * 1000);
      }
    });

    analytics.averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length / 1000
      : 0;

    // Update last activity
    const allActivities = [
      ...leadEmails.map(item => item.sentAt),
      ...leadEmails.map(item => item.openedAt).filter(Boolean),
      ...leadEmails.map(item => item.clickedAt).filter(Boolean),
      ...leadSMS.map(item => item.sentAt),
      ...leadSMS.map(item => item.deliveredAt).filter(Boolean),
      ...leadInApp.map(item => item.sentAt),
      ...leadInApp.map(item => item.displayedAt).filter(Boolean),
      ...leadInApp.map(item => item.interactedAt).filter(Boolean),
    ].filter(Boolean) as Date[];

    if (allActivities.length > 0) {
      analytics.lastActivity = new Date(Math.max(...allActivities.map(date => date.getTime())));
    }

    // Calculate engagement score (0-100)
    const emailScore = (analytics.openRate * 0.4) + (analytics.clickRate * 0.6);
    const smsScore = analytics.deliveryRate;
    const inAppScore = (analytics.displayedInApp / Math.max(analytics.totalInApp, 1)) * 50 +
                      (analytics.interactedInApp / Math.max(analytics.totalInApp, 1)) * 50;

    const weightedScore = (
      emailScore * (analytics.totalEmails / Math.max(totalCommunications, 1)) +
      smsScore * (analytics.totalSMS / Math.max(totalCommunications, 1)) +
      inAppScore * (analytics.totalInApp / Math.max(totalCommunications, 1))
    );

    analytics.engagementScore = Math.min(100, Math.max(0, weightedScore));

    await this.persistData();
  }

  public getResponseAnalytics(leadId: number, workflowId?: string): ResponseAnalytics | null {
    if (workflowId) {
      return this.analyticsData.find(
        item => item.leadId === leadId && item.workflowId === workflowId
      ) || null;
    }

    // Return combined analytics for all workflows for this lead
    const leadAnalytics = this.analyticsData.filter(item => item.leadId === leadId);
    if (leadAnalytics.length === 0) return null;

    return leadAnalytics.reduce((combined, current) => ({
      leadId,
      workflowId: 'combined',
      totalEmails: combined.totalEmails + current.totalEmails,
      openedEmails: combined.openedEmails + current.openedEmails,
      clickedEmails: combined.clickedEmails + current.clickedEmails,
      bouncedEmails: combined.bouncedEmails + current.bouncedEmails,
      totalSMS: combined.totalSMS + current.totalSMS,
      deliveredSMS: combined.deliveredSMS + current.deliveredSMS,
      failedSMS: combined.failedSMS + current.failedSMS,
      totalInApp: combined.totalInApp + current.totalInApp,
      displayedInApp: combined.displayedInApp + current.displayedInApp,
      interactedInApp: combined.interactedInApp + current.interactedInApp,
      dismissedInApp: combined.dismissedInApp + current.dismissedInApp,
      openRate: (combined.openedEmails + current.openedEmails) / Math.max(combined.totalEmails + current.totalEmails, 1) * 100,
      clickRate: (combined.clickedEmails + current.clickedEmails) / Math.max(combined.totalEmails + current.totalEmails, 1) * 100,
      deliveryRate: (combined.deliveredSMS + current.deliveredSMS) / Math.max(combined.totalSMS + current.totalSMS, 1) * 100,
      engagementRate: 0, // Will be recalculated
      averageResponseTime: (combined.averageResponseTime + current.averageResponseTime) / 2,
      lastActivity: combined.lastActivity > current.lastActivity ? combined.lastActivity : current.lastActivity,
      engagementScore: (combined.engagementScore + current.engagementScore) / 2,
    }));
  }

  // Workflow Adjustment Methods

  public async recordWorkflowAdjustment(
    workflowId: string,
    leadId: number,
    adjustmentType: WorkflowAdjustment['adjustmentType'],
    reason: string,
    oldValue: any,
    newValue: any
  ): Promise<void> {
    const adjustment: WorkflowAdjustment = {
      workflowId,
      leadId,
      adjustmentType,
      reason,
      oldValue,
      newValue,
      appliedAt: new Date(),
    };

    this.adjustmentsData.push(adjustment);
    await this.persistData();

    console.log(`Workflow adjustment recorded: ${adjustmentType} for workflow ${workflowId}`);
  }

  public getWorkflowAdjustments(workflowId: string, leadId?: number): WorkflowAdjustment[] {
    return this.adjustmentsData.filter(
      item => item.workflowId === workflowId &&
             (!leadId || item.leadId === leadId)
    );
  }

  // Utility Methods

  public async generateTrackingPixel(messageId: string): Promise<string> {
    // Generate a tracking pixel URL for email opens
    const trackingUrl = `https://api.example.com/track/email/${messageId}/open`;
    return `<img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />`;
  }

  public async generateTrackingLink(messageId: string, originalUrl: string): Promise<string> {
    // Generate a tracking link for email clicks
    const trackingUrl = `https://api.example.com/track/email/${messageId}/click?url=${encodeURIComponent(originalUrl)}`;
    return trackingUrl;
  }

  public async cleanup(): Promise<void> {
    // Remove old tracking data (older than 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    this.emailTrackingData = this.emailTrackingData.filter(item => item.sentAt > ninetyDaysAgo);
    this.smsTrackingData = this.smsTrackingData.filter(item => item.sentAt > ninetyDaysAgo);
    this.inAppTrackingData = this.inAppTrackingData.filter(item => item.sentAt > ninetyDaysAgo);

    await this.persistData();
    console.log('Response tracking data cleaned up');
  }
}

// Export singleton instance
export const responseTrackingService = ResponseTrackingService.getInstance();