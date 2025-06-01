/**
 * Content script for Color Picker Pro - Enhanced color picking functionality
 * Follows SOLID principles and OWASP security recommendations
 * 
 * @author Color Picker Pro
 * @version 1.0
 */
class ColorPickerContent {
  constructor() {
    // Initialize state variables
    this.isActive = false;
    this.overlay = null;
    this.crosshair = null;
    this.colorPreview = null;
    this.magnifier = null;
    this.canvas = null;
    this.ctx = null;
    this.currentColor = '#000000';
    this.screenImageData = null;
    this.imageCanvas = null;
    this.imageCtx = null;
    
    // Bind methods to preserve context
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.preventDefault = this.preventDefault.bind(this);
    
    this.setupMessageListener();
  }

  /**
   * Set up message listener for communication with popup and background script
   * Follows single responsibility principle
   */
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        switch (request.action) {
          case 'startPicking':
            this.startColorPicking();
            sendResponse({ status: 'started' });
            break;
          case 'stopPicking':
            this.cancelPicking();
            sendResponse({ status: 'stopped' });
            break;
          default:
            sendResponse({ status: 'unknown_action' });
        }
      } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ status: 'error', error: error.message });
      }
      return true;
    });
  }

  /**
   * Start the color picking process
   * Main entry point for color picking functionality
   */
  async startColorPicking() {
    if (this.isActive) {
      console.log('Color picking already active');
      return;
    }
    
    try {
      this.isActive = true;
      await this.captureScreen();
      await this.createPickingInterface();
      this.attachEventListeners();
      
      console.log('Color picking started successfully');
    } catch (error) {
      console.error('Failed to start color picking:', error);
      this.cleanup();
    }
  }

  /**
   * Capture the screen for precise color picking
   * Uses chrome.tabs.captureVisibleTab API through background script
   */
  async captureScreen() {
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: 'captureScreen' },
          resolve
        );
      });

      if (response.success && response.dataUrl) {
        await this.loadScreenImage(response.dataUrl);
        console.log('Screen captured successfully');
      } else {
        console.warn('Screen capture failed, using fallback method');
        this.setupFallbackColorPicking();
      }
    } catch (error) {
      console.error('Screen capture error:', error);
      this.setupFallbackColorPicking();
    }
  }

  /**
   * Load the captured screen image into a canvas for pixel analysis
   * @param {string} dataUrl - Base64 encoded image data
   */
  async loadScreenImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          // Create canvas for image analysis
          this.imageCanvas = document.createElement('canvas');
          this.imageCanvas.width = window.innerWidth;
          this.imageCanvas.height = window.innerHeight;
          this.imageCtx = this.imageCanvas.getContext('2d');
          
          // Draw the captured image
          this.imageCtx.drawImage(img, 0, 0, window.innerWidth, window.innerHeight);
          
          // Get image data for pixel access
          this.screenImageData = this.imageCtx.getImageData(
            0, 0, window.innerWidth, window.innerHeight
          );
          
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load captured image'));
      };
      
      img.src = dataUrl;
    });
  }

  /**
   * Setup fallback color picking when screen capture is not available
   * Uses element inspection as backup method
   */
  setupFallbackColorPicking() {
    this.fallbackMode = true;
    console.log('Using fallback color picking mode');
  }

  /**
   * Create the visual interface for color picking
   * Follows separation of concerns principle
   */
  async createPickingInterface() {
    // Create main overlay container
    this.overlay = this.createElement('div', 'color-picker-overlay');
    document.body.appendChild(this.overlay);

    // Create crosshair cursor
    this.crosshair = this.createElement('div', 'color-picker-crosshair');
    this.overlay.appendChild(this.crosshair);

    // Create color preview panel
    this.colorPreview = this.createElement('div', 'color-picker-preview');
    this.colorPreview.innerHTML = this.getPreviewHTML();
    this.overlay.appendChild(this.colorPreview);

    // Create magnifier
    this.magnifier = this.createElement('div', 'color-picker-magnifier');
    this.overlay.appendChild(this.magnifier);

    // Create magnifier canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = 120;
    this.canvas.height = 120;
    this.ctx = this.canvas.getContext('2d');
    this.magnifier.appendChild(this.canvas);

    // Add instructions
    this.addInstructions();
  }

  /**
   * Helper method to create DOM elements safely
   * @param {string} tag - HTML tag name
   * @param {string} className - CSS class name
   * @returns {HTMLElement} Created element
   */
  createElement(tag, className) {
    const element = document.createElement(tag);
    element.className = className;
    return element;
  }

  /**
   * Get HTML for color preview panel
   * @returns {string} HTML string
   */
  getPreviewHTML() {
    return `
      <div class="preview-color"></div>
      <div class="preview-text">
        <div class="preview-hex">#000000</div>
        <div class="preview-rgb">rgb(0, 0, 0)</div>
        <div class="preview-position">Position: 0, 0</div>
      </div>
    `;
  }

  /**
   * Add picking instructions to the interface
   */
  addInstructions() {
    const instructions = this.createElement('div', 'color-picker-instructions');
    instructions.innerHTML = `
      <div class="instructions-content">
        <p><strong>Click</strong> to pick color</p>
        <p><strong>ESC</strong> to cancel</p>
        <p><strong>Space/Enter</strong> to confirm</p>
      </div>
    `;
    this.overlay.appendChild(instructions);
  }

  /**
   * Attach event listeners for color picking interaction
   * Follows single responsibility principle
   */
  attachEventListeners() {
    // Mouse and keyboard events
    document.addEventListener('mousemove', this.handleMouseMove, true);
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('keydown', this.handleKeyPress, true);
    
    // Prevent default behaviors during picking
    document.addEventListener('contextmenu', this.preventDefault, true);
    document.addEventListener('selectstart', this.preventDefault, true);
    document.addEventListener('dragstart', this.preventDefault, true);
  }

  /**
   * Handle mouse movement during color picking
   * @param {MouseEvent} e - Mouse event object
   */
  handleMouseMove(e) {
    if (!this.isActive) return;
    
    // Prevent default behavior
    e.preventDefault();
    e.stopPropagation();

    const x = e.clientX;
    const y = e.clientY;

    // Update interface positions
    this.updateCrosshair(x, y);
    this.updateColorPreview(x, y);
    this.updateMagnifier(x, y);

    // Get and display color at cursor position
    const color = this.getColorAtPosition(x, y);
    this.displayColorInfo(color, x, y);
    this.renderMagnifiedView(x, y);
  }

  /**
   * Update crosshair position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  updateCrosshair(x, y) {
    this.crosshair.style.left = x + 'px';
    this.crosshair.style.top = y + 'px';
  }

  /**
   * Update color preview panel position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  updateColorPreview(x, y) {
    const offsetX = (x > window.innerWidth / 2) ? -160 : 20;
    const offsetY = (y > window.innerHeight / 2) ? -80 : 20;
    
    this.colorPreview.style.left = (x + offsetX) + 'px';
    this.colorPreview.style.top = (y + offsetY) + 'px';
  }

  /**
   * Update magnifier position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  updateMagnifier(x, y) {
    const offsetX = (x > window.innerWidth / 2) ? -140 : 20;
    const offsetY = (y < window.innerHeight / 2) ? 20 : -140;
    
    this.magnifier.style.left = (x + offsetX) + 'px';
    this.magnifier.style.top = (y + offsetY) + 'px';
  }

  /**
   * Get color at specific screen position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Object} RGB color object
   */
  getColorAtPosition(x, y) {
    // Use screen capture data if available
    if (this.screenImageData && !this.fallbackMode) {
      return this.getPixelFromImageData(x, y);
    }
    
    // Fallback to element inspection
    return this.getColorFromElement(x, y);
  }

  /**
   * Get pixel color from captured image data
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Object} RGB color object
   */
  getPixelFromImageData(x, y) {
    try {
      const width = this.screenImageData.width;
      const index = (y * width + x) * 4;
      const data = this.screenImageData.data;
      
      return {
        r: data[index] || 0,
        g: data[index + 1] || 0,
        b: data[index + 2] || 0
      };
    } catch (error) {
      console.error('Error reading pixel data:', error);
      return { r: 128, g: 128, b: 128 };
    }
  }

  /**
   * Get color from DOM element (fallback method)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Object} RGB color object
   */
  getColorFromElement(x, y) {
    try {
      // Temporarily hide overlay to get element underneath
      this.overlay.style.display = 'none';
      const element = document.elementFromPoint(x, y);
      this.overlay.style.display = 'block';
      
      if (element) {
        const computedStyle = window.getComputedStyle(element);
        const bgColor = computedStyle.backgroundColor;
        
        // Parse background color
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
          return this.parseRgbString(bgColor);
        }
        
        // Fallback to text color
        const textColor = computedStyle.color;
        if (textColor) {
          return this.parseRgbString(textColor);
        }
      }
      
      return { r: 255, g: 255, b: 255 }; // Default white
    } catch (error) {
      console.error('Error getting color from element:', error);
      return { r: 128, g: 128, b: 128 }; // Default gray
    }
  }

  /**
   * Parse RGB color string to color object
   * @param {string} colorStr - RGB color string
   * @returns {Object} RGB color object
   */
  parseRgbString(colorStr) {
    const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10)
      };
    }
    return { r: 128, g: 128, b: 128 };
  }

  /**
   * Display color information in the preview panel
   * @param {Object} color - RGB color object
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  displayColorInfo(color, x, y) {
    const hex = this.rgbToHex(color.r, color.g, color.b);
    const rgb = `rgb(${color.r}, ${color.g}, ${color.b})`;
    
    // Update preview panel
    const previewColor = this.colorPreview.querySelector('.preview-color');
    const previewHex = this.colorPreview.querySelector('.preview-hex');
    const previewRgb = this.colorPreview.querySelector('.preview-rgb');
    const previewPosition = this.colorPreview.querySelector('.preview-position');
    
    if (previewColor) previewColor.style.backgroundColor = hex;
    if (previewHex) previewHex.textContent = hex;
    if (previewRgb) previewRgb.textContent = rgb;
    if (previewPosition) previewPosition.textContent = `Position: ${x}, ${y}`;
    
    this.currentColor = hex;
  }

  /**
   * Render magnified view of the area around cursor
   * @param {number} centerX - Center X coordinate
   * @param {number} centerY - Center Y coordinate
   */
  renderMagnifiedView(centerX, centerY) {
    const gridSize = 8;
    const gridCount = 15;
    const centerIndex = Math.floor(gridCount / 2);
    
    // Clear canvas
    this.ctx.clearRect(0, 0, 120, 120);
    
    // Draw magnified pixels
    for (let i = 0; i < gridCount; i++) {
      for (let j = 0; j < gridCount; j++) {
        const pixelX = centerX + (i - centerIndex);
        const pixelY = centerY + (j - centerIndex);
        
        if (pixelX >= 0 && pixelX < window.innerWidth && 
            pixelY >= 0 && pixelY < window.innerHeight) {
          
          const color = this.getColorAtPosition(pixelX, pixelY);
          const hex = this.rgbToHex(color.r, color.g, color.b);
          
          this.ctx.fillStyle = hex;
          this.ctx.fillRect(i * gridSize, j * gridSize, gridSize, gridSize);
        }
      }
    }
    
    // Draw center crosshair
    this.drawCenterCrosshair(centerIndex, gridSize);
  }

  /**
   * Draw crosshair in the center of magnifier
   * @param {number} centerIndex - Center grid index
   * @param {number} gridSize - Size of each grid cell
   */
  drawCenterCrosshair(centerIndex, gridSize) {
    const centerX = centerIndex * gridSize;
    const centerY = centerIndex * gridSize;
    
    // White border
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(centerX, centerY, gridSize, gridSize);
    
    // Black inner border
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(centerX + 1, centerY + 1, gridSize - 2, gridSize - 2);
  }

  /**
   * Handle click events for color selection
   * @param {MouseEvent} e - Mouse event object
   */
  handleClick(e) {
    if (!this.isActive) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    this.finishPicking(this.currentColor);
  }

  /**
   * Handle keyboard events during color picking
   * @param {KeyboardEvent} e - Keyboard event object
   */
  handleKeyPress(e) {
    if (!this.isActive) return;
    
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        this.cancelPicking();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.finishPicking(this.currentColor);
        break;
    }
  }

  /**
   * Complete the color picking process
   * @param {string} color - Selected color in hex format
   */
  finishPicking(color) {
    console.log('Color picked:', color);
    
    // Send color to background script
    chrome.runtime.sendMessage({
      action: 'colorPicked',
      color: color
    });
    
    // Clean up interface
    this.cleanup();
  }

  /**
   * Cancel color picking process
   */
  cancelPicking() {
    console.log('Color picking cancelled');
    this.cleanup();
  }

  /**
   * Clean up all resources and event listeners
   * Follows proper resource management principles
   */
  cleanup() {
    this.isActive = false;
    
    // Remove event listeners
    document.removeEventListener('mousemove', this.handleMouseMove, true);
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('keydown', this.handleKeyPress, true);
    document.removeEventListener('contextmenu', this.preventDefault, true);
    document.removeEventListener('selectstart', this.preventDefault, true);
    document.removeEventListener('dragstart', this.preventDefault, true);
    
    // Remove overlay
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    
    // Clear references
    this.overlay = null;
    this.crosshair = null;
    this.colorPreview = null;
    this.magnifier = null;
    this.canvas = null;
    this.ctx = null;
    this.screenImageData = null;
    this.imageCanvas = null;
    this.imageCtx = null;
  }

  /**
   * Prevent default event behavior
   * @param {Event} e - Event object
   */
  preventDefault(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }

  /**
   * Convert RGB values to hexadecimal color string
   * @param {number} r - Red component (0-255)
   * @param {number} g - Green component (0-255)
   * @param {number} b - Blue component (0-255)
   * @returns {string} Hexadecimal color string
   */
  rgbToHex(r, g, b) {
    // Ensure values are within valid range
    r = Math.max(0, Math.min(255, Math.round(r)));
    g = Math.max(0, Math.min(255, Math.round(g)));
    b = Math.max(0, Math.min(255, Math.round(b)));
    
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
}

// Initialize the color picker content script
// Use defensive initialization to prevent errors and duplicate instances
if (typeof window !== 'undefined' && window.document) {
  // Prevent multiple instances
  if (window.colorPickerProInstalled) {
    console.log('Color Picker Pro content script already installed');
  } else {
    const colorPickerContent = new ColorPickerContent();
    
    // Mark as installed to prevent duplicates
    window.colorPickerProInstalled = true;
    
    // Make it globally accessible for debugging
    window.colorPickerContent = colorPickerContent;
    
    console.log('Color Picker Pro content script initialized');
  }
}