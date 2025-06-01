/**
 * Popup script for Color Picker Pro Chrome Extension
 * Handles the popup interface and color management functionality
 * 
 * @author Color Picker Pro
 * @version 1.0
 */

class ColorPickerPro {
  constructor() {
    this.currentColor = '#667eea';
    this.colorHistory = [];
    this.colorListener = null;
  }

  /**
   * Initialize the extension and load any previously picked colors
   */
  init() {
    this.loadHistory();
    this.loadLastPickedColor();
    this.setupEventListeners();
    this.updateColorDisplay();
    this.generatePalettes();
  }

  /**
   * Set up event listeners for the popup interface
   */
  setupEventListeners() {
    document.getElementById('eyedropperBtn').addEventListener('click', (e) => {
      // Check for debug mode (Shift + Click)
      const debugMode = e.shiftKey;
      this.activateEyedropper(debugMode);
    });
    document.getElementById('manualBtn').addEventListener('click', () => this.showManualInput());
    document.getElementById('currentColor').addEventListener('click', () => this.copyToClipboard(this.currentColor));
    
    // Color value clicking
    document.querySelectorAll('.color-value').forEach(el => {
      el.addEventListener('click', () => this.copyToClipboard(el.textContent));
    });
  }

  /**
   * Activate the color picker eyedropper tool
   * @param {boolean} debugMode - Whether to bypass URL restrictions
   */
  async activateEyedropper(debugMode = false) {
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        console.error('No active tab found');
        this.showToast('No active tab found', 'error');
        return;
      }

      // Check if tab URL is accessible
      console.log('Tab URL:', tab.url);
      
      if (!debugMode && (tab.url.startsWith('chrome://') || 
          tab.url.startsWith('chrome-extension://') || 
          tab.url.startsWith('edge://') ||
          tab.url.startsWith('moz-extension://') ||
          (tab.url.startsWith('chrome-search://') || tab.url.includes('chrome/newtab')))) {
        console.error('Cannot access chrome:// or extension pages');
        this.showToast('Cannot pick colors from browser internal pages (Hold Shift + Click to bypass)', 'error');
        return;
      }

      if (debugMode) {
        console.log('Debug mode enabled - bypassing URL restrictions');
        this.showToast('Debug mode: URL restrictions bypassed', 'info');
      }

      // Special handling for file:// URLs
      if (tab.url.startsWith('file://')) {
        console.log('Detected local file, proceeding with color picking');
        this.showToast('Local file detected - color picking may have limited functionality', 'info');
      }
      
      console.log('Requesting color picking for tab:', tab.id);
      
      // Send message to background script to handle content script injection and communication
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'requestColorPicking',
          tabId: tab.id
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error sending message to background:', chrome.runtime.lastError);
            resolve({ error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { error: 'No response from background script' });
          }
        });
      });
      
      if (response.error) {
        console.error('Error from background script:', response.error);
        this.showToast(`Error: ${response.error}`, 'error');
        return;
      }
      
      if (response.success) {
        console.log('Color picking started successfully');
        this.showToast('Click on the page to pick a color!', 'success');
        
        // Listen for color updates from background script
        this.setupColorListener();
        
        // Close popup to allow interaction with page
        setTimeout(() => window.close(), 500); // Small delay to show success message
      } else {
        console.error('Failed to start color picking:', response);
        this.showToast('Failed to start color picker', 'error');
      }
      
    } catch (error) {
      console.error('Eyedropper error:', error);
      this.showToast('Error starting color picker', 'error');
    }
  }
  
  /**
   * Set up listener for color updates from background script
   */
  setupColorListener() {
    if (this.colorListener) {
      chrome.runtime.onMessage.removeListener(this.colorListener);
    }
    
    this.colorListener = (message, sender, sendResponse) => {
      if (message.action === 'colorUpdate') {
        this.setColor(message.color);
        sendResponse({ received: true });
      }
    };
    
    chrome.runtime.onMessage.addListener(this.colorListener);
  }
  
  /**
   * Load the last picked color from storage
   */
  loadLastPickedColor() {
    chrome.storage.local.get(['lastPickedColor'], (result) => {
      if (result.lastPickedColor) {
        this.setColor(result.lastPickedColor);
      }
    });
  }

  /**
   * Show manual color input dialog
   */
  showManualInput() {
    const color = prompt('Enter a color (hex, rgb, hsl):', this.currentColor);
    if (color && this.isValidColor(color)) {
      this.setColor(color);
    }
  }

  /**
   * Validate if a string is a valid color
   * @param {string} color - Color string to validate
   * @returns {boolean} True if valid color
   */
  isValidColor(color) {
    const div = document.createElement('div');
    div.style.color = color;
    return div.style.color !== '';
  }

  /**
   * Set the current color and update all displays
   * @param {string} color - Color to set (hex format)
   */
  setColor(color) {
    this.currentColor = color;
    this.addToHistory(color);
    this.updateColorDisplay();
    this.generatePalettes();
  }

  /**
   * Update the color display interface
   */
  updateColorDisplay() {
    const colorEl = document.getElementById('currentColor');
    colorEl.style.backgroundColor = this.currentColor;
    
    const rgb = this.hexToRgb(this.currentColor);
    if (!rgb) return;
    
    const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
    const hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);
    
    document.getElementById('hexValue').textContent = this.currentColor;
    document.getElementById('rgbValue').textContent = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    document.getElementById('hslValue').textContent = `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
    document.getElementById('hsvValue').textContent = `hsv(${Math.round(hsv.h)}, ${Math.round(hsv.s)}%, ${Math.round(hsv.v)}%)`;
  }

  /**
   * Generate and display color palettes
   */
  generatePalettes() {
    const container = document.getElementById('paletteContainer');
    container.innerHTML = '';
    
    const palettes = [
      { name: 'Complementary', colors: this.getComplementaryPalette() },
      { name: 'Analogous', colors: this.getAnalogousPalette() },
      { name: 'Triadic', colors: this.getTriadicPalette() },
      { name: 'Monochromatic', colors: this.getMonochromaticPalette() }
    ];
    
    palettes.forEach(palette => {
      const paletteDiv = document.createElement('div');
      paletteDiv.innerHTML = `
        <div class="palette-type">${palette.name}</div>
        <div class="palette-grid" data-palette="${palette.name}">
          ${palette.colors.map((color, index) => 
            `<div class="palette-color" style="background-color: ${color}" data-color="${color}" title="${color}"></div>`
          ).join('')}
        </div>
      `;
      container.appendChild(paletteDiv);
      
      // Add click listeners to palette colors
      const paletteGrid = paletteDiv.querySelector('.palette-grid');
      paletteGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('palette-color')) {
          const color = e.target.getAttribute('data-color');
          this.setColor(color);
        }
      });
    });
  }

  /**
   * Generate complementary color palette
   * @returns {string[]} Array of hex color strings
   */
  getComplementaryPalette() {
    const hsl = this.getCurrentHsl();
    return [
      this.currentColor,
      this.hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l),
      this.hslToHex((hsl.h + 150) % 360, hsl.s * 0.8, hsl.l * 1.1),
      this.hslToHex((hsl.h + 210) % 360, hsl.s * 0.8, hsl.l * 0.9),
      this.hslToHex((hsl.h + 180) % 360, hsl.s * 0.6, hsl.l * 1.2)
    ];
  }

  /**
   * Generate analogous color palette
   * @returns {string[]} Array of hex color strings
   */
  getAnalogousPalette() {
    const hsl = this.getCurrentHsl();
    return [
      this.hslToHex((hsl.h - 30) % 360, hsl.s, hsl.l),
      this.hslToHex((hsl.h - 15) % 360, hsl.s, hsl.l),
      this.currentColor,
      this.hslToHex((hsl.h + 15) % 360, hsl.s, hsl.l),
      this.hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l)
    ];
  }

  /**
   * Generate triadic color palette
   * @returns {string[]} Array of hex color strings
   */
  getTriadicPalette() {
    const hsl = this.getCurrentHsl();
    return [
      this.currentColor,
      this.hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l),
      this.hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l),
      this.hslToHex((hsl.h + 120) % 360, hsl.s * 0.7, hsl.l * 1.1),
      this.hslToHex((hsl.h + 240) % 360, hsl.s * 0.7, hsl.l * 0.9)
    ];
  }

  /**
   * Generate monochromatic color palette
   * @returns {string[]} Array of hex color strings
   */
  getMonochromaticPalette() {
    const hsl = this.getCurrentHsl();
    return [
      this.hslToHex(hsl.h, hsl.s, Math.max(hsl.l * 0.3, 10)),
      this.hslToHex(hsl.h, hsl.s, Math.max(hsl.l * 0.6, 20)),
      this.currentColor,
      this.hslToHex(hsl.h, hsl.s, Math.min(hsl.l * 1.3, 90)),
      this.hslToHex(hsl.h, hsl.s, Math.min(hsl.l * 1.6, 95))
    ];
  }

  /**
   * Get current color in HSL format
   * @returns {Object} HSL color object
   */
  getCurrentHsl() {
    const rgb = this.hexToRgb(this.currentColor);
    return this.rgbToHsl(rgb.r, rgb.g, rgb.b);
  }

  /**
   * Add color to history
   * @param {string} color - Color to add to history
   */
  addToHistory(color) {
    if (!this.colorHistory.includes(color)) {
      this.colorHistory.unshift(color);
      if (this.colorHistory.length > 10) {
        this.colorHistory.pop();
      }
      this.saveHistory();
      this.updateHistoryDisplay();
    }
  }

  /**
   * Update the history display
   */
  updateHistoryDisplay() {
    const container = document.getElementById('historyColors');
    container.innerHTML = this.colorHistory.map(color => 
      `<div class="history-color" style="background-color: ${color}" data-color="${color}" title="${color}"></div>`
    ).join('');
    
    // Add click listeners to history colors
    container.addEventListener('click', (e) => {
      if (e.target.classList.contains('history-color')) {
        const color = e.target.getAttribute('data-color');
        this.setColor(color);
      }
    });
  }

  /**
   * Copy text to clipboard
   * @param {string} text - Text to copy
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast(`Copied: ${text}`, 'success');
    } catch (err) {
      console.error('Copy failed:', err);
      this.showToast('Copy failed', 'error');
    }
  }

  /**
   * Show toast notification
   * @param {string} message - Message to display
   * @param {string} type - Type of message ('error', 'success', 'info')
   */
  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('success', 'error', 'info');
    toast.classList.add('show', type);
    setTimeout(() => {
      toast.classList.remove('show', type);
    }, type === 'error' ? 4000 : 2000); // Show errors longer
  }

  /**
   * Save color history to storage
   */
  saveHistory() {
    chrome.storage.local.set({ colorHistory: this.colorHistory });
  }

  /**
   * Load color history from storage
   */
  loadHistory() {
    chrome.storage.local.get(['colorHistory'], (result) => {
      if (result.colorHistory) {
        this.colorHistory = result.colorHistory;
        this.updateHistoryDisplay();
      }
    });
  }

  // Color conversion utilities

  /**
   * Convert hex color to RGB
   * @param {string} hex - Hex color string
   * @returns {Object|null} RGB color object or null if invalid
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Convert RGB to HSL
   * @param {number} r - Red component (0-255)
   * @param {number} g - Green component (0-255)
   * @param {number} b - Blue component (0-255)
   * @returns {Object} HSL color object
   */
  rgbToHsl(r, g, b) {
    r /= 255; 
    g /= 255; 
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    return { 
      h: h * 360, 
      s: s * 100, 
      l: l * 100 
    };
  }

  /**
   * Convert RGB to HSV
   * @param {number} r - Red component (0-255)
   * @param {number} g - Green component (0-255)
   * @param {number} b - Blue component (0-255)
   * @returns {Object} HSV color object
   */
  rgbToHsv(r, g, b) {
    r /= 255; 
    g /= 255; 
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, v = max;
    
    const d = max - min;
    s = max === 0 ? 0 : d / max;

    if (max === min) {
      h = 0; // achromatic
    } else {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    return { 
      h: h * 360, 
      s: s * 100, 
      v: v * 100 
    };
  }

  /**
   * Convert HSL to hex color
   * @param {number} h - Hue (0-360)
   * @param {number} s - Saturation (0-100)
   * @param {number} l - Lightness (0-100)
   * @returns {string} Hex color string
   */
  hslToHex(h, s, l) {
    h = Math.max(0, Math.min(360, h)) / 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;
    
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h * 12) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    
    return `#${f(0)}${f(8)}${f(4)}`;
  }
}

// Initialize the color picker when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const colorPicker = new ColorPickerPro();
  colorPicker.init();
  
  // Make it globally accessible for debugging
  window.colorPicker = colorPicker;
}); 