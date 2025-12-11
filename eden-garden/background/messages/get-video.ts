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
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  const tab = tabs.at(0)

  if (!tab?.id) {
    res.send(null)
    return
  }

  const response = await chrome.tabs.sendMessage(tab.id, { type: "eden-get-video-info" }).catch(() => null)
  // Expect the content script to respond with video info or null.
  res.send(response ?? null)
}

export default handler
