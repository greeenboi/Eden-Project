<script lang="ts">
import type { PlasmoCSConfig } from "plasmo";

// Provided by the extension runtime
declare const chrome: typeof globalThis.chrome

export const config: PlasmoCSConfig = {
  matches: ["https://www.youtube.com/watch*", "https://youtube.com/watch*"]
}

function extractVideoInfo() {
  console.log('[Eden] Attempting to extract video info...')
  console.log('[Eden] Current URL:', window.location.href)
  
  // Get video ID from URL
  const urlParams = new URLSearchParams(window.location.search)
  const videoId = urlParams.get('v')
  console.log('[Eden] Video ID from URL:', videoId)
  
  // Method 1: Look for the title div by id, then find h1 inside it
  let videoTitle: string | null = null
  const titleDiv = document.querySelector('div#title.ytd-watch-metadata')
  console.log('[Eden] Found title div:', !!titleDiv)
  
  if (titleDiv) {
    const h1Element = titleDiv.querySelector('h1.ytd-watch-metadata')
    console.log('[Eden] Found h1 element:', !!h1Element)
    
    if (h1Element) {
      const ytFormattedString = h1Element.querySelector('yt-formatted-string')
      videoTitle = ytFormattedString?.textContent?.trim() || null
      console.log('[Eden] Title from div#title > h1 > yt-formatted-string:', videoTitle)
    }
  }
  
  // Fallback Method 2: Try meta tags
  if (!videoTitle) {
    const titleMeta = document.querySelector('meta[name="title"]')
    videoTitle = titleMeta?.getAttribute('content') || null
    console.log('[Eden] Title from meta tag (fallback):', videoTitle)
  }
  
  // Fallback Method 3: Try document title
  if (!videoTitle) {
    videoTitle = document.title.replace(' - YouTube', '').trim()
    console.log('[Eden] Title from document.title (fallback):', videoTitle)
  }
  
  if (videoTitle && videoId) {
    return {
      id: videoId,
      title: videoTitle,
      url: window.location.href,
      timestamp: Date.now(),
    }
  }

  console.warn('[Eden] ⚠️ Could not extract video info. Title:', videoTitle, 'ID:', videoId)
  return null
}

export default {
  setup() {},
  mounted() {
    console.log('[Eden] Content script mounted!')
    
    // Try immediately
    extractVideoInfo()
    
    // YouTube loads content dynamically, so we need to wait and retry
    setTimeout(() => {
      console.log('[Eden] Retrying after 1 second...')
      extractVideoInfo()
    }, 1000)
    
    setTimeout(() => {
      console.log('[Eden] Retrying after 3 seconds...')
      extractVideoInfo()
    }, 3000)
    
    // Watch for URL changes (for navigation within YouTube)
    let lastUrl = window.location.href
    
    // Use both navigation listener and mutation observer for reliability
    const checkUrlChange = () => {
      const currentUrl = window.location.href
      if (currentUrl !== lastUrl) {
        console.log('[Eden] URL changed from:', lastUrl)
        console.log('[Eden] URL changed to:', currentUrl)
        lastUrl = currentUrl
        
        // Extract immediately, then retry after delays
        setTimeout(() => {
          console.log('[Eden] Extracting after URL change...')
          extractVideoInfo()
        }, 500)
        
        setTimeout(() => {
          console.log('[Eden] Retrying extraction after 2 seconds...')
          extractVideoInfo()
        }, 2000)
      }
    }
    
    // Check URL every 500ms (lightweight check)
    setInterval(checkUrlChange, 500)
    
    // Also use MutationObserver as backup
    const observer = new MutationObserver(checkUrlChange)
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
    
    console.log('[Eden] Observer set up for URL changes')

    // Respond to popup requests for video info via runtime messaging
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === 'eden-get-video-info') {
        const info = extractVideoInfo()
        sendResponse(info)
        return true
      }
      return undefined
    })
  }
}
</script>

<template>
  <!-- This content script doesn't render any UI -->
  <div style="display: none;"></div>
</template>
