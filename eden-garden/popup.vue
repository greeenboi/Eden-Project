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

        <p v-if="uploadSuccess" class="text-sm text-green-400 m-0">{{ uploadSuccess }}</p>
        <p v-if="metadataError && !uploadSuccess" class="text-sm text-red-400 m-0">{{ metadataError }}</p>

        <p v-if="!youtubeVideo && !isLoading" class="text-xs text-center text-gray-500">
          Navigate to a YouTube video to enable upload
        </p>

        <Card v-if="showDetails" class="bg-[#0C1920]" style="width: 25rem; overflow: hidden">
          <template #header>
            <div class="p-4 bg-[#0F172A] dark:bg-[#0F172A] flex items-center gap-2">
              <i class="pi pi-info-circle text-primary text-2xl"></i>
              <span class="font-semibold">Track Details</span>
            </div>
          </template>

          <template #content>
            <div v-if="isFetchingMetadata" class="flex flex-col gap-2">
              <Skeleton class="h-5" width="70%" />
              <Skeleton class="h-4" width="50%" />
              <Skeleton class="h-4" width="60%" />
            </div>

            <div v-else-if="metadataError" class="text-sm text-red-400">
              {{ metadataError }}
            </div>

            <div v-else-if="trackOptions.length" class="flex flex-col gap-3 text-sm">
              <div class="flex flex-col gap-2">
                <div
                  v-for="(option, idx) in trackOptions"
                  :key="idx"
                  class="flex gap-3 rounded border border-slate-800 bg-slate-900/40 p-3 cursor-pointer hover:border-primary"
                  :class="{ 'border-primary': selectedIndex === idx }"
                  @click="selectedIndex = idx"
                >
                  <RadioButton
                    class="mt-1"
                    name="track-option"
                    :inputId="'track-option-' + idx"
                    :value="idx"
                    v-model="selectedIndex"
                  />
                  <Image
                    v-if="option.track?.image"
                    :src="option.track.image"
                    alt="Album art"
                    imageClass="h-16 w-16 rounded object-cover"
                    preview
                  />
                  <div class="flex flex-col gap-1">
                    <label class="font-semibold text-base" :for="'track-option-' + idx">
                      {{ option.track?.title || 'Unknown title' }}
                    </label>
                    <div class="text-muted">Artist: {{ option.artist?.name || 'Unknown artist' }}</div>
                    <div>Album: {{ option.track?.album || 'Unknown album' }}</div>
                    <div>Album image URL: <span class="break-all">{{ option.track?.albumImageUrl || option.track?.image || 'N/A' }}</span></div>
                    <div>Genre: {{ option.track?.genre || 'Unknown' }}</div>
                    <div>
                      Duration:
                      {{ option.track?.duration ? (option.track.duration).toFixed(1) + 's' : 'Unknown' }}
                    </div>
                    <div v-if="option.track?.isrc">ISRC: {{ option.track.isrc }}</div>
                    <div v-if="option.track?.spotifyUri" class="text-xs text-primary">
                      {{ option.track.spotifyUri }}
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="selectedMetadata" class="flex gap-2 mt-1">
                <Button
                  label="Push to Eden"
                  icon="pi pi-cloud-upload"
                  size="small"
                  @click="handlePush"
                  :disabled="isPushing"
                />
                <Button
                  v-if="selectedMetadata.track?.spotifyUri"
                  label="Open in Spotify"
                  icon="pi pi-external-link"
                  severity="secondary"
                  size="small"
                  @click="() => handleOpenSpotify(selectedMetadata.track?.spotifyUri)"
                />
              </div>
            </div>

            <div v-else class="text-sm text-muted">No metadata loaded yet.</div>
          </template>
        </Card>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { sendToBackground } from '@plasmohq/messaging';
import Aura from '@primeuix/themes/dist/aura';
import 'primeicons/primeicons.css';
import Button from 'primevue/button';
import Card from 'primevue/card';
import PrimeVue from 'primevue/config';
import Image from 'primevue/image';
import ProgressSpinner from 'primevue/progressspinner';
import RadioButton from 'primevue/radiobutton';
import Ripple from 'primevue/ripple';
import Skeleton from 'primevue/skeleton';
import { computed, onMounted, ref } from "vue";
import Plasma from "./Plasma.vue";
import "./style.css";

type ChromeTab = { url?: string; id?: number }
type ChromeTabs = { query: (queryInfo: { active: boolean; currentWindow: boolean }) => Promise<ChromeTab[]> }
type ChromeAPI = { tabs?: ChromeTabs }

interface YouTubeVideo {
  id: string
  title: string
  url: string
  timestamp: number
}

interface TrackMetadata {
  title: string
  duration?: number | null
  explicit?: boolean
  genre?: string | null
  isrc?: string | null
  image?: string | null
  album?: string | null
  albumImageUrl?: string | null
  spotifyTrackId?: string | null
  spotifyUri?: string | null
}

interface ArtistMetadata {
  name: string
  bio?: string | null
  avatarUrl?: string | null
  profile?: string | null
  genres?: string[]
  spotifyUri?: string | null
  followers?: number | null
  popularity?: number | null
}

interface SpotifyMetadata {
  source: string
  track: TrackMetadata
  artist: ArtistMetadata
}

const currentUrl = ref('')
const youtubeVideo = ref<YouTubeVideo | null>(null)
const isLoading = ref(false)
const isFetchingMetadata = ref(false)
const metadataError = ref('')
const trackOptions = ref<SpotifyMetadata[]>([])
const selectedIndex = ref(0)
const showDetails = ref(false)
const isPushing = ref(false)
const uploadSuccess = ref('')
const selectedMetadata = computed(() => trackOptions.value[selectedIndex.value] || null)

// idk why but vue cli and plasmo have conflicting import env resolutions so just keep em here.

const YtMetadataWorker = ref(
  // @ts-expect-error fk plasmo for not supporting vite properly
  (typeof import.meta !== 'undefined' && import.meta.env?.PLASMO_PUBLIC_YT_METADATA_WORKER) || 
  'https://youtube-extension-worker.suvan-gowrishanker-204.workers.dev'
)
const EdenGateway = ref(
  // @ts-expect-error fk plasmo for not supporting vite properly
  (typeof import.meta !== 'undefined' && import.meta.env?.PLASMO_PUBLIC_EDEN_GATEWAY) ||
    'https://eden-gateway.suvan-gowrishanker-204.workers.dev'
)
function resetMetadataState() {
  metadataError.value = ''
  trackOptions.value = []
  selectedIndex.value = 0
  uploadSuccess.value = ''
}

async function fetchYouTubeVideoViaMessaging() {
  try {
    console.log('[Eden Popup] sending get-video message')
    const result = await sendToBackground<{ activeTabOnly?: boolean }, YouTubeVideo | null>({
      name: 'get-video',
      body: { activeTabOnly: true },
    })

    console.log('[Eden Popup] received video via messaging', result)
    youtubeVideo.value = result
  } catch (error) {
    console.error('[Eden Popup] ❌ Failed to fetch video info via messaging:', error)
    youtubeVideo.value = null
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

  // Load YouTube video data via messaging to the content script
  await fetchYouTubeVideoViaMessaging()
})

function handleUpload() {
  if (!youtubeVideo.value) {
    console.log('No YouTube video to upload')
    return
  }

  // Query worker API for metadata
  resetMetadataState()
  isFetchingMetadata.value = true
  showDetails.value = true

  if (!YtMetadataWorker.value) {
    metadataError.value = 'Metadata worker URL is not configured.'
    isFetchingMetadata.value = false
    return
  }

  const body = { query: youtubeVideo.value.title }

  fetch(`${YtMetadataWorker.value}/metadata/spotify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Request failed with status ${res.status}`)
      }
      return res.json()
    })
    .then((data: SpotifyMetadata[]) => {
      if (!Array.isArray(data) || data.length === 0) {
        metadataError.value = 'No results returned from Spotify.'
        return
      }
      trackOptions.value = data
      selectedIndex.value = 0
      showDetails.value = true
    })
    .catch((err) => {
      console.error('[Eden Popup] Metadata fetch failed:', err)
      metadataError.value = 'Failed to fetch metadata. Please try again.'
    })
    .finally(() => {
      isFetchingMetadata.value = false
    })
}

function handlePush() {
  metadataError.value = ''
  uploadSuccess.value = ''

  if (!youtubeVideo.value) {
    metadataError.value = 'No YouTube video to push.'
    return
  }

  if (!trackOptions.value.length) {
    metadataError.value = 'No track metadata available. Fetch metadata first.'
    return
  }

  const selected = selectedMetadata.value
  if (!selected) {
    metadataError.value = 'Select a track before pushing.'
    return
  }

  const { track, artist, source } = selected

  if (!track.image) {
    metadataError.value = 'Artwork is required before pushing to Eden.'
    return
  }

  if (!EdenGateway.value) {
    metadataError.value = 'Gateway URL is not configured.'
    return
  }

  isPushing.value = true

  const payload = {
    url: youtubeVideo.value.url,
    source,
    artist: {
      name: artist.name,
      bio: artist.bio ?? undefined,
      avatarUrl: artist.avatarUrl ?? track.image,
      spotifyUri: artist.spotifyUri ?? undefined,
      followers: artist.followers ?? undefined,
      popularity: artist.popularity ?? undefined,
    },
    track: {
      title: track.title,
      duration: track.duration ?? undefined,
      isrc: track.isrc ?? undefined,
      genre: track.genre ?? undefined,
      explicit: track.explicit ?? false,
      image: track.image,
      // albumImageUrl: track.albumImageUrl ?? track.image,
      album: track.album ?? undefined,
      spotifyTrackId: track.spotifyTrackId ?? undefined,
      spotifyUri: track.spotifyUri ?? undefined,
    },
  }

  console.log('[Eden Popup] pushing payload', payload)

  fetch(`${EdenGateway.value}/api/jobs/downloader`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
    .then(async (res) => {
      console.log('[Eden Popup] gateway response status', res.status)
      if (!res.ok) {
        const text = await res.text()
        console.error('[Eden Popup] gateway error body', text)
        throw new Error(text || `Request failed with status ${res.status}`)
      }
      return res.json()
    })
    .then(() => {
      console.log('[Eden Popup] Push succeeded')
      uploadSuccess.value = 'Upload completed successfully.'
    })
    .catch((err) => {
      console.error('[Eden Popup] Push failed:', err)
      metadataError.value = 'Push failed. Please try again.'
      uploadSuccess.value = ''
    })
    .finally(() => {
      isPushing.value = false
    })
}

function handleOpenSpotify(uri?: string) {
  if (!uri) return
  if (typeof window !== 'undefined') {
    window.open(uri, '_blank')
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
        // Reload YouTube video data from messaging after a short delay
        setTimeout(async () => {
          await fetchYouTubeVideoViaMessaging()
          isLoading.value = false
        }, 1500)
         
        console.log('[Eden Popup] Refreshing video info for tab:', tab.id)
      }
    } catch (error) {
      console.error('[Eden Popup] Failed to refresh:', error)
      isLoading.value = false
    }
  } else {
    // Just reload via messaging if chrome API not available
    await fetchYouTubeVideoViaMessaging()
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
