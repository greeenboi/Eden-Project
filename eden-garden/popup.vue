<template>
  <div style="width: 100%; height: 600px; position: relative;">
    <Plasma
      color="#84cc16"
      :speed="0.6"
      direction="forward"
      :scale="1.1"
      :opacity="0.8"
      :mouseInteractive="true"
      style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0;"
    />
    <Card class="p-4 container bg-transparent" style="position: relative; z-index: 1; background-color: transparent;">
      <template #header class="bg-transparent">
        <div class="flex items-center gap-2 p-4 pb-0">
          <i class="pi pi-music text-2xl text-primary"></i>
          <h2 class="text-xl font-semibold m-0">Eden Music</h2>
        </div>
      </template>
      <template #content>
        <div class="flex flex-col gap-4">
        <!-- YouTube Video Info (if available) -->
        <Card v-if="isLoading" style="width: 25rem; overflow: hidden">
          <template #header>
            <div class="p-4 bg-[#0F172A] dark:bg-[#0F172A]">
              <i class="pi pi-youtube text-red-600 text-2xl"></i>
            </div>
          </template>
          <template #title>
            <Skeleton class="mb-2 h-6"></Skeleton>
          </template>
          <template #subtitle>
            <Skeleton width="10rem" class="h-4"></Skeleton>
          </template>
          <template #content>
            <Skeleton class="mb-2 h-4"></Skeleton>
            <Skeleton width="60%" class="h-4"></Skeleton>
          </template>
        </Card>

        <Card v-else-if="youtubeVideo" class="bg-[#0C1920]" style="width: 25rem;  overflow: hidden">
          <template #header>
            <div class="p-4 bg-[#0F172A] dark:bg-[#0F172A] grid grid-cols-3 items-center">
              <div></div>
              <i class="pi pi-youtube text-red-600 text-4xl justify-self-center"></i>
              <Button 
                icon="pi pi-refresh"
                aria-label="Refresh Video Info" 
                severity="secondary"
                variant="text"
                rounded
                size="small"
                @click="handleRefresh"
                v-ripple
                class="justify-self-center"
              />
            </div>
          </template>
          <template #title>{{ youtubeVideo.title }}</template>
          <template #subtitle>Video ID: {{ youtubeVideo.id }}</template>
          <template #content>
            <p class="m-0">
              <a :href="youtubeVideo.url" target="_blank" class="text-primary underline hover:text-primary-600">
                {{ youtubeVideo.url }}
              </a>
            </p>
            <p class="m-0 mt-2 text-xs text-muted">
              Saved at: {{ new Date(youtubeVideo.timestamp).toLocaleString() }}
            </p>
          </template>
          <template #footer>
            <div class="flex gap-4 mt-1">
              <Button
                label="Open"
                severity="secondary"
                class="w-full"
                @click="handleOpenVideo"
              />
              <Button
                label="Copy ID"
                class="w-full"
                @click="handleCopyId"
              />
            </div>
          </template>
        </Card>
        
        <Button 
          :label="isLoading ? 'Finding video...' : 'Upload to Eden'" 
          :icon="isLoading ? '' : 'pi pi-upload'"
          severity="primary"
          @click="handleUpload"
          v-ripple
          :disabled="!youtubeVideo || isLoading"
        >
          <template v-if="isLoading" #icon>
            <ProgressSpinner 
              style="width: 16px; height: 16px" 
              strokeWidth="4" 
              fill="var(--p-button-primary-background)"
              animationDuration=".5s" 
            />
          </template>
        </Button>

        <p v-if="!youtubeVideo && !isLoading" class="text-xs text-center text-gray-500">
          Navigate to a YouTube video to enable upload
        </p>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { Storage } from '@plasmohq/storage';
import Aura from '@primeuix/themes/dist/aura';
import 'primeicons/primeicons.css';
import Button from 'primevue/button';
import Card from 'primevue/card';
import PrimeVue from 'primevue/config';
import ProgressSpinner from 'primevue/progressspinner';
import Ripple from 'primevue/ripple';
import Skeleton from 'primevue/skeleton';
import { onMounted, ref } from "vue";
import Plasma from "./Plasma.vue";
import "./style.css";
const storage = new Storage({ area: 'local' })

type ChromeTab = { url?: string; id?: number }
type ChromeTabs = { query: (queryInfo: { active: boolean; currentWindow: boolean }) => Promise<ChromeTab[]> }
type ChromeStorage = { 
  local: { 
    get: (keys: string | string[]) => Promise<{ lastYouTubeVideo?: YouTubeVideo | undefined }>
    onChanged: {
      addListener: (callback: (changes: Record<string, { newValue?: YouTubeVideo | undefined }>) => void) => void
    }
  } 
}
type ChromeAPI = { tabs?: ChromeTabs; storage?: ChromeStorage }

interface YouTubeVideo {
  id: string
  title: string
  url: string
  timestamp: number
}

const currentUrl = ref('')
const youtubeVideo = ref<YouTubeVideo | null>(null)
const isLoading = ref(false)

async function loadYouTubeVideo() {
  console.log('[Eden Popup] Loading YouTube video from storage...')
  
  try {
    const result = await storage.get<YouTubeVideo>('lastYouTubeVideo')
    console.log('[Eden Popup] Storage result:', result)
    if (result) {
      console.log('[Eden Popup] ✅ YouTube video found:', result)
      youtubeVideo.value = result
    } else {
      console.log('[Eden Popup] ⚠️ No YouTube video in storage')
    }
  } catch (error) {
    console.error('[Eden Popup] ❌ Failed to load from storage:', error)
  }
}

onMounted(async () => {
  console.log('[Eden Popup] Popup mounted!')
  
  // Get current tab URL for Chrome extension
  if (typeof window !== 'undefined' && (window as Window & { chrome?: ChromeAPI }).chrome?.tabs) {
    const w = window as Window & { chrome?: ChromeAPI }
    console.log('[Eden Popup] Getting current tab...')
    // biome-ignore lint/correctness/noUnsafeOptionalChaining: L
    const [tab] = await w.chrome?.tabs?.query({ active: true, currentWindow: true })
    currentUrl.value = tab?.url || 'No URL available'
    console.log('[Eden Popup] Current URL:', currentUrl.value)
  } else {
    currentUrl.value = 'Extension context not available'
  }

  // Load YouTube video data from storage
  await loadYouTubeVideo()

  // Listen for storage changes (real-time updates)
  console.log('[Eden Popup] Setting up storage change listener...')
  storage.watch({
    lastYouTubeVideo: (change) => {
      console.log('[Eden Popup] YouTube video updated:', change.newValue)
      if (change.newValue) {
        const newVideo = change.newValue as YouTubeVideo
        // Only update if it's a different video
        if (!youtubeVideo.value || youtubeVideo.value.id !== newVideo.id) {
          console.log('[Eden Popup] 🔄 New video detected, updating...')
          youtubeVideo.value = newVideo
        }
      }
    }
  })
  console.log('[Eden Popup] ✅ Storage listener set up')
})

function handleUpload() {
  if (youtubeVideo.value) {
    console.log('Uploading YouTube video:', youtubeVideo.value)
    // TODO: Implement actual upload logic to Eden server
  } else {
    console.log('No YouTube video to upload')
  }
}

function handleOpenVideo() {
  if (youtubeVideo.value?.url) {
    window.open(youtubeVideo.value.url, '_blank')
  }
}

function handleCopyId() {
  if (youtubeVideo.value?.id) {
    navigator.clipboard.writeText(youtubeVideo.value.id)
  }
}

async function handleRefresh() {
  console.log('[Eden Popup] Manual refresh triggered')
  isLoading.value = true
  
  // Send message to content script to re-extract video info
  if (typeof window !== 'undefined' && (window as Window & { chrome?: ChromeAPI }).chrome?.tabs) {
    const w = window as Window & { chrome?: ChromeAPI }
    try {
      const tabs = await w.chrome?.tabs?.query({ active: true, currentWindow: true })
      const tab = tabs?.[0]
      if (tab?.id) {
        // Reload YouTube video data from storage after a short delay
        setTimeout(async () => {
          await loadYouTubeVideo()
          isLoading.value = false
        }, 1500)
         
        console.log('[Eden Popup] Refreshing video info for tab:', tab.id)
      }
    } catch (error) {
      console.error('[Eden Popup] Failed to refresh:', error)
      isLoading.value = false
    }
  } else {
    // Just reload from storage if chrome API not available
    await loadYouTubeVideo()
    isLoading.value = false
  }
}

defineOptions({
  prepare(app) {
    app.use(PrimeVue, {
        theme: {
            preset: Aura,
            options: {
              prefix: 'p',
              darkModeSelector: 'system',
              cssLayer: false
            }
        },
        ripple: true
    })
    app.directive('ripple', Ripple);
  }
})
</script>
