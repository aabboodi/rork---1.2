import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export default class User extends Model {
    static table = 'users';

    @text('username') username!: string;
    @text('avatar_url') avatarUrl?: string;
    @text('public_key') publicKey!: string;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
}
