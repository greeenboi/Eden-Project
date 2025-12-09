<script lang="ts">
import type { PlasmoCSConfig } from "plasmo";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

export default {
  setup() {},
  mounted() {
    // ASCII art with colors
    const asciiArt = `
    ███████╗██████╗ ███████╗███╗   ██╗
    ██╔════╝██╔══██╗██╔════╝████╗  ██║
    █████╗  ██║  ██║█████╗  ██╔██╗ ██║
    ██╔══╝  ██║  ██║██╔══╝  ██║╚██╗██║
    ███████╗██████╔╝███████╗██║ ╚████║
    ╚══════╝╚═════╝ ╚══════╝╚═╝  ╚═══╝
    `
    
    // Console styling
    const styles = [
      'color: #84cc16', // Lime color (Eden theme)
      'font-size: 12px',
      'font-weight: bold',
      'font-family: monospace',
      'text-shadow: 2px 2px 4px rgba(132, 204, 22, 0.3)'
    ].join(';')
    
    console.log(`%c${asciiArt}`, styles)
    console.log(
      '%c🎵 Eden Garden Loaded! 🎵',
      'color: #84cc16; font-size: 14px; font-weight: bold; padding: 10px;'
    )
    console.log(
      '%cReady to capture music from the web! 🎶',
      'color: #a3e635; font-size: 12px; font-style: italic;'
    )
    
    // Additional info with gradient effect
    console.log(
      '%c━'.repeat(50),
      'color: #84cc16;'
    )
    console.log(
      '%cVersion: %c0.0.1 %c| %cStatus: %cActive',
      'color: #94a3b8;',
      'color: #84cc16; font-weight: bold;',
      'color: #94a3b8;',
      'color: #94a3b8;',
      'color: #22c55e; font-weight: bold;'
    )
    console.log(
      '%c━'.repeat(50),
      'color: #84cc16;'
    )
  }
}
</script>

<template>
  <!-- This content script doesn't render any UI -->
  <div style="display: none;"></div>
</template>
