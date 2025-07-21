import SupabaseService from './supabase.js';
import UIManager from './ui.js';

class MessageApp {
  constructor() {
    this.supabase = new SupabaseService();
    this.ui = new UIManager();
    this.isInitialized = false;
  }

  // Initialize the application
  async init() {
    try {
      console.log('Initializing Message App...');
      
      // Show loading state
      this.ui.showLoading();
      
      // Initialize Supabase connection
      await this.supabase.init();
      
      // Load initial messages
      await this.loadMessages();
      
      // Set up real-time subscription
      this.setupRealtimeSubscription();
      
      // Set up event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('Message App initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.ui.hideLoading();
      this.ui.showError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
    }
  }

  // Load messages from Supabase
  async loadMessages() {
    try {
      const messages = await this.supabase.loadMessages();
      this.ui.renderMessages(messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      this.ui.hideLoading();
      this.ui.showError('ไม่สามารถโหลดข้อความได้');
    }
  }

  // Set up real-time subscription
  setupRealtimeSubscription() {
    try {
      this.supabase.subscribeToMessages((newMessage) => {
        // Only add message if it's not from current session
        // (to avoid duplicate when user sends message)
        this.ui.addMessageToTop(newMessage);
      });
    } catch (error) {
      console.error('Failed to set up real-time subscription:', error);
      // App can still work without real-time updates
    }
  }

  // Set up event listeners
  setupEventListeners() {
    // Listen for send message events from UI
    document.addEventListener('sendMessage', async (event) => {
      await this.handleSendMessage(event.detail.text);
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // Handle visibility change (when user switches tabs)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isInitialized) {
        // Refresh messages when user comes back to tab
        this.loadMessages();
      }
    });
  }

  // Handle sending a new message
  async handleSendMessage(text) {
    if (!text || !text.trim()) {
      this.ui.showError('กรุณาพิมพ์ข้อความ');
      return;
    }

    try {
      // Show sending state
      this.ui.showSending();
      
      // Insert message to Supabase
      const newMessage = await this.supabase.insertMessage(text);
      
      // Clear input and hide sending state
      this.ui.clearInput();
      this.ui.hideSending();
      
      // Add message to UI immediately (optimistic update)
      this.ui.addMessageToTop(newMessage);
      
      console.log('Message sent successfully:', newMessage);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      this.ui.hideSending();
      this.ui.showError('ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง');
    }
  }

  // Clean up resources
  cleanup() {
    if (this.supabase) {
      this.supabase.destroy();
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  const app = new MessageApp();
  await app.init();
  
  // Make app globally available for debugging
  window.messageApp = app;
});

// Handle errors globally
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});