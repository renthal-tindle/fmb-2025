/**
 * Motorcycle Parts Finder App Block JavaScript
 * Handles widget initialization and cart integration
 */

class MotorcyclePartsFinderBlock {
  constructor(blockId, config) {
    this.blockId = blockId;
    this.config = config;
    this.container = document.getElementById(`motorcycle-widget-${blockId}`);
    this.iframe = null;
    this.init();
  }

  init() {
    if (!this.container) {
      console.warn('Motorcycle Parts Finder: Container not found for block', this.blockId);
      return;
    }

    this.createWidget();
    this.setupEventListeners();
  }

  createWidget() {
    // Create iframe for the motorcycle parts widget
    this.iframe = document.createElement('iframe');
    
    const params = new URLSearchParams({
      compact: this.config.compact || false,
      maxResults: this.config.maxResults || 12,
      theme: this.config.theme || 'light',
      shopDomain: this.config.shopDomain || window.Shopify?.shop || ''
    });

    this.iframe.src = `${this.config.apiBaseUrl}/shopify-widget?${params.toString()}`;
    this.iframe.style.width = '100%';
    this.iframe.style.height = this.config.compact ? '400px' : '600px';
    this.iframe.style.border = 'none';
    this.iframe.style.borderRadius = '8px';
    this.iframe.setAttribute('loading', 'lazy');
    this.iframe.setAttribute('title', 'Motorcycle Parts Finder');
    this.iframe.setAttribute('allow', 'clipboard-write');

    // Handle iframe loading
    this.iframe.onload = () => {
      this.container.innerHTML = '';
      this.container.appendChild(this.iframe);
      this.onWidgetReady();
    };

    this.iframe.onerror = () => {
      this.showError('Unable to load motorcycle parts finder. Please try again later.');
    };

    // Start loading
    this.container.appendChild(this.iframe);
  }

  setupEventListeners() {
    // Listen for messages from the widget iframe
    window.addEventListener('message', (event) => {
      if (event.origin !== this.config.apiBaseUrl) return;
      
      this.handleWidgetMessage(event.data);
    });

    // Handle visibility changes for performance
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              this.onWidgetVisible();
            } else {
              this.onWidgetHidden();
            }
          });
        },
        { threshold: 0.1 }
      );

      observer.observe(this.container);
    }
  }

  handleWidgetMessage(data) {
    switch (data.type) {
      case 'motorcycle-widget-ready':
        console.log('Motorcycle widget ready for block', this.blockId);
        this.dispatchEvent('motorcycle-widget:ready', data);
        break;
        
      case 'cart-item-added':
        this.handleCartItemAdded(data.data);
        break;
        
      case 'widget-resize':
        this.handleWidgetResize(data.height);
        break;
        
      case 'motorcycle-selected':
        this.dispatchEvent('motorcycle-widget:motorcycle-selected', data.data);
        break;
        
      case 'parts-loaded':
        this.dispatchEvent('motorcycle-widget:parts-loaded', data.data);
        break;
    }
  }

  handleCartItemAdded(data) {
    console.log('Cart item added:', data);

    // Try different Shopify cart refresh methods
    const refreshMethods = [
      // Standard Shopify theme cart refresh
      () => {
        if (window.Shopify?.onItemAdded) {
          window.Shopify.onItemAdded(data);
          return true;
        }
        return false;
      },
      
      // Theme-specific cart drawer refresh
      () => {
        if (window.theme?.cartDrawer?.refresh) {
          window.theme.cartDrawer.refresh();
          return true;
        }
        return false;
      },
      
      // Shopify AJAX cart refresh
      () => {
        if (window.CartJS?.getCart) {
          window.CartJS.getCart();
          return true;
        }
        return false;
      },
      
      // Custom cart refresh event
      () => {
        this.dispatchEvent('cart:refresh');
        return true;
      }
    ];

    // Try each method until one works
    for (const method of refreshMethods) {
      try {
        if (method()) {
          break;
        }
      } catch (error) {
        console.warn('Cart refresh method failed:', error);
      }
    }

    // Always dispatch the cart item added event
    this.dispatchEvent('cart:item-added', data);
    
    // Show success notification if available
    this.showNotification('Product added to cart!', 'success');
  }

  handleWidgetResize(height) {
    if (this.iframe && height) {
      this.iframe.style.height = height + 'px';
    }
  }

  onWidgetReady() {
    this.dispatchEvent('motorcycle-widget:initialized', {
      blockId: this.blockId,
      config: this.config
    });
  }

  onWidgetVisible() {
    // Send message to iframe that widget is visible
    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage(
        { type: 'widget-visible' },
        this.config.apiBaseUrl
      );
    }
  }

  onWidgetHidden() {
    // Send message to iframe that widget is hidden
    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage(
        { type: 'widget-hidden' },
        this.config.apiBaseUrl
      );
    }
  }

  showError(message) {
    this.container.innerHTML = `
      <div class="motorcycle-widget-error">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <p>${message}</p>
        <button onclick="this.closest('.motorcycle-parts-finder-block').querySelector('script').dispatchEvent(new CustomEvent('retry'))">
          Try Again
        </button>
      </div>
    `;
  }

  showNotification(message, type = 'info') {
    // Try to show notification using theme's notification system
    if (window.theme?.notification?.show) {
      window.theme.notification.show(message, type);
      return;
    }

    // Fallback to custom notification
    const notification = document.createElement('div');
    notification.className = `motorcycle-notification motorcycle-notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : '#3b82f6'};
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      z-index: 9999;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in forwards';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  dispatchEvent(eventName, data = {}) {
    const event = new CustomEvent(eventName, {
      detail: { blockId: this.blockId, ...data },
      bubbles: true
    });
    
    document.dispatchEvent(event);
  }

  destroy() {
    if (this.iframe) {
      this.iframe.remove();
    }
    this.container = null;
    this.iframe = null;
  }
}

// Global initialization function
window.initMotorcyclePartsFinderBlock = function(blockId, config) {
  return new MotorcyclePartsFinderBlock(blockId, config);
};

// Auto-initialize blocks when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Find all motorcycle parts finder blocks
  const blocks = document.querySelectorAll('[id^="motorcycle-parts-finder-"]');
  
  blocks.forEach(block => {
    const blockId = block.id.replace('motorcycle-parts-finder-', '');
    const widgetContainer = block.querySelector(`#motorcycle-widget-${blockId}`);
    
    if (widgetContainer) {
      // Extract configuration from data attributes or defaults
      const config = {
        apiBaseUrl: block.dataset.apiBaseUrl || 'https://your-app-domain.replit.app',
        compact: block.dataset.compact === 'true',
        maxResults: parseInt(block.dataset.maxResults) || 12,
        theme: block.dataset.theme || 'light',
        shopDomain: window.Shopify?.shop || ''
      };
      
      // Initialize the block
      window.initMotorcyclePartsFinderBlock(blockId, config);
    }
  });
});

// CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideOut {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }
`;
document.head.appendChild(notificationStyles);