import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Platform } from 'react-native';

// Types for Sync Actions
export type SyncActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'UPLOAD';

export interface SyncAction {
    id: string;
    type: SyncActionType;
    resource: string; // e.g., 'messages', 'posts', 'transactions'
    payload: any;
    timestamp: number;
    retryCount: number;
    meta?: Record<string, any>;
}

interface SyncState {
    queue: SyncAction[];
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncTime: number | null;
    addToQueue: (action: Omit<SyncAction, 'id' | 'timestamp' | 'retryCount'>) => void;
    removeFromQueue: (id: string) => void;
    setOnlineStatus: (status: boolean) => void;
    setSyncing: (status: boolean) => void;
    updateLastSyncTime: () => void;
    incrementRetry: (id: string) => void;
    clearQueue: () => void;
}

// Zustand Store for Sync Queue
export const useSyncStore = create<SyncState>()(
    persist(
        (set, get) => ({
            queue: [],
            isOnline: true, // Default to true, should be updated by Network listener
            isSyncing: false,
            lastSyncTime: null,

            addToQueue: (action) => {
                const newAction: SyncAction = {
                    ...action,
                    id: Math.random().toString(36).substring(7) + Date.now().toString(),
                    timestamp: Date.now(),
                    retryCount: 0,
                };
                set((state) => ({ queue: [...state.queue, newAction] }));
            },

            removeFromQueue: (id) => {
                set((state) => ({
                    queue: state.queue.filter((action) => action.id !== id),
                }));
            },

            setOnlineStatus: (status) => set({ isOnline: status }),
            setSyncing: (status) => set({ isSyncing: status }),
            updateLastSyncTime: () => set({ lastSyncTime: Date.now() }),

            incrementRetry: (id) => {
                set((state) => ({
                    queue: state.queue.map((action) =>
                        action.id === id ? { ...action, retryCount: action.retryCount + 1 } : action
                    ),
                }));
            },

            clearQueue: () => set({ queue: [] }),
        }),
        {
            name: 'offline-sync-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

class OfflineSyncService {
    private static instance: OfflineSyncService;
    private maxRetries = 3;
    private syncInterval: NodeJS.Timeout | null = null;

    private constructor() {
        this.startAutoSync();
    }

    static getInstance(): OfflineSyncService {
        if (!OfflineSyncService.instance) {
            OfflineSyncService.instance = new OfflineSyncService();
        }
        return OfflineSyncService.instance;
    }

    // Start automatic sync interval
    private startAutoSync() {
        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = setInterval(() => {
            this.processQueue();
        }, 30000); // Try to sync every 30 seconds
    }

    // Process the sync queue
    async processQueue() {
        const { queue, isOnline, isSyncing, setSyncing, removeFromQueue, incrementRetry, updateLastSyncTime } = useSyncStore.getState();

        if (!isOnline || isSyncing || queue.length === 0) {
            return;
        }

        setSyncing(true);
        console.log(`Starting sync for ${queue.length} items...`);

        // Process items sequentially to ensure order
        for (const action of queue) {
            try {
                await this.performAction(action);
                removeFromQueue(action.id);
                console.log(`Synced action: ${action.type} ${action.resource}`);
            } catch (error) {
                console.error(`Failed to sync action ${action.id}:`, error);
                if (action.retryCount >= this.maxRetries) {
                    console.warn(`Action ${action.id} exceeded max retries. Moving to DLQ or discarding.`);
                    removeFromQueue(action.id); // Remove or move to Dead Letter Queue
                    // TODO: Implement Dead Letter Queue
                } else {
                    incrementRetry(action.id);
                }
            }
        }

        updateLastSyncTime();
        setSyncing(false);
    }

    // Perform the actual API call based on action type
    private async performAction(action: SyncAction): Promise<void> {
        // This method should be extended to handle different resources and types
        // For now, it's a placeholder that simulates an API call

        // In a real implementation, this would switch on action.resource and call appropriate services
        // e.g., if (action.resource === 'messages') await ChatService.sendMessage(action.payload);

        return new Promise((resolve, reject) => {
            // Simulate network request
            setTimeout(() => {
                // Randomly fail to simulate unstable network
                if (Math.random() > 0.9) {
                    reject(new Error('Simulated network error'));
                } else {
                    resolve();
                }
            }, 500);
        });
    }

    // Public method to add actions to queue
    queueAction(type: SyncActionType, resource: string, payload: any, meta?: Record<string, any>) {
        useSyncStore.getState().addToQueue({
            type,
            resource,
            payload,
            meta,
        });

        // Try to process immediately if online
        if (useSyncStore.getState().isOnline) {
            this.processQueue();
        }
    }

    // Update network status (should be called by a Network Listener component)
    updateNetworkStatus(isOnline: boolean) {
        useSyncStore.getState().setOnlineStatus(isOnline);
        if (isOnline) {
            this.processQueue();
        }
    }

    // Get current queue status
    getQueueStatus() {
        const state = useSyncStore.getState();
        return {
            pendingCount: state.queue.length,
            isOnline: state.isOnline,
            isSyncing: state.isSyncing,
            lastSync: state.lastSyncTime
        };
    }
}

export default OfflineSyncService;
