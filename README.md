# Color Picker Pro - Chrome Extension

A professional Chrome extension for picking colors from web pages with advanced features including screen capture, magnification, and color palette generation.

## Features

### 🎯 **Precise Color Picking**
- **Screen Capture Technology**: Uses Chrome's `captureVisibleTab` API for pixel-perfect color detection
- **Magnifier Tool**: 15x15 pixel magnification grid for precise targeting
- **Fallback Mode**: Element-based color detection when screen capture isn't available
- **Real-time Preview**: Live color preview with hex, RGB, and position information

### 🎨 **Advanced Color Tools**
- **Multiple Format Support**: Hex, RGB, HSL, and HSV color formats
- **Color Palette Generation**: 
  - Complementary colors
  - Analogous colors
  - Triadic colors  
  - Monochromatic variations
- **Color History**: Automatic storage of recently picked colors
- **One-Click Copy**: Click any color value to copy to clipboard

### 🛠 **User Experience**
- **Professional UI**: Modern glass-morphism design with gradient backgrounds
- **Keyboard Shortcuts**: 
  - `ESC` to cancel picking
  - `Enter` or `Space` to confirm color selection
  - `Click` to pick color
- **Smart Positioning**: Interface elements automatically avoid screen edges
- **Visual Feedback**: Toast notifications and hover effects

## Installation

1. **Download the Extension**
   - Clone or download this repository
   - Navigate to the `color picker` folder

2. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `color picker` folder

3. **Grant Permissions**
   - The extension needs access to all websites for color picking
   - Accept the permissions when prompted

## How to Use

### **Starting Color Picking**
1. Click the Color Picker Pro icon in your Chrome toolbar
2. Click the "Pick from Page" button in the popup
3. The popup will close and color picking mode will activate

### **Picking Colors**
1. **Move your mouse** over the page to see live color preview
2. **Use the magnifier** to see individual pixels for precise selection
3. **Click** anywhere to pick that color
4. **Use keyboard shortcuts**:
   - `ESC` - Cancel and exit
   - `Enter` or `Space` - Confirm current color
   - `Click` - Pick color at cursor

### **Using Picked Colors**
1. **View Color Information**: See hex, RGB, HSL, and HSV values
2. **Copy Colors**: Click any color value to copy to clipboard
3. **Explore Palettes**: Browse generated color schemes
4. **Access History**: Review recently picked colors

### **Manual Color Input**
1. Click "Manual Input" in the popup
2. Enter any valid color format (hex, rgb, hsl)
3. View generated palettes and save to history

## Technical Architecture

### **Security & Best Practices**
- ✅ **SOLID Principles**: Single responsibility, dependency injection, proper abstraction
- ✅ **OWASP Security**: Input validation, secure DOM manipulation, XSS prevention
- ✅ **Error Handling**: Comprehensive try-catch blocks and fallback mechanisms
- ✅ **Memory Management**: Proper cleanup of event listeners and references

### **Key Components**

#### **Manifest V3 Configuration**
```json
{
  "manifest_version": 3,
  "permissions": ["activeTab", "storage", "tabs", "scripting"],
  "host_permissions": ["<all_urls>"]
}
```

#### **Background Script (`background.js`)**
- Service worker for Manifest V3 compliance
- Screen capture coordination
- Message routing between popup and content script
- Storage management

#### **Content Script (`content.js`)**
- Color picking interface creation
- Mouse and keyboard event handling  
- Screen capture image analysis
- DOM element color extraction (fallback)

#### **Popup Interface (`popup.html`)**
- User interface for color display and palette generation
- Color format conversion utilities
- History management
- Clipboard integration

## File Structure

```
color picker/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (messaging & screen capture)
├── content.js            # Color picking functionality  
├── content.css           # Interface styling
├── popup.html            # Main UI (with embedded CSS & JS)
├── icon16.png           # Extension icon (16x16)
├── icon48.png           # Extension icon (48x48)
├── icon128.png          # Extension icon (128x128)
└── README.md            # This documentation
```

## API Reference

### **Content Script Methods**

```javascript
// Start color picking
colorPickerContent.startColorPicking()

// Get color at specific coordinates  
colorPickerContent.getColorAtPosition(x, y)

// Convert RGB to hex
colorPickerContent.rgbToHex(r, g, b)
```

### **Popup Methods**

```javascript
// Set current color
colorPicker.setColor('#ff0000')

// Generate color palettes
colorPicker.generatePalettes()

// Copy to clipboard
colorPicker.copyToClipboard('#ff0000')
```

## Browser Support

- ✅ **Chrome 88+** (Manifest V3 support)
- ✅ **Edge 88+** (Chromium-based)
- ❌ **Firefox** (Manifest V3 not fully supported)
- ❌ **Safari** (Different extension API)

## Troubleshooting

### **Color Picking Not Working**
1. **Check Permissions**: Ensure the extension has access to the current website
2. **Reload Page**: Refresh the page and try again
3. **Check Console**: Open DevTools and look for error messages
4. **Fallback Mode**: The extension will automatically use fallback color detection if screen capture fails

### **Screen Capture Issues**
- Some websites may block screen capture for security reasons
- The extension automatically falls back to DOM element color detection
- Protected pages (chrome://, file://) may have limited functionality

### **Performance Issues**
- Large pages may take slightly longer to capture
- The magnifier updates in real-time which requires processing power
- Consider closing unnecessary tabs for better performance

## Development

### **Building from Source**
1. Clone the repository
2. No build process required - pure HTML/CSS/JS
3. Load directly in Chrome Developer mode

### **Contributing**
1. Follow SOLID principles and security best practices
2. Add comprehensive JSDoc comments
3. Test on multiple websites and scenarios
4. Ensure proper error handling and fallbacks

### **Testing**
- Test on various websites (light, dark, complex layouts)
- Verify screen capture and fallback modes
- Check all color formats and palette generation
- Test keyboard shortcuts and UI interactions

## License

MIT License - feel free to modify and distribute.

## Support

For issues, feature requests, or questions:
1. Check the troubleshooting section above
2. Open browser DevTools to check for errors
3. Test on different websites to isolate issues
4. Verify extension permissions are granted

---

**Color Picker Pro** - Professional color picking for web developers and designers! 🎨 