import { Model } from '@nozbe/watermelondb';
import { field, date, text, children } from '@nozbe/watermelondb/decorators';
import Comment from './Comment';

export default class Post extends Model {
    static table = 'posts';

    @text('author_id') authorId!: string;
    @text('content') content?: string;
    @text('media_url') mediaUrl?: string;
    @text('media_type') mediaType!: string;
    @field('likes_count') likesCount!: number;
    @field('comments_count') commentsCount!: number;
    @date('timestamp') timestamp!: Date;

    @children('comments') comments!: any;
}
