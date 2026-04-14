/// <reference types="chrome" />
// Plasmo background service worker entrypoint required for messaging handlers.
chrome.runtime.onInstalled.addListener(() => {
	console.log("[Eden BG] service worker installed")
})

chrome.runtime.onStartup.addListener(() => {
	console.log("[Eden BG] browser startup event received")
})

export {}

