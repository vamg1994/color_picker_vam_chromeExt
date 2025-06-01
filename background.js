// Background script for Chrome extension - Enhanced for better color picking functionality
chrome.runtime.onInstalled.addListener(() => {
  console.log('Color Picker Pro extension installed');
});

// Handle messages between popup and content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'colorPicked') {
    // Store the picked color temporarily
    chrome.storage.local.set({
      lastPickedColor: request.color,
      pickTimestamp: Date.now()
    });
    
    // Notify popup about the picked color
    chrome.runtime.sendMessage({
      action: 'colorUpdate',
      color: request.color
    }).catch(() => {
      // Popup might be closed, store in storage for next time
      console.log('Popup closed, color stored in storage');
    });
    
    sendResponse({ success: true });
  } else if (request.action === 'captureScreen') {
    // Handle screen capture for color picking
    handleScreenCapture(request, sender, sendResponse);
    return true; // Keep message channel open for async response
  } else if (request.action === 'requestColorPicking') {
    // Handle color picking request from popup
    handleColorPickingRequest(request, sender, sendResponse);
    return true; // Keep message channel open for async response
  } else if (request.action === 'startPicking') {
    // Legacy support - redirect to content script
    handleStartPicking(request, sender, sendResponse);
    return true;
  }
  
  return true;
});

// Handle color picking request from popup
async function handleColorPickingRequest(request, sender, sendResponse) {
  try {
    const tabId = request.tabId;
    
    if (!tabId) {
      sendResponse({ error: 'No tab ID provided' });
      return;
    }

    console.log('Handling color picking request for tab:', tabId);

    // Get tab information for better error handling
    const tab = await chrome.tabs.get(tabId);
    console.log('Tab info:', { url: tab.url, status: tab.status });

    // First, try to inject the content script
    try {
      console.log('Checking if content script injection is needed...');
      
      // Try to ping the content script first
      const pingResponse = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
          resolve(response);
        });
      });
      
      if (!pingResponse) {
        console.log('Content script not found, injecting...');
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        });
        console.log('Content script injected successfully');
      } else {
        console.log('Content script already present');
      }
    } catch (injectionError) {
      console.log('Content script injection handling:', injectionError.message);
      
      // Check if it's a permission issue
      if (injectionError.message.includes('cannot be scripted') || 
          injectionError.message.includes('Extension manifest') ||
          injectionError.message.includes('chrome://') ||
          injectionError.message.includes('chrome-extension://')) {
        sendResponse({ 
          error: `Cannot inject script into this page type (${tab.url.split('://')[0]}://). Try a regular website instead.` 
        });
        return;
      }
      // For other errors, continue as the script might already be injected
    }

    // Wait a bit for the content script to initialize
    await new Promise(resolve => setTimeout(resolve, 100));

    // Now try to communicate with the content script
    chrome.tabs.sendMessage(tabId, { action: 'startPicking' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error communicating with content script:', chrome.runtime.lastError);
        const errorMessage = chrome.runtime.lastError.message;
        
        if (errorMessage.includes('Could not establish connection')) {
          sendResponse({ 
            error: `Could not connect to page. This may be a restricted page type (${tab.url.split('://')[0]}://) or the page may need to be refreshed.` 
          });
        } else {
          sendResponse({ 
            error: `Communication error: ${errorMessage}` 
          });
        }
      } else {
        console.log('Content script responded:', response);
        sendResponse({ success: true });
      }
    });

  } catch (error) {
    console.error('Error in handleColorPickingRequest:', error);
    sendResponse({ 
      error: `Failed to start color picking: ${error.message}` 
    });
  }
}

// Handle screen capture functionality
async function handleScreenCapture(request, sender, sendResponse) {
  try {
    console.log('Attempting screen capture for tab:', sender.tab.id);
    
    // Capture the visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(
      sender.tab.windowId,
      { format: 'png', quality: 100 }
    );
    
    console.log('Screen capture successful');
    sendResponse({ 
      success: true, 
      dataUrl: dataUrl 
    });
  } catch (error) {
    console.error('Screen capture failed:', error);
    
    let errorMessage = error.message;
    
    // Provide more specific error messages
    if (error.message.includes('cannot be captured')) {
      errorMessage = 'This page type cannot be captured for security reasons';
    } else if (error.message.includes('Permission denied')) {
      errorMessage = 'Permission denied for screen capture';
    } else if (error.message.includes('tab')) {
      errorMessage = 'Could not access the current tab';
    }
    
    sendResponse({ 
      success: false, 
      error: errorMessage
    });
  }
}

// Handle starting color picking process (legacy support)
async function handleStartPicking(request, sender, sendResponse) {
  try {
    // Ensure content script is injected
    await chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      files: ['content.js']
    });
    
    // Send message to content script to start picking
    chrome.tabs.sendMessage(sender.tab.id, {
      action: 'startPicking'
    });
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Failed to start picking:', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked');
});