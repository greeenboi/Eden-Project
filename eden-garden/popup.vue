<template>
  <div class="p-4 container">
    <Card class="shadow-lg">
      <template #header>
        <div class="flex items-center gap-2 p-4 pb-0">
          <i class="pi pi-music text-2xl text-primary"></i>
          <h2 class="text-xl font-semibold m-0">Eden Music</h2>
        </div>
      </template>
      <template #content>
        <div class="flex flex-col gap-4">
          <div class="flex items-center gap-2">
            <i class="pi pi-link text-muted"></i>
            <span class="text-sm text-muted">{{ currentUrl }}</span>
          </div>
          
          <Button 
            label="Upload to Eden" 
            icon="pi pi-cloud-upload" 
            class="w-full"
            severity="primary"
            @click="handleUpload"
            v-ripple
          />
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import Aura from '@primeuix/themes/dist/aura';
import 'primeicons/primeicons.css';
import Button from 'primevue/button';
import Card from 'primevue/card';
import PrimeVue from 'primevue/config';
import Ripple from 'primevue/ripple';
import { onMounted, ref } from "vue";
import "./style.css";

type ChromeTab = { url?: string }
type ChromeTabs = { query: (queryInfo: { active: boolean; currentWindow: boolean }) => Promise<ChromeTab[]> }
type ChromeAPI = { tabs?: ChromeTabs }

const currentUrl = ref('')

onMounted(async () => {
  // Get current tab URL for Chrome extension
  if (typeof window !== 'undefined' && (window as Window & { chrome?: ChromeAPI }).chrome?.tabs) {
    const w = window as Window & { chrome?: ChromeAPI }
    // biome-ignore lint/correctness/noUnsafeOptionalChaining: L
    const [tab] = await w.chrome?.tabs?.query({ active: true, currentWindow: true })
    currentUrl.value = tab?.url || 'No URL available'
  } else {
    currentUrl.value = 'Extension context not available'
  }
})

function handleUpload() {
  // Handle upload logic here
  console.log('Uploading from:', currentUrl.value)
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
