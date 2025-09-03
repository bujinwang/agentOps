import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-netinfo/lib/commonjs';
import { Lead, Task, Interaction } from '../types';

interface OfflineAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'lead' | 'task' | 'interaction';
  data: any;
  timestamp: number;
  localId?: string; // For optimistic updates
}

interface SyncStatus {
  lastSyncTime: number;
  pendingActions: number;
  isOnline: boolean;
  syncInProgress: boolean;
}

class OfflineStorageService {
  private readonly STORAGE_KEYS = {
    LEADS: '@RealEstateCRM:leads',
    TASKS: '@RealEstateCRM:tasks',
    INTERACTIONS: '@RealEstateCRM:interactions',
    PENDING_ACTIONS: '@RealEstateCRM:pendingActions',
    LAST_SYNC: '@RealEstateCRM:lastSync',
  };

  private syncCallbacks: Array<(status: SyncStatus) => void> = [];
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;

  constructor() {
    this.initializeNetworkListener();
  }

  private initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected || false;
      
      // If we just came back online, trigger sync
      if (wasOffline && this.isOnline && !this.syncInProgress) {
        this.syncPendingActions();
      }
      
      this.notifyStatusChange();
    });
  }

  // Storage operations
  private async getStoredData<T>(key: string): Promise<T[]> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Error getting stored data for ${key}:`, error);
      return [];
    }
  }

  private async setStoredData<T>(key: string, data: T[]): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error storing data for ${key}:`, error);
    }
  }

  // Lead operations
  async getLeads(): Promise<Lead[]> {
    return this.getStoredData<Lead>(this.STORAGE_KEYS.LEADS);
  }

  async saveLead(lead: Lead, isOptimistic: boolean = false): Promise<void> {
    const leads = await this.getLeads();
    const existingIndex = leads.findIndex(l => l.leadId === lead.leadId);
    
    if (existingIndex >= 0) {
      leads[existingIndex] = lead;
    } else {
      leads.push(lead);
    }
    
    await this.setStoredData(this.STORAGE_KEYS.LEADS, leads);
    
    if (!this.isOnline || isOptimistic) {
      await this.addPendingAction({
        type: existingIndex >= 0 ? 'UPDATE' : 'CREATE',
        entity: 'lead',
        data: lead,
      });
    }
  }

  async deleteLead(leadId: number): Promise<void> {
    const leads = await this.getLeads();
    const filteredLeads = leads.filter(l => l.leadId !== leadId);
    await this.setStoredData(this.STORAGE_KEYS.LEADS, filteredLeads);
    
    if (!this.isOnline) {
      await this.addPendingAction({
        type: 'DELETE',
        entity: 'lead',
        data: { leadId },
      });
    }
  }

  // Task operations
  async getTasks(): Promise<Task[]> {
    return this.getStoredData<Task>(this.STORAGE_KEYS.TASKS);
  }

  async saveTask(task: Task, isOptimistic: boolean = false): Promise<void> {
    const tasks = await this.getTasks();
    const existingIndex = tasks.findIndex(t => t.taskId === task.taskId);
    
    if (existingIndex >= 0) {
      tasks[existingIndex] = task;
    } else {
      tasks.push(task);
    }
    
    await this.setStoredData(this.STORAGE_KEYS.TASKS, tasks);
    
    if (!this.isOnline || isOptimistic) {
      await this.addPendingAction({
        type: existingIndex >= 0 ? 'UPDATE' : 'CREATE',
        entity: 'task',
        data: task,
      });
    }
  }

  async deleteTask(taskId: number): Promise<void> {
    const tasks = await this.getTasks();
    const filteredTasks = tasks.filter(t => t.taskId !== taskId);
    await this.setStoredData(this.STORAGE_KEYS.TASKS, filteredTasks);
    
    if (!this.isOnline) {
      await this.addPendingAction({
        type: 'DELETE',
        entity: 'task',
        data: { taskId },
      });
    }
  }

  // Interaction operations
  async getInteractions(): Promise<Interaction[]> {
    return this.getStoredData<Interaction>(this.STORAGE_KEYS.INTERACTIONS);
  }

  async saveInteraction(interaction: Interaction, isOptimistic: boolean = false): Promise<void> {
    const interactions = await this.getInteractions();
    const existingIndex = interactions.findIndex(i => i.interactionId === interaction.interactionId);
    
    if (existingIndex >= 0) {
      interactions[existingIndex] = interaction;
    } else {
      interactions.push(interaction);
    }
    
    await this.setStoredData(this.STORAGE_KEYS.INTERACTIONS, interactions);
    
    if (!this.isOnline || isOptimistic) {
      await this.addPendingAction({
        type: existingIndex >= 0 ? 'UPDATE' : 'CREATE',
        entity: 'interaction',
        data: interaction,
      });
    }
  }

  // Pending actions management
  private async addPendingAction(action: Omit<OfflineAction, 'id' | 'timestamp'>): Promise<void> {
    const pendingActions = await this.getPendingActions();
    const newAction: OfflineAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    
    pendingActions.push(newAction);
    await AsyncStorage.setItem(this.STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(pendingActions));
    this.notifyStatusChange();
  }

  private async getPendingActions(): Promise<OfflineAction[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEYS.PENDING_ACTIONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting pending actions:', error);
      return [];
    }
  }

  private async clearPendingActions(): Promise<void> {
    await AsyncStorage.setItem(this.STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify([]));
    this.notifyStatusChange();
  }

  // Sync operations
  async syncPendingActions(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;
    this.notifyStatusChange();

    try {
      const pendingActions = await this.getPendingActions();
      
      for (const action of pendingActions) {
        try {
          await this.executeAction(action);
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
          // In a production app, you might want to implement retry logic here
        }
      }

      await this.clearPendingActions();
      await AsyncStorage.setItem(this.STORAGE_KEYS.LAST_SYNC, Date.now().toString());
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      this.syncInProgress = false;
      this.notifyStatusChange();
    }
  }

  private async executeAction(action: OfflineAction): Promise<void> {
    // This would typically call your API service
    // For now, we'll just log the action
    console.log(`Executing offline action:`, action);
    
    // In a real implementation, you would:
    // - Call the appropriate API method
    // - Handle conflicts (what if the server data has changed?)
    // - Update local storage with the server response
    
    switch (action.entity) {
      case 'lead':
        if (action.type === 'CREATE') {
          // await apiService.createLead(action.data);
        } else if (action.type === 'UPDATE') {
          // await apiService.updateLead(action.data.leadId, action.data);
        } else if (action.type === 'DELETE') {
          // await apiService.deleteLead(action.data.leadId);
        }
        break;
        
      case 'task':
        if (action.type === 'CREATE') {
          // await apiService.createTask(action.data);
        } else if (action.type === 'UPDATE') {
          // await apiService.updateTask(action.data.taskId, action.data);
        } else if (action.type === 'DELETE') {
          // await apiService.deleteTask(action.data.taskId);
        }
        break;
        
      case 'interaction':
        if (action.type === 'CREATE') {
          // await apiService.addInteraction(action.data);
        }
        break;
    }
  }

  // Full data sync
  async fullSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot perform full sync while offline');
    }

    this.syncInProgress = true;
    this.notifyStatusChange();

    try {
      // In a real implementation, you would:
      // 1. Fetch latest data from server
      // 2. Compare with local data
      // 3. Resolve conflicts
      // 4. Update local storage
      // 5. Sync pending actions
      
      await this.syncPendingActions();
      await AsyncStorage.setItem(this.STORAGE_KEYS.LAST_SYNC, Date.now().toString());
    } catch (error) {
      console.error('Error during full sync:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
      this.notifyStatusChange();
    }
  }

  // Status management
  async getSyncStatus(): Promise<SyncStatus> {
    const pendingActions = await this.getPendingActions();
    const lastSyncData = await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_SYNC);
    const lastSyncTime = lastSyncData ? parseInt(lastSyncData) : 0;

    return {
      lastSyncTime,
      pendingActions: pendingActions.length,
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
    };
  }

  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.syncCallbacks.indexOf(callback);
      if (index > -1) {
        this.syncCallbacks.splice(index, 1);
      }
    };
  }

  private async notifyStatusChange(): Promise<void> {
    const status = await this.getSyncStatus();
    this.syncCallbacks.forEach(callback => callback(status));
  }

  // Data management
  async clearAllData(): Promise<void> {
    await AsyncStorage.multiRemove([
      this.STORAGE_KEYS.LEADS,
      this.STORAGE_KEYS.TASKS,
      this.STORAGE_KEYS.INTERACTIONS,
      this.STORAGE_KEYS.PENDING_ACTIONS,
      this.STORAGE_KEYS.LAST_SYNC,
    ]);
  }

  async getStorageSize(): Promise<{ totalSize: number; breakdown: Record<string, number> }> {
    const breakdown: Record<string, number> = {};
    let totalSize = 0;

    for (const [key, storageKey] of Object.entries(this.STORAGE_KEYS)) {
      try {
        const data = await AsyncStorage.getItem(storageKey);
        const size = data ? new Blob([data]).size : 0;
        breakdown[key] = size;
        totalSize += size;
      } catch (error) {
        console.error(`Error calculating size for ${key}:`, error);
        breakdown[key] = 0;
      }
    }

    return { totalSize, breakdown };
  }

  // Optimistic updates
  generateOptimisticId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async createOptimisticLead(leadData: Omit<Lead, 'leadId'>): Promise<Lead> {
    const optimisticLead: Lead = {
      ...leadData,
      leadId: parseInt(this.generateOptimisticId()),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.saveLead(optimisticLead, true);
    return optimisticLead;
  }

  async createOptimisticTask(taskData: Omit<Task, 'taskId'>): Promise<Task> {
    const optimisticTask: Task = {
      ...taskData,
      taskId: parseInt(this.generateOptimisticId()),
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.saveTask(optimisticTask, true);
    return optimisticTask;
  }
}

export const offlineStorage = new OfflineStorageService();
export default offlineStorage;