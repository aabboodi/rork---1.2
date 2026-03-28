import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
    version: 1,
    tables: [
        tableSchema({
            name: 'users',
            columns: [
                { name: 'username', type: 'string' },
                { name: 'avatar_url', type: 'string', isOptional: true },
                { name: 'public_key', type: 'string' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'messages',
            columns: [
                { name: 'conversation_id', type: 'string', isIndexed: true },
                { name: 'sender_id', type: 'string' },
                { name: 'content', type: 'string' }, // Encrypted content
                { name: 'timestamp', type: 'number', isIndexed: true },
                { name: 'status', type: 'string' }, // 'sent', 'delivered', 'read'
                { name: 'type', type: 'string' }, // 'text', 'image', 'video', 'audio', 'money'
            ],
        }),
        tableSchema({
            name: 'posts',
            columns: [
                { name: 'author_id', type: 'string', isIndexed: true },
                { name: 'content', type: 'string', isOptional: true },
                { name: 'media_url', type: 'string', isOptional: true },
                { name: 'media_type', type: 'string' }, // 'image', 'video'
                { name: 'likes_count', type: 'number' },
                { name: 'comments_count', type: 'number' },
                { name: 'timestamp', type: 'number', isIndexed: true },
            ],
        }),
        tableSchema({
            name: 'comments',
            columns: [
                { name: 'post_id', type: 'string', isIndexed: true },
                { name: 'author_id', type: 'string' },
                { name: 'content', type: 'string' },
                { name: 'timestamp', type: 'number' },
            ],
        }),
    ],
});
