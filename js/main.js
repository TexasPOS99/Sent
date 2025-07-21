import SupabaseService from './supabase.js';
import UIManager from './ui.js';

class MessageApp {
  constructor() {
    this.supabase = new SupabaseService();
    this.ui = new UIManager();
    this.isInitialized = false;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  // Initialize the application
  async init() {
    try {
      console.log('🚀 Initializing Message App...');
      
      // Show loading state
      this.ui.showLoading();
      this.ui.updateConnectionStatus(false);
      
      // Initialize Supabase connection
      await this.supabase.init();
      this.ui.updateConnectionStatus(true);
      
      // Load initial messages
      await this.loadMessages();
      
      // Set up real-time subscription
      this.setupRealtimeSubscription();
      
      // Set up event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      this.retryCount = 0;
      
      console.log('✅ Message App initialized successfully');
      this.ui.showSuccess('เชื่อมต่อสำเร็จ!');
      
    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
      this.ui.hideLoading();
      this.ui.updateConnectionStatus(false);
      
      // Retry logic
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`🔄 Retrying initialization (${this.retryCount}/${this.maxRetries})...`);
        this.ui.showToast(`กำลังลองเชื่อมต่อใหม่... (${this.retryCount}/${this.maxRetries})`, 'warning');
        
        setTimeout(() => {
          this.init();
        }, 2000 * this.retryCount); // Exponential backoff
      } else {
        this.ui.showError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองใหม่อีกครั้ง');
      }
    }
  }

  // Load messages from Supabase
  async loadMessages() {
    try {
      console.log('📥 Loading messages...');
      const messages = await this.supabase.loadMessages();
      this.ui.renderMessages(messages);
      console.log(`✅ Loaded ${messages.length} messages`);
    } catch (error) {
      console.error('❌ Failed to load messages:', error);
      this.ui.hideLoading();
      this.ui.showError('ไม่สามารถโหลดข้อความได้ กรุณาลองใหม่อีกครั้ง');
    }
  }

  // Set up real-time subscription
  setupRealtimeSubscription() {
    try {
      console.log('🔄 Setting up real-time subscription...');
      this.supabase.subscribeToMessages((newMessage) => {
        console.log('📨 New message received:', newMessage);
        // Add message to UI (will be filtered to avoid duplicates)
        this.ui.addMessageToTop(newMessage);
        
        // Show notification if message is not from current user
        if (!this.isCurrentUserMessage(newMessage)) {
          this.ui.showToast('มีข้อความใหม่! 📨', 'info');
        }
      });
      console.log('✅ Real-time subscription active');
    } catch (error) {
      console.error('❌ Failed to set up real-time subscription:', error);
      // App can still work without real-time updates
      this.ui.showToast('การอัปเดตแบบเรียลไทม์ไม่พร้อมใช้งาน', 'warning');
    }
  }

  // Check if message is from current user (simple heuristic)
  isCurrentUserMessage(message) {
    // Simple check: if message was created within last 5 seconds, assume it's from current user
    const messageTime = new Date(message.created_at).getTime();
    const now = Date.now();
    return (now - messageTime) < 5000;
  }

  // Set up event listeners
  setupEventListeners() {
    // Listen for send message events from UI
    document.addEventListener('sendMessage', async (event) => {
      await this.handleSendMessage(event.detail.text);
    });

    // Listen for refresh messages events from UI
    document.addEventListener('refreshMessages', async () => {
      await this.handleRefreshMessages();
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // Handle visibility change (when user switches tabs)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isInitialized) {
        // Refresh messages when user comes back to tab
        console.log('👁️ Page visible again, refreshing messages...');
        this.loadMessages();
      }
    });

    // Handle online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 Connection restored');
      this.ui.updateConnectionStatus(true);
      this.ui.showSuccess('เชื่อมต่ออินเทอร์เน็ตแล้ว!');
      if (this.isInitialized) {
        this.loadMessages();
      }
    });

    window.addEventListener('offline', () => {
      console.log('📵 Connection lost');
      this.ui.updateConnectionStatus(false);
      this.ui.showError('ขาดการเชื่อมต่ออินเทอร์เน็ต');
    });

    // Handle keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+R or F5 to refresh messages
      if ((e.ctrlKey && e.key === 'r') || e.key === 'F5') {
        e.preventDefault();
        this.handleRefreshMessages();
      }
      
      // Escape to clear input
      if (e.key === 'Escape') {
        this.ui.clearInput();
      }
    });
  }

  // Handle sending a new message
  async handleSendMessage(text) {
    if (!text || !text.trim()) {
      this.ui.showError('กรุณาพิมพ์ข้อความ');
      return;
    }

    if (!this.isInitialized) {
      this.ui.showError('กำลังเชื่อมต่อ กรุณารอสักครู่...');
      return;
    }

    try {
      console.log('📤 Sending message:', text.substring(0, 50) + '...');
      
      // Show sending state
      this.ui.showSending();
      
      // Insert message to Supabase
      const newMessage = await this.supabase.insertMessage(text);
      
      // Clear input and hide sending state
      this.ui.clearInput();
      this.ui.hideSending();
      
      // Add message to UI immediately (optimistic update)
      this.ui.addMessageToTop(newMessage);
      
      console.log('✅ Message sent successfully:', newMessage.id);
      this.ui.showSuccess('ส่งข้อความสำเร็จ! 🎉');
      
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      this.ui.hideSending();
      
      // Provide more specific error messages
      if (error.message.includes('network') || error.message.includes('fetch')) {
        this.ui.showError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
      } else if (error.message.includes('rate limit')) {
        this.ui.showError('ส่งข้อความเร็วเกินไป กรุณารอสักครู่แล้วลองใหม่');
      } else {
        this.ui.showError('ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง');
      }
    }
  }

  // Handle refresh messages
  async handleRefreshMessages() {
    if (!this.isInitialized) {
      this.ui.showError('กำลังเชื่อมต่อ กรุณารอสักครู่...');
      return;
    }

    try {
      console.log('🔄 Refreshing messages...');
      this.ui.showLoading();
      await this.loadMessages();
      this.ui.showSuccess('รีเฟรชข้อความแล้ว! 🔄');
    } catch (error) {
      console.error('❌ Failed to refresh messages:', error);
      this.ui.hideLoading();
      this.ui.showError('ไม่สามารถรีเฟรชข้อความได้');
    }
  }

  // Clean up resources
  cleanup() {
    console.log('🧹 Cleaning up resources...');
    if (this.supabase) {
      this.supabase.destroy();
    }
  }

  // Restart the app
  async restart() {
    console.log('🔄 Restarting app...');
    this.cleanup();
    this.isInitialized = false;
    this.retryCount = 0;
    await this.init();
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🌟 DOM loaded, starting Message App...');
  
  const app = new MessageApp();
  await app.init();
  
  // Make app globally available for debugging
  window.messageApp = app;
  
  // Add some helpful console messages
  console.log('💡 Tips:');
  console.log('- Use Ctrl+Enter to send messages quickly');
  console.log('- Use Ctrl+R to refresh messages');
  console.log('- Use Escape to clear input');
  console.log('- Access app instance via window.messageApp');
});

// Handle errors globally
window.addEventListener('error', (event) => {
  console.error('🚨 Global error:', event.error);
  // Don't show toast for every error to avoid spam
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled promise rejection:', event.reason);
  // Don't show toast for every rejection to avoid spam
});