<template>
  <q-drawer v-model="model" show-if-above :width="280" bordered class="bg-white">
    <div class="column full-height no-wrap">
      <div class="q-pa-md">
        <div class="row justify-center">
          <div class="logo-container">
            <img
              :src="displayedLogo"
              alt="System Logo"
              class="shadow-2"
              style="height: 100px; width: 100px; object-fit: cover; border-radius: 50%"
            />
          </div>
          <div class="text-h6 q-mt-md text-bold text-primary text-center">
            {{ systemName }}
          </div>
        </div>
      </div>

      <q-separator spaced />

      <q-scroll-area class="col fit">
        <q-list padding class="text-grey-8 q-px-sm">
          <div class="q-mt-sm">
            <q-item-label
              header
              class="text-uppercase text-weight-bolder text-grey-5 q-pl-md q-pb-sm"
              style="font-size: 0.65rem; letter-spacing: 1.2px"
            >
              Menu
            </q-item-label>

            <SidebarItems
              v-for="(route, index) in quickAccessRoutes"
              :key="'qa-' + index"
              :name="route.name"
              :label="route.meta.label"
              :caption="route.meta.caption"
              :icon="route.meta.icon"
              :meta="route.meta"
            />
          </div>

          <div v-if="managementRoutes.length > 0" class="q-mt-md">
            <q-separator spaced inset class="q-mb-md" />

            <q-item-label
              header
              class="text-uppercase text-weight-bolder text-grey-5 q-pl-md q-pb-sm"
              style="font-size: 0.65rem; letter-spacing: 1.2px"
            >
              Management
            </q-item-label>

            <SidebarItems
              v-for="(route, index) in managementRoutes"
              :key="'mgmt-' + index"
              :name="route.name"
              :label="route.meta.label"
              :caption="route.meta.caption"
              :icon="route.meta.icon"
              :meta="route.meta"
            />
          </div>
        </q-list>
      </q-scroll-area>

      <div class="q-pa-md bg-white" style="border-top: 1px solid #e0e0e0">
        <q-btn
          unelevated
          outline
          color="grey-5"
          text-color="negative"
          class="full-width q-mb-xs logout-btn"
          no-caps
          @click="onLogout"
        >
          <q-icon left name="logout" size="18px" />
          <div class="text-weight-medium">Sign Out</div>
        </q-btn>

        <div class="text-center q-mt-sm">
          <div class="text-caption text-grey-4">v1.0.0</div>
        </div>
      </div>
    </div>
  </q-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { storeToRefs } from 'pinia'
import _ from 'lodash'

import { SidebarItems } from 'src/shared'
import { useAuthStore } from 'src/features/index.js'
import { useSystemSettingsStore } from 'src/stores/systemSettingsStore'
import { signOut } from 'firebase/auth'
import { auth } from 'src/services/firebase'

const model = defineModel()
const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()
const systemSettingsStore = useSystemSettingsStore()

const { settings } = storeToRefs(systemSettingsStore)

const systemName = computed(() => {
  return systemSettingsStore.settings?.systemName || 'POS System'
})

// Fetching Logic Removed (Handled by MainLayout now)

const displayedLogo = computed(() => {
  return (
    settings.value?.systemLogo ||
    settings.value?.defaultLogo ||
    'https://cdn.quasar.dev/logo-v2/svg/logo.svg'
  )
})

// Get Current Role/Permissions directly from Store (reactive)
const currentUserRole = computed(() => authStore.user?.role || '')
const isSuperAdmin = computed(() => {
  const role = currentUserRole.value.toLowerCase()
  return role === 'admin' || role === 'superadmin'
})

const canAccess = (route) => {
  if (isSuperAdmin.value) return true
  if (!route.meta?.permissions && !route.meta?.roles) return true

  // Role Check
  if (route.meta?.roles) {
    if (route.meta.roles.includes(currentUserRole.value)) return true
  }

  // Permission Check
  if (route.meta?.permissions) {
    const effectivePerms = authStore.permissions || []
    const userPermsLower = effectivePerms.map((p) => String(p).toLowerCase())

    const hasPermission = route.meta.permissions.some((requiredPerm) => {
      const permLower = String(requiredPerm).toLowerCase()
      if (userPermsLower.includes(permLower)) return true
      const resource = permLower.split(':')[0]
      return userPermsLower.some((p) => p.startsWith(resource + ':'))
    })
    return hasPermission
  }

  return false
}

const allRoutes = router.getRoutes()

const quickAccessRoutes = computed(() => {
  return _.filter(
    allRoutes,
    (route) => route.meta.isSidebarItem && !route.meta.isManagement && canAccess(route),
  )
})

const managementRoutes = computed(() => {
  return _.filter(
    allRoutes,
    (route) => route.meta.isSidebarItem && route.meta.isManagement && canAccess(route),
  )
})

const onLogout = async () => {
  $q.loading.show({ message: 'Signing out...' })
  try {
    await signOut(auth)
    authStore.$reset()
    router.replace('/')
  } catch (error) {
    console.error('Logout Error:', error)
    $q.notify({ color: 'negative', message: 'Failed to sign out', icon: 'warning' })
  } finally {
    $q.loading.hide()
  }
}
</script>

<style lang="scss">
@use 'sass:color';

.q-item--active {
  color: $primary;
  background: color.adjust($primary, $lightness: 48%);
  font-weight: 600;
  border-radius: 8px;
  position: relative;
  &:before {
    content: '';
    position: absolute;
    left: 0;
    top: 15%;
    height: 70%;
    width: 3px;
    background: $primary;
    border-radius: 0 4px 4px 0;
  }
}

.q-item--active .q-icon {
  color: $primary;
}

.logo-container img {
  border: 3px solid #f5f5f5;
}

.logout-btn:hover {
  background: #fff5f5 !important;
  border-color: $negative !important;
}
</style>
