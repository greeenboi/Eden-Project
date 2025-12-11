/// <reference types="chrome" />
import type { PlasmoMessaging } from "@plasmohq/messaging"

type RequestBody = { activeTabOnly?: boolean }
type ResponseBody =
  | {
      id: string
      title: string
      url: string
      timestamp: number
    }
  | null

const handler: PlasmoMessaging.MessageHandler<RequestBody, ResponseBody> = async (_req, res) => {
  console.log('[Eden BG] get-video handler invoked')
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  const tab = tabs.at(0)

  if (!tab?.id) {
    console.warn('[Eden BG] no active tab found')
    res.send(null)
    return
  }

  console.log('[Eden BG] sending message to tab', tab.id, tab.url)
  const response = await chrome.tabs
    .sendMessage(tab.id, { type: "eden-get-video-info" })
    .catch((err) => {
      console.error('[Eden BG] content script message failed', err)
      return null
    })

  console.log('[Eden BG] response from content script', response)

  if (response) {
    res.send(response)
    return
  }

  // Fallback: execute extraction directly in the tab if the content script isn't available.
  console.log('[Eden BG] attempting fallback extraction via scripting API')
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const urlParams = new URLSearchParams(window.location.search)
        const videoId = urlParams.get('v')

        const readTitle = () => {
          const titleDiv = document.querySelector('div#title.ytd-watch-metadata')
          const h1 = titleDiv?.querySelector('h1.ytd-watch-metadata')
          const ytString = h1?.querySelector('yt-formatted-string')
          return ytString?.textContent?.trim() || null
        }

        let title = readTitle()
        if (!title) {
          const metaTitle = document.querySelector('meta[name="title"]')?.getAttribute('content')
          title = metaTitle || null
        }

        if (!title) {
          title = document.title.replace(' - YouTube', '').trim()
        }

        if (title && videoId) {
          return {
            id: videoId,
            title,
            url: window.location.href,
            timestamp: Date.now(),
          }
        }
        return null
      },
    })

    console.log('[Eden BG] fallback extraction result', result?.result)
    res.send(result?.result ?? null)
  } catch (fallbackError) {
    console.error('[Eden BG] fallback extraction failed', fallbackError)
    res.send(null)
  }
}

export default handler
