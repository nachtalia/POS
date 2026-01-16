<template>
  <q-drawer v-model="model" show-if-above :width="280" class="bg-grey-1">
    <div class="column full-height no-wrap">
      <div class="q-pa-md q-pt-lg">
        <div class="row justify-center q-mb-lg">
          <img
            :src="displayedLogo"
            alt="System Logo"
            class="shadow-3"
            style="height: 100px; width: 100px; object-fit: cover; border-radius: 50%"
          />
        </div>
        <q-card flat bordered class="bg-white rounded-borders">
          <q-item class="q-py-sm">
            <q-item-section avatar>
              <q-avatar size="40px" class="bg-grey-3 text-grey-8">
                <span class="text-weight-bold">{{ userInitials }}</span>
                <q-badge
                  floating
                  color="green"
                  rounded
                  transparent
                  style="top: 30px; right: 0px; width: 10px; height: 10px; padding: 0"
                />
              </q-avatar>
            </q-item-section>

            <q-item-section>
              <q-item-label class="text-weight-bold text-grey-9">
                {{ currentUserName }}
              </q-item-label>
              <q-item-label caption class="text-grey-7" style="font-size: 0.75rem">
                {{ currentUserEmail }}
              </q-item-label>
              <q-item-label caption class="text-primary text-weight-bold" style="font-size: 0.7rem">
                {{ currentUserRole.toUpperCase() }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-card>
      </div>

      <q-scroll-area class="col fit">
        <q-list padding class="text-grey-8">
          <q-item-label
            header
            class="text-uppercase text-weight-bold text-grey-6 q-pl-md"
            style="font-size: 0.7rem; letter-spacing: 1px"
          >
            Quick Access
          </q-item-label>

          <div class="q-px-sm">
            <SidebarItems
              v-for="(route, index) in quickAccessRoutes"
              :key="index"
              :name="route.name"
              :label="route.meta.label"
              :caption="route.meta.caption"
              :icon="route.meta.icon"
              :meta="route.meta"
            />
          </div>

          <div v-if="managementRoutes.length > 0" class="q-mt-md">
            <q-item-label
              header
              class="text-uppercase text-weight-bold text-grey-6 q-pl-md"
              style="font-size: 0.7rem; letter-spacing: 1px"
            >
              Management
            </q-item-label>

            <div class="q-px-sm">
              <SidebarItems
                v-for="(route, index) in managementRoutes"
                :key="index"
                :name="route.name"
                :label="route.meta.label"
                :caption="route.meta.caption"
                :icon="route.meta.icon"
                :meta="route.meta"
              />
            </div>
          </div>
        </q-list>
      </q-scroll-area>

      <div class="q-pa-md bg-grey-2">
        <q-btn
          unelevated
          outline
          color="negative"
          class="full-width q-mb-sm"
          no-caps
          @click="onLogout"
        >
          <q-icon left name="logout" size="18px" />
          <div>Sign Out</div>
        </q-btn>

        <div class="text-center">
          <div class="text-caption text-grey-5">v1.0.0</div>
        </div>
      </div>
    </div>
  </q-drawer>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { storeToRefs } from 'pinia'
import _ from 'lodash'

import { SidebarItems } from 'src/shared'
import { useAuthStore } from 'src/features/index.js'
import { useSystemSettingsStore } from 'src/stores/systemSettingsStore'

import { signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { auth, db } from 'src/services/firebase'

const model = defineModel()
const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()
const systemSettingsStore = useSystemSettingsStore()

const { settings } = storeToRefs(systemSettingsStore)

const currentUserName = ref('Loading...')
const currentUserEmail = ref('...')
const currentUserRole = ref('')
const fetchedPermissions = ref([])

const userInitials = computed(() => {
  if (currentUserName.value === 'Loading...' || !currentUserName.value) return 'U'
  return currentUserName.value.charAt(0).toUpperCase()
})

const isSuperAdmin = computed(() => {
  const role = currentUserRole.value.toLowerCase()
  return role === 'admin' || role === 'superadmin'
})

const displayedLogo = computed(() => {
  return (
    settings.value?.systemLogo ||
    settings.value?.defaultLogo ||
    'https://cdn.quasar.dev/logo-v2/svg/logo.svg'
  )
})

onMounted(() => {
  if (!settings.value) {
    systemSettingsStore.fetchSettings()
  }

  onAuthStateChanged(auth, async (authUser) => {
    if (authUser) {
      currentUserEmail.value = authUser.email

      try {
        const q = query(collection(db, 'user'), where('email', '==', authUser.email))
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data()
          currentUserName.value = userData.username || 'User'
          currentUserRole.value = userData.role || 'staff'

          if (authStore.setUser) {
            authStore.setUser({
              uid: authUser.uid,
              email: authUser.email,
              ...userData,
            })
          }

          if (!isSuperAdmin.value) {
            if (Array.isArray(userData.permissions) && userData.permissions.length > 0) {
              fetchedPermissions.value = userData.permissions
              if (authStore.setPermissions) {
                authStore.setPermissions(userData.permissions)
              }
            } else {
              await fetchRolePermissions(currentUserRole.value)
            }
          }
        } else {
          currentUserName.value = 'User (No Profile)'
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
      }
    } else {
      currentUserName.value = 'Guest'
      currentUserRole.value = ''
      fetchedPermissions.value = []
      router.replace('/')
    }
  })
})

const fetchRolePermissions = async (roleName) => {
  try {
    const roleRef = doc(db, 'roles', roleName)
    const roleSnap = await getDoc(roleRef)

    if (roleSnap.exists()) {
      fetchedPermissions.value = roleSnap.data().permissions || []

      if (authStore.setPermissions) {
        authStore.setPermissions(fetchedPermissions.value)
      }
    } else {
      console.warn(`Role definition for '${roleName}' not found in DB.`)
      fetchedPermissions.value = []
    }
  } catch (e) {
    console.error('Error fetching permissions', e)
  }
}

const canAccess = (route) => {
  if (isSuperAdmin.value) return true
  if (!route.meta?.permissions && !route.meta?.roles) return true

  if (route.meta?.roles) {
    if (route.meta.roles.includes(currentUserRole.value)) return true
  }

  if (route.meta?.permissions) {
    const effectivePerms = Array.isArray(authStore.permissions) && authStore.permissions.length > 0
      ? authStore.permissions
      : fetchedPermissions.value
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
.q-item--active {
  color: $primary;
  font-weight: 600;
  border-radius: 8px;
  background: lighten($primary, 45%);
}
.q-item--active .q-icon {
  color: $primary;
}
</style>
