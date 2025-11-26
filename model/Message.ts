import { Model } from '@nozbe/watermelondb';
import { field, date, text, readonly } from '@nozbe/watermelondb/decorators';

export default class Message extends Model {
    static table = 'messages';

    @text('conversation_id') conversationId!: string;
    @text('sender_id') senderId!: string;
    @text('content') content!: string;
    @date('timestamp') timestamp!: Date;
    @text('status') status!: string;
    @text('type') type!: string;
}
