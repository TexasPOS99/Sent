import { createClient } from '@supabase/supabase-js';
import { supabaseConfig, appConfig } from './config.js';

class SupabaseService {
  constructor() {
    this.client = createClient(supabaseConfig.url, supabaseConfig.anonKey);
    this.subscriptions = [];
  }

  // Initialize the service
  async init() {
    try {
      // Test connection
      const { data, error } = await this.client
        .from(appConfig.tableName)
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('Supabase connection error:', error);
        throw error;
      }
      
      console.log('Supabase connected successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
      throw error;
    }
  }

  // Insert a new message
  async insertMessage(text) {
    try {
      const { data, error } = await this.client
        .from(appConfig.tableName)
        .insert([
          {
            text: text.trim(),
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) {
        console.error('Error inserting message:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Failed to insert message:', error);
      throw error;
    }
  }

  // Load all messages
  async loadMessages() {
    try {
      const { data, error } = await this.client
        .from(appConfig.tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading messages:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to load messages:', error);
      throw error;
    }
  }

  // Subscribe to real-time changes
  subscribeToMessages(callback) {
    try {
      const subscription = this.client
        .channel('messages_channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: appConfig.tableName
          },
          (payload) => {
            console.log('New message received:', payload.new);
            callback(payload.new);
          }
        )
        .subscribe();

      this.subscriptions.push(subscription);
      console.log('Subscribed to real-time messages');
      
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to messages:', error);
      throw error;
    }
  }

  // Unsubscribe from all subscriptions
  unsubscribeAll() {
    this.subscriptions.forEach(subscription => {
      this.client.removeChannel(subscription);
    });
    this.subscriptions = [];
    console.log('Unsubscribed from all channels');
  }

  // Clean up
  destroy() {
    this.unsubscribeAll();
  }
}

export default SupabaseService;