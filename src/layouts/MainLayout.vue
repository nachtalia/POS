<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-white text-grey-8">
      <q-toolbar class="q-py-xs">
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <div class="row items-center q-ml-md">
          <div class="text-weight-bold text-subtitle1 gt-xs text-primary">
            {{ settings?.systemName || 'Quasar System' }}
          </div>
        </div>

        <q-space />

        <div class="row items-center no-wrap q-gutter-x-md q-mr-sm">
          <q-separator vertical inset class="gt-xs" />

          <div class="row items-center cursor-pointer">
            <div class="column items-end q-mr-sm gt-xs">
              <div class="text-weight-bold text-body2">{{ currentUserName }}</div>
              <div class="text-caption text-grey-6" style="line-height: 10px">
                {{ currentUserRole.toUpperCase() }}
              </div>
            </div>

            <q-avatar size="36px" class="bg-primary text-white shadow-1">
              <span class="text-weight-medium">{{ userInitials }}</span>
              <q-badge
                floating
                color="positive"
                rounded
                style="
                  border: 2px solid white;
                  top: 26px;
                  right: -2px;
                  width: 10px;
                  height: 10px;
                  padding: 0;
                "
              />
            </q-avatar>

            <q-menu fit anchor="bottom right" self="top right">
              <q-list style="min-width: 150px">
                <q-item clickable v-close-popup>
                  <q-item-section>Profile</q-item-section>
                </q-item>
                <q-separator />
                <q-item clickable v-close-popup @click="onLogout">
                  <q-item-section class="text-negative">Sign Out</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </div>
        </div>
      </q-toolbar>
    </q-header>

    <TheSidebar v-model="leftDrawerOpen" />

    <q-page-container class="bg-grey-1">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { storeToRefs } from 'pinia'
import TheSidebar from 'components/SidebarComponent.vue'

// Import Stores & Services
import { useAuthStore } from 'src/features/index.js'
import { useSystemSettingsStore } from 'src/stores/systemSettingsStore'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { auth, db } from 'src/services/firebase'

const $q = useQuasar()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const systemSettingsStore = useSystemSettingsStore()

const { settings } = storeToRefs(systemSettingsStore)

// State
const leftDrawerOpen = ref(true)
const currentUserName = ref('Loading...')
const currentUserEmail = ref('...')
const currentUserRole = ref('')
const fetchedPermissions = ref([])

// Computed
const userInitials = computed(() => {
  if (currentUserName.value === 'Loading...' || !currentUserName.value) return 'U'
  return currentUserName.value.charAt(0).toUpperCase()
})

const isSuperAdmin = computed(() => {
  const role = currentUserRole.value.toLowerCase()
  return role === 'admin' || role === 'superadmin'
})

// Drawer Logic
watch(
  () => route.fullPath,
  () => {
    leftDrawerOpen.value = true
  },
)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

// Authentication & Data Fetching Logic
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

          // Populate Global Store so Sidebar can access it
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
      fetchedPermissions.value = []
    }
  } catch (e) {
    console.error('Error fetching permissions', e)
  }
}

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
