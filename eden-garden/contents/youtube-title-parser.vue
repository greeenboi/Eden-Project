<script lang="ts">
import { Storage } from "@plasmohq/storage";
import type { PlasmoCSConfig } from "plasmo";

const storage = new Storage({ area: "local" });

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
    console.log('✅ [Eden] Successfully extracted video info!')
    console.log('🎵 YouTube Video Detected!')
    console.log('📹 Video ID:', videoId)
    console.log('📝 Video Title:', videoTitle)
    
    const videoData = {
      id: videoId,
      title: videoTitle,
      url: window.location.href,
      timestamp: Date.now()
    }
    
    console.log('[Eden] Storing to Plasmo storage:', videoData)
    
    // Store data for potential use by popup/sidepanel
    storage.set('lastYouTubeVideo', videoData).then(() => {
      console.log('[Eden] ✅ Data stored successfully!')
    }).catch((error) => {
      console.error('[Eden] ❌ Failed to store data:', error)
    })
  } else {
    console.warn('[Eden] ⚠️ Could not extract video info. Title:', videoTitle, 'ID:', videoId)
  }
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
    const observer = new MutationObserver(() => {
      const currentUrl = window.location.href
      if (currentUrl !== lastUrl) {
        console.log('[Eden] URL changed, re-extracting...')
        lastUrl = currentUrl
        setTimeout(extractVideoInfo, 1000)
      }
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
    
    console.log('[Eden] Observer set up for URL changes')
  }
}
</script>

<template>
  <!-- This content script doesn't render any UI -->
  <div style="display: none;"></div>
</template>
