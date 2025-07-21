import { appConfig } from './config.js';

class UIManager {
  constructor() {
    this.elements = {
      messageInput: document.getElementById('messageInput'),
      sendButton: document.getElementById('sendButton'),
      clearButton: document.getElementById('clearButton'),
      refreshButton: document.getElementById('refreshButton'),
      messagesList: document.getElementById('messagesList'),
      loadingIndicator: document.getElementById('loadingIndicator'),
      emptyState: document.getElementById('emptyState'),
      toast: document.getElementById('toast'),
      charCount: document.getElementById('charCount'),
      maxChars: document.getElementById('maxChars'),
      messageCount: document.getElementById('messageCount'),
      connectionStatus: document.getElementById('connectionStatus')
    };
    
    this.isLoading = false;
    this.isSending = false;
    this.messageCount = 0;
    
    this.initializeEventListeners();
    this.initializeUI();
  }

  // Initialize UI elements
  initializeUI() {
    this.elements.maxChars.textContent = appConfig.maxMessageLength;
    this.updateCharacterCount();
  }

  // Initialize event listeners
  initializeEventListeners() {
    // Send button click
    this.elements.sendButton.addEventListener('click', () => {
      this.handleSendMessage();
    });

    // Clear button click
    this.elements.clearButton.addEventListener('click', () => {
      this.clearInput();
    });

    // Refresh button click
    this.elements.refreshButton.addEventListener('click', () => {
      const event = new CustomEvent('refreshMessages');
      document.dispatchEvent(event);
    });

    // Enter key in textarea (Ctrl+Enter to send)
    this.elements.messageInput.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        this.handleSendMessage();
      }
    });

    // Auto-resize textarea and update character count
    this.elements.messageInput.addEventListener('input', () => {
      this.autoResizeTextarea();
      this.updateCharacterCount();
    });

    // Focus input on page load
    window.addEventListener('load', () => {
      this.elements.messageInput.focus();
    });
  }

  // Handle send message event
  handleSendMessage() {
    const text = this.elements.messageInput.value.trim();
    
    if (!text) {
      this.showToast('กรุณาพิมพ์ข้อความ', 'error');
      this.elements.messageInput.focus();
      return;
    }

    if (text.length > appConfig.maxMessageLength) {
      this.showToast(`ข้อความยาวเกินไป (สูงสุด ${appConfig.maxMessageLength} ตัวอักษร)`, 'error');
      return;
    }

    // Dispatch custom event
    const event = new CustomEvent('sendMessage', { detail: { text } });
    document.dispatchEvent(event);
  }

  // Update character count
  updateCharacterCount() {
    const currentLength = this.elements.messageInput.value.length;
    this.elements.charCount.textContent = currentLength;
    
    // Change color based on character count
    const percentage = currentLength / appConfig.maxMessageLength;
    if (percentage > 0.9) {
      this.elements.charCount.style.color = '#ef4444';
    } else if (percentage > 0.7) {
      this.elements.charCount.style.color = '#f59e0b';
    } else {
      this.elements.charCount.style.color = '#718096';
    }
  }

  // Auto-resize textarea based on content
  autoResizeTextarea() {
    const textarea = this.elements.messageInput;
    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 140), 300);
    textarea.style.height = newHeight + 'px';
  }

  // Show loading state
  showLoading() {
    this.isLoading = true;
    this.elements.loadingIndicator.classList.remove('hidden');
    this.elements.emptyState.classList.add('hidden');
  }

  // Hide loading state
  hideLoading() {
    this.isLoading = false;
    this.elements.loadingIndicator.classList.add('hidden');
  }

  // Show sending state
  showSending() {
    this.isSending = true;
    this.elements.sendButton.disabled = true;
    this.elements.sendButton.querySelector('.button-text').textContent = '📤 กำลังส่ง...';
    this.elements.sendButton.querySelector('.loading-spinner').classList.remove('hidden');
    this.elements.clearButton.disabled = true;
  }

  // Hide sending state
  hideSending() {
    this.isSending = false;
    this.elements.sendButton.disabled = false;
    this.elements.sendButton.querySelector('.button-text').textContent = '📤 ส่งข้อความ';
    this.elements.sendButton.querySelector('.loading-spinner').classList.add('hidden');
    this.elements.clearButton.disabled = false;
  }

  // Clear message input
  clearInput() {
    this.elements.messageInput.value = '';
    this.autoResizeTextarea();
    this.updateCharacterCount();
    this.elements.messageInput.focus();
    this.showToast('ล้างข้อความแล้ว', 'info');
  }

  // Update message count
  updateMessageCount(count) {
    this.messageCount = count;
    this.elements.messageCount.querySelector('.stat-number').textContent = count.toLocaleString('th-TH');
  }

  // Update connection status
  updateConnectionStatus(isConnected) {
    const statusIndicator = this.elements.connectionStatus.querySelector('.status-indicator');
    const statusText = this.elements.connectionStatus.querySelector('.status-text');
    
    if (isConnected) {
      statusIndicator.classList.remove('disconnected');
      statusText.textContent = 'เชื่อมต่อแล้ว';
    } else {
      statusIndicator.classList.add('disconnected');
      statusText.textContent = 'ขาดการเชื่อมต่อ';
    }
  }

  // Render messages list
  renderMessages(messages) {
    this.hideLoading();
    
    if (!messages || messages.length === 0) {
      this.elements.messagesList.innerHTML = '';
      this.elements.emptyState.classList.remove('hidden');
      this.updateMessageCount(0);
      return;
    }

    this.elements.emptyState.classList.add('hidden');
    this.updateMessageCount(messages.length);
    
    const messagesHTML = messages.map(message => this.createMessageHTML(message)).join('');
    this.elements.messagesList.innerHTML = messagesHTML;
    
    // Add event listeners to copy buttons
    this.attachCopyButtonListeners();
  }

  // Add a single message to the top of the list
  addMessageToTop(message) {
    this.elements.emptyState.classList.add('hidden');
    
    const messageHTML = this.createMessageHTML(message);
    this.elements.messagesList.insertAdjacentHTML('afterbegin', messageHTML);
    
    // Add event listener to the new copy button
    const newMessageElement = this.elements.messagesList.firstElementChild;
    const copyButton = newMessageElement.querySelector('.copy-button');
    this.attachCopyButtonListener(copyButton, message.text);
    
    // Update message count
    this.messageCount++;
    this.updateMessageCount(this.messageCount);
  }

  // Create HTML for a single message
  createMessageHTML(message) {
    const formattedTime = this.formatTime(message.created_at);
    const messageText = this.escapeHtml(message.text);
    const isUrl = this.isValidUrl(message.text);
    
    return `
      <div class="message-item" data-id="${message.id}">
        <div class="message-header">
          <span class="message-time">${formattedTime}</span>
          <button class="copy-button" data-text="${this.escapeHtml(message.text)}">
            📋 คัดลอก
          </button>
        </div>
        <div class="message-text">${isUrl ? this.linkifyText(messageText) : messageText}</div>
      </div>
    `;
  }

  // Check if text is a valid URL
  isValidUrl(text) {
    try {
      const url = new URL(text.trim());
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // Convert URLs to clickable links
  linkifyText(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #667eea; text-decoration: underline;">$1</a>');
  }

  // Attach event listeners to all copy buttons
  attachCopyButtonListeners() {
    const copyButtons = this.elements.messagesList.querySelectorAll('.copy-button');
    copyButtons.forEach(button => {
      const text = button.getAttribute('data-text');
      this.attachCopyButtonListener(button, text);
    });
  }

  // Attach event listener to a single copy button
  attachCopyButtonListener(button, text) {
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(text);
        this.showToast('คัดลอกแล้ว! 📋');
        
        // Visual feedback
        const originalText = button.textContent;
        button.textContent = '✅ คัดลอกแล้ว';
        button.style.background = '#10b981';
        
        setTimeout(() => {
          button.textContent = originalText;
          button.style.background = '#667eea';
        }, 1500);
        
      } catch (error) {
        console.error('Failed to copy text:', error);
        // Fallback for older browsers
        this.fallbackCopyText(text);
      }
    });
  }

  // Fallback copy method for older browsers
  fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      this.showToast('คัดลอกแล้ว! 📋');
    } catch (error) {
      console.error('Fallback copy failed:', error);
      this.showToast('ไม่สามารถคัดลอกได้', 'error');
    } finally {
      document.body.removeChild(textArea);
    }
  }

  // Show toast notification
  showToast(message, type = 'success') {
    const toast = this.elements.toast;
    const toastMessage = toast.querySelector('.toast-message');
    const toastIcon = toast.querySelector('.toast-icon');
    
    // Set message and icon based on type
    toastMessage.textContent = message;
    
    switch (type) {
      case 'error':
        toastIcon.textContent = '❌';
        toast.style.background = '#ef4444';
        break;
      case 'warning':
        toastIcon.textContent = '⚠️';
        toast.style.background = '#f59e0b';
        break;
      case 'info':
        toastIcon.textContent = 'ℹ️';
        toast.style.background = '#3b82f6';
        break;
      default:
        toastIcon.textContent = '✅';
        toast.style.background = '#10b981';
    }
    
    // Show toast
    toast.classList.remove('hidden');
    
    // Hide after duration
    setTimeout(() => {
      toast.classList.add('hidden');
    }, appConfig.toastDuration);
  }

  // Format timestamp to Thai locale
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'เมื่อสักครู่';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} นาทีที่แล้ว`;
    } else if (diffInMinutes < 1440) { // Less than 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} ชั่วโมงที่แล้ว`;
    } else if (diffInMinutes < 10080) { // Less than 7 days
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} วันที่แล้ว`;
    } else {
      // Show full date for older messages
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  // Escape HTML to prevent XSS
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Show error message
  showError(message) {
    this.showToast(message, 'error');
  }

  // Show success message
  showSuccess(message) {
    this.showToast(message, 'success');
  }

  // Get current input value
  getInputValue() {
    return this.elements.messageInput.value.trim();
  }

  // Set input value
  setInputValue(value) {
    this.elements.messageInput.value = value;
    this.autoResizeTextarea();
    this.updateCharacterCount();
  }

  // Focus input
  focusInput() {
    this.elements.messageInput.focus();
  }
}

export default UIManager;