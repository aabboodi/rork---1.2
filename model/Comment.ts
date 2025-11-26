import { Model } from '@nozbe/watermelondb';
import { field, date, text, relation } from '@nozbe/watermelondb/decorators';
import Post from './Post';

export default class Comment extends Model {
    static table = 'comments';

    @text('content') content!: string;
    @text('author_id') authorId!: string;
    @date('timestamp') timestamp!: Date;

    @relation('posts', 'post_id') post!: Post;
}
