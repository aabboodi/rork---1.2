import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { models } from './index';
import { Platform } from 'react-native';

// First, create the adapter to the underlying database:
const adapter = new SQLiteAdapter({
    schema,
    // (You might want to comment out migrations if you're not using them yet)
    // migrations,
    // (recommended option, should work flawlessly out of the box on iOS. On Android,
    // additional installation steps have to be taken - see docs)
    jsi: Platform.OS === 'ios',
    onSetUpError: error => {
        // Database failed to load -- offer the user to reload the app or log out
        console.error('Database setup error:', error);
    }
});

// Then, make a Watermelon database from it!
export const database = new Database({
    adapter,
    modelClasses: models,
});
