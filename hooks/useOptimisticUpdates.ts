import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { offlineQueue, optimisticUpdate, rollbackOptimisticUpdate } from '@/utils/queryClient';
import { Post } from '@/types';

/**
 * Hook for creating a post with optimistic update
 */
export const useCreatePost = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newPost: Omit<Post, 'id' | 'timestamp'>) => {
            // Simulate API call
            // In production: return await createPostAPI(newPost);
            return {
                ...newPost,
                id: `post_${Date.now()}`,
                timestamp: Date.now(),
            } as Post;
        },

        onMutate: async (newPost) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['posts'] });

            // Snapshot previous value
            const previousPosts = queryClient.getQueryData<Post[]>(['posts']);

            // Optimistically update to the new value
            const optimisticPost: Post = {
                ...newPost,
                id: `temp_${Date.now()}`,
                timestamp: Date.now(),
                likes: 0,
                comments: 0,
                shares: 0,
            } as Post;

            queryClient.setQueryData<Post[]>(['posts'], (old = []) => [
                optimisticPost,
                ...old,
            ]);

            console.log('[OptimisticUI] Post created optimistically');

            return { previousPosts, optimisticPost };
        },

        onError: (err, newPost, context) => {
            // Rollback on error
            if (context?.previousPosts) {
                queryClient.setQueryData(['posts'], context.previousPosts);
            }

            // Add to offline queue
            offlineQueue.addToQueue('CREATE_POST', newPost);

            console.error('[OptimisticUI] Post creation failed, rolled back:', err);
        },

        onSuccess: (data, variables, context) => {
            // Replace temporary post with real one
            queryClient.setQueryData<Post[]>(['posts'], (old = []) =>
                old.map((post) =>
                    post.id === context?.optimisticPost.id ? data : post
                )
            );

            console.log('[OptimisticUI] Post created successfully:', data.id);
        },

        onSettled: () => {
            // Always refetch after error or success
            queryClient.invalidateQueries({ queryKey: ['posts'] });
        },
    });
};

/**
 * Hook for liking a post with optimistic update
 */
export const useLikePost = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
            // Simulate API call
            // In production: return await likePostAPI(postId, isLiked);
            return { postId, isLiked };
        },

        onMutate: async ({ postId, isLiked }) => {
            await queryClient.cancelQueries({ queryKey: ['posts'] });

            const previousPosts = queryClient.getQueryData<Post[]>(['posts']);

            // Optimistic update
            queryClient.setQueryData<Post[]>(['posts'], (old = []) =>
                old.map((post) =>
                    post.id === postId
                        ? {
                            ...post,
                            isLiked,
                            likes: isLiked ? post.likes + 1 : post.likes - 1,
                        }
                        : post
                )
            );

            console.log(`[OptimisticUI] Post ${isLiked ? 'liked' : 'unliked'} optimistically`);

            return { previousPosts };
        },

        onError: (err, variables, context) => {
            if (context?.previousPosts) {
                queryClient.setQueryData(['posts'], context.previousPosts);
            }

            offlineQueue.addToQueue('LIKE_POST', variables);
            console.error('[OptimisticUI] Like failed, rolled back:', err);
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['posts'] });
        },
    });
};

/**
 * Hook for sending a message with optimistic update
 */
export const useSendMessage = (chatId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (message: any) => {
            // Simulate API call
            // In production: return await sendMessageAPI(chatId, message);
            return {
                ...message,
                id: `msg_${Date.now()}`,
                timestamp: Date.now(),
                status: 'sent',
            };
        },

        onMutate: async (message) => {
            await queryClient.cancelQueries({ queryKey: ['messages', chatId] });

            const previousMessages = queryClient.getQueryData(['messages', chatId]);

            const optimisticMessage = {
                ...message,
                id: `temp_${Date.now()}`,
                timestamp: Date.now(),
                status: 'sending',
            };

            queryClient.setQueryData(['messages', chatId], (old: any = []) => [
                ...old,
                optimisticMessage,
            ]);

            console.log('[OptimisticUI] Message sent optimistically');

            return { previousMessages, optimisticMessage };
        },

        onError: (err, message, context) => {
            if (context?.previousMessages) {
                queryClient.setQueryData(['messages', chatId], context.previousMessages);
            }

            offlineQueue.addToQueue('SEND_MESSAGE', { chatId, message });
            console.error('[OptimisticUI] Message send failed, rolled back:', err);
        },

        onSuccess: (data, variables, context) => {
            // Replace temporary message with real one
            queryClient.setQueryData(['messages', chatId], (old: any = []) =>
                old.map((msg: any) =>
                    msg.id === context?.optimisticMessage.id ? data : msg
                )
            );

            console.log('[OptimisticUI] Message sent successfully:', data.id);
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
        },
    });
};

/**
 * Hook for donating with optimistic update
 */
export const useDonate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            recipientId,
            amount,
            currency,
        }: {
            recipientId: string;
            amount: number;
            currency: string;
        }) => {
            // Simulate API call
            // In production: return await donateAPI(recipientId, amount, currency);
            return {
                id: `donation_${Date.now()}`,
                recipientId,
                amount,
                currency,
                timestamp: Date.now(),
                status: 'completed',
            };
        },

        onMutate: async (donation) => {
            console.log('[OptimisticUI] Processing donation optimistically:', donation);

            // Update balance immediately
            queryClient.setQueryData(['balance'], (old: any) => ({
                ...old,
                [donation.currency]: old[donation.currency] - donation.amount,
            }));

            return { donation };
        },

        onError: (err, donation, context) => {
            // Rollback balance
            queryClient.setQueryData(['balance'], (old: any) => ({
                ...old,
                [donation.currency]: old[donation.currency] + donation.amount,
            }));

            offlineQueue.addToQueue('DONATE', donation);
            console.error('[OptimisticUI] Donation failed, rolled back:', err);
        },

        onSuccess: (data) => {
            console.log('[OptimisticUI] Donation successful:', data.id);
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['balance'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
    });
};

/**
 * Hook for fetching posts with offline support
 */
export const usePosts = () => {
    return useQuery({
        queryKey: ['posts'],
        queryFn: async () => {
            // Simulate API call
            // In production: return await fetchPostsAPI();
            return [] as Post[];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        cacheTime: 1000 * 60 * 60 * 24, // 24 hours
    });
};

/**
 * Hook for fetching messages with offline support
 */
export const useMessages = (chatId: string) => {
    return useQuery({
        queryKey: ['messages', chatId],
        queryFn: async () => {
            // Simulate API call
            // In production: return await fetchMessagesAPI(chatId);
            return [];
        },
        enabled: !!chatId,
        staleTime: 1000 * 60, // 1 minute
    });
};
