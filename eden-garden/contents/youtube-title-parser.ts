import type { PlasmoCSConfig } from "plasmo"

declare const chrome: typeof globalThis.chrome

export const config: PlasmoCSConfig = {
  matches: ["https://www.youtube.com/watch*", "https://youtube.com/watch*"]
}

function extractVideoInfo() {
  const urlParams = new URLSearchParams(window.location.search)
  const videoId = urlParams.get("v")

  let videoTitle: string | null = null
  const titleDiv = document.querySelector("div#title.ytd-watch-metadata")

  if (titleDiv) {
    const h1Element = titleDiv.querySelector("h1.ytd-watch-metadata")
    if (h1Element) {
      const ytFormattedString = h1Element.querySelector("yt-formatted-string")
      videoTitle = ytFormattedString?.textContent?.trim() || null
    }
  }

  if (!videoTitle) {
    const titleMeta = document.querySelector('meta[name="title"]')
    videoTitle = titleMeta?.getAttribute("content") || null
  }

  if (!videoTitle) {
    videoTitle = document.title.replace(" - YouTube", "").trim()
  }

  if (videoTitle && videoId) {
    return {
      id: videoId,
      title: videoTitle,
      url: window.location.href,
      timestamp: Date.now()
    }
  }

  return null
}

const runExtraction = () => {
  const info = extractVideoInfo()
  console.log("[Eden] YouTube extraction", info)
}

runExtraction()
window.setTimeout(runExtraction, 1000)
window.setTimeout(runExtraction, 3000)

let lastUrl = window.location.href
const checkUrlChange = () => {
  const currentUrl = window.location.href
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl
    window.setTimeout(runExtraction, 500)
    window.setTimeout(runExtraction, 2000)
  }
}

const intervalId = window.setInterval(checkUrlChange, 500)
const observer = new MutationObserver(checkUrlChange)
observer.observe(document.documentElement, {
  childList: true,
  subtree: true
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "eden-get-video-info") {
    sendResponse(extractVideoInfo())
    return true
  }
  return undefined
})

window.addEventListener("beforeunload", () => {
  window.clearInterval(intervalId)
  observer.disconnect()
})

export {}