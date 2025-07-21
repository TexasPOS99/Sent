import { appConfig } from './config.js';

class UIManager {
  constructor() {
    this.elements = {
      messageInput: document.getElementById('messageInput'),
      sendButton: document.getElementById('sendButton'),
      messagesList: document.getElementById('messagesList'),
      loadingIndicator: document.getElementById('loadingIndicator'),
      emptyState: document.getElementById('emptyState'),
      toast: document.getElementById('toast')
    };
    
    this.isLoading = false;
    this.isSending = false;
    
    this.initializeEventListeners();
  }

  // Initialize event listeners
  initializeEventListeners() {
    // Send button click
    this.elements.sendButton.addEventListener('click', () => {
      this.handleSendMessage();
    });

    // Enter key in textarea (Ctrl+Enter to send)
    this.elements.messageInput.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        this.handleSendMessage();
      }
    });

    // Auto-resize textarea
    this.elements.messageInput.addEventListener('input', () => {
      this.autoResizeTextarea();
    });
  }

  // Handle send message event
  handleSendMessage() {
    const text = this.elements.messageInput.value.trim();
    
    if (!text) {
      this.showToast('กรุณาพิมพ์ข้อความ', 'error');
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

  // Auto-resize textarea based on content
  autoResizeTextarea() {
    const textarea = this.elements.messageInput;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
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
    this.elements.sendButton.querySelector('.button-text').textContent = 'กำลังส่ง...';
    this.elements.sendButton.querySelector('.loading-spinner').classList.remove('hidden');
  }

  // Hide sending state
  hideSending() {
    this.isSending = false;
    this.elements.sendButton.disabled = false;
    this.elements.sendButton.querySelector('.button-text').textContent = 'ส่งข้อความ';
    this.elements.sendButton.querySelector('.loading-spinner').classList.add('hidden');
  }

  // Clear message input
  clearInput() {
    this.elements.messageInput.value = '';
    this.autoResizeTextarea();
    this.elements.messageInput.focus();
  }

  // Render messages list
  renderMessages(messages) {
    this.hideLoading();
    
    if (!messages || messages.length === 0) {
      this.elements.messagesList.innerHTML = '';
      this.elements.emptyState.classList.remove('hidden');
      return;
    }

    this.elements.emptyState.classList.add('hidden');
    
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
  }

  // Create HTML for a single message
  createMessageHTML(message) {
    const formattedTime = this.formatTime(message.created_at);
    const messageText = this.escapeHtml(message.text);
    
    return `
      <div class="message-item" data-id="${message.id}">
        <div class="message-header">
          <span class="message-time">${formattedTime}</span>
          <button class="copy-button" data-text="${this.escapeHtml(message.text)}">
            📋 คัดลอก
          </button>
        </div>
        <div class="message-text">${messageText}</div>
      </div>
    `;
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
        this.showToast('คัดลอกแล้ว!');
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
      this.showToast('คัดลอกแล้ว!');
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
    if (type === 'error') {
      toastIcon.textContent = '❌';
      toast.style.background = '#ef4444';
    } else {
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

  // Get current input value
  getInputValue() {
    return this.elements.messageInput.value.trim();
  }
}

export default UIManager;