<template>
  <router-view />
</template>

<script setup>
import { onMounted, computed } from 'vue'
import { useMeta } from 'quasar'
import { useSystemSettingsStore } from 'src/stores/systemSettingsStore' // Check if filename is correct

const systemStore = useSystemSettingsStore()

const DEFAULT_FALLBACK_ICON = 'icons/favicon-32x32.png'

// 1. Fetch settings when the App mounts (globally)
onMounted(async () => {
  await systemStore.fetchSettings()
})

// 2. Compute the System Name and Logo (Logic copied from Login)
const systemName = computed(() => {
  return systemStore.settings?.systemName || 'POS System'
})

const displayLogo = computed(() => {
  // Logic: Try System Logo -> Try Default Logo -> Fallback
  return (
    systemStore.settings?.systemLogo || systemStore.settings?.defaultLogo || DEFAULT_FALLBACK_ICON
  )
})

// 3. Apply to Browser Tab (Title & Favicon)
useMeta(() => {
  return {
    // Sets the browser tab title
    title: systemName.value,

    // Sets the browser tab icon (favicon)
    link: {
      icon: {
        type: 'image/png',
        rel: 'icon',
        href: displayLogo.value,
      },
    },
  }
})
</script>
