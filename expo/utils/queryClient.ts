import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create Query Client with offline-first configuration
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Cache data for 24 hours
            cacheTime: 1000 * 60 * 60 * 24,
            // Consider data fresh for 5 minutes
            staleTime: 1000 * 60 * 5,
            // Retry failed requests 3 times
            retry: 3,
            // Retry with exponential backoff
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Refetch on window focus
            refetchOnWindowFocus: true,
            // Refetch on reconnect
            refetchOnReconnect: true,
            // Keep previous data while fetching new data
            keepPreviousData: true,
        },
        mutations: {
            // Retry failed mutations
            retry: 2,
            // Network mode for offline support
            networkMode: 'offlineFirst',
        },
    },
});

// Create AsyncStorage persister for offline persistence
export const asyncStoragePersister = createAsyncStoragePersister({
    storage: AsyncStorage,
    throttleTime: 1000, // Throttle writes to storage
    key: 'MADA_QUERY_CACHE',
});

// Utility to check network status
export const isOnline = async (): Promise<boolean> => {
    try {
        // Simple check - try to fetch a small resource
        const response = await fetch('https://www.google.com/generate_204', {
            method: 'HEAD',
            cache: 'no-cache',
        });
        return response.ok;
    } catch {
        return false;
    }
};

// Queue for offline mutations
interface QueuedMutation {
    id: string;
    type: string;
    data: any;
    timestamp: number;
    retryCount: number;
}

class OfflineQueue {
    private queue: QueuedMutation[] = [];
    private isProcessing = false;
    private readonly QUEUE_KEY = 'MADA_OFFLINE_QUEUE';

    async addToQueue(type: string, data: any): Promise<void> {
        const mutation: QueuedMutation = {
            id: `${type}_${Date.now()}`,
            type,
            data,
            timestamp: Date.now(),
            retryCount: 0,
        };

        this.queue.push(mutation);
        await this.saveQueue();
        console.log(`[OfflineQueue] Added to queue: ${type}`);
    }

    async loadQueue(): Promise<void> {
        try {
            const stored = await AsyncStorage.getItem(this.QUEUE_KEY);
            if (stored) {
                this.queue = JSON.parse(stored);
                console.log(`[OfflineQueue] Loaded ${this.queue.length} items from storage`);
            }
        } catch (error) {
            console.error('[OfflineQueue] Failed to load queue:', error);
        }
    }

    async saveQueue(): Promise<void> {
        try {
            await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.queue));
        } catch (error) {
            console.error('[OfflineQueue] Failed to save queue:', error);
        }
    }

    async processQueue(): Promise<void> {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }

        const online = await isOnline();
        if (!online) {
            console.log('[OfflineQueue] Offline - skipping queue processing');
            return;
        }

        this.isProcessing = true;
        console.log(`[OfflineQueue] Processing ${this.queue.length} items...`);

        while (this.queue.length > 0) {
            const mutation = this.queue[0];

            try {
                await this.processMutation(mutation);
                this.queue.shift(); // Remove from queue on success
                await this.saveQueue();
                console.log(`[OfflineQueue] Processed: ${mutation.type}`);
            } catch (error) {
                console.error(`[OfflineQueue] Failed to process: ${mutation.type}`, error);
                mutation.retryCount++;

                if (mutation.retryCount >= 3) {
                    console.log(`[OfflineQueue] Max retries reached for ${mutation.type}, removing`);
                    this.queue.shift();
                    await this.saveQueue();
                } else {
                    // Keep in queue for retry
                    break;
                }
            }
        }

        this.isProcessing = false;
    }

    private async processMutation(mutation: QueuedMutation): Promise<void> {
        // This will be implemented based on mutation type
        switch (mutation.type) {
            case 'SEND_MESSAGE':
                // await sendMessageAPI(mutation.data);
                break;
            case 'LIKE_POST':
                // await likePostAPI(mutation.data);
                break;
            case 'CREATE_POST':
                // await createPostAPI(mutation.data);
                break;
            case 'DONATE':
                // await donateAPI(mutation.data);
                break;
            default:
                console.warn(`[OfflineQueue] Unknown mutation type: ${mutation.type}`);
        }
    }

    getQueueSize(): number {
        return this.queue.length;
    }

    clearQueue(): void {
        this.queue = [];
        this.saveQueue();
    }
}

export const offlineQueue = new OfflineQueue();

// Initialize offline queue on app start
export const initializeOfflineSupport = async (): Promise<void> => {
    await offlineQueue.loadQueue();

    // Process queue every 30 seconds
    setInterval(() => {
        offlineQueue.processQueue();
    }, 30000);

    // Process immediately if online
    const online = await isOnline();
    if (online) {
        offlineQueue.processQueue();
    }
};

// Optimistic update helpers
export const optimisticUpdate = <T>(
    queryKey: string[],
    updater: (old: T | undefined) => T
) => {
    queryClient.setQueryData<T>(queryKey, updater);
};

export const rollbackOptimisticUpdate = <T>(
    queryKey: string[],
    previousData: T
) => {
    queryClient.setQueryData<T>(queryKey, previousData);
};

// Network-aware fetch wrapper
export const offlineFirstFetch = async <T>(
    url: string,
    options?: RequestInit
): Promise<T> => {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('[OfflineFirst] Fetch failed, falling back to cache:', error);
        throw error;
    }
};
