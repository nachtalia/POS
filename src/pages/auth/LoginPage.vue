<template>
  <q-page class="window-height window-width bg-grey-2">
    <div class="column items-center justify-center full-height">
      <q-card
        shadow-10
        bordered
        class="glass-card"
        :class="$q.screen.gt.xs ? 'q-pa-xl' : 'q-pa-md'"
      >
        <div class="column items-center justify-center q-mb-md">
          <q-avatar size="100px" class="bg-white shadow-2 q-mb-md">
            <q-img
              :src="displayLogo"
              spinner-color="primary"
              alt="System Logo"
              fit="contain"
              style="height: 100%; width: 100%"
              @error="handleImageError"
            />
          </q-avatar>

          <div class="text-subtitle1 text-grey-8 text-center q-mb-xs">Welcome to</div>
          <div class="text-h5 text-weight-bold text-primary text-center q-mb-xs">
            {{ systemName }}
          </div>
          <div class="text-caption text-grey-7 text-center q-mb-lg">Please sign in to continue</div>
        </div>

        <q-form @submit="onLoginSubmit" class="q-gutter-y-md">
          <q-input
            v-model="identifier"
            label="Email or Username"
            dense
            class="input-underline"
            :class="{
              'validation-error': isIdentifierError,
              'validation-success': isIdentifierSuccess,
            }"
            color="primary"
            :disable="loading"
          >
            <template v-slot:prepend>
              <q-icon name="email" />
            </template>
            <template v-slot:append>
              <q-icon name="check_circle" color="positive" v-if="isIdentifierSuccess" />
            </template>
          </q-input>

          <q-input
            v-model="password"
            label="Password"
            dense
            :type="isPwdHidden ? 'password' : 'text'"
            class="input-underline"
            color="primary"
            :disable="loading"
          >
            <template v-slot:prepend>
              <q-icon name="lock" />
            </template>
            <template v-slot:append>
              <q-icon
                :name="isPwdHidden ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="isPwdHidden = !isPwdHidden"
              />
            </template>
          </q-input>

          <div class="column items-center q-mt-xl">
            <q-btn
              label="Login"
              type="submit"
              color="primary"
              rounded
              class="q-px-xl full-width"
              size="md"
              :loading="loading"
            />
          </div>
        </q-form>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

// 1. Import Stores
import { useSystemSettingsStore } from 'src/stores/systemSettingsStore'
import { useAuthStore } from 'src/features/index'

// 2. Firebase Imports
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  limit,
  setDoc,
  Timestamp,
} from 'firebase/firestore'
import { auth, db } from 'src/services/firebase'

const router = useRouter()
const $q = useQuasar()
const systemStore = useSystemSettingsStore()
const authStore = useAuthStore()

const identifier = ref('')
const password = ref('')
const isPwdHidden = ref(true)
const loading = ref(false)
const imgError = ref(false)

// Regex Patterns
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const usernamePattern = /^[a-zA-Z0-9_.]{3,30}$/
const DEFAULT_FALLBACK = 'https://cdn.quasar.dev/logo-v2/svg/logo.svg'

// --- Computed Properties ---
const displayLogo = computed(() => {
  if (imgError.value) return DEFAULT_FALLBACK
  return systemStore.settings?.systemLogo || systemStore.settings?.defaultLogo || DEFAULT_FALLBACK
})

const systemName = computed(() => {
  return systemStore.settings?.systemName || 'POS System'
})

const isIdentifierSuccess = computed(() => {
  if (!identifier.value) return false
  return emailPattern.test(identifier.value) || usernamePattern.test(identifier.value)
})

const isIdentifierError = computed(() => {
  if (!identifier.value) return false
  return !emailPattern.test(identifier.value) && !usernamePattern.test(identifier.value)
})

// --- Methods ---
const handleImageError = () => {
  imgError.value = true
}

onMounted(async () => {
  await systemStore.fetchSettings()
})

const onLoginSubmit = async () => {
  if (!identifier.value || !password.value) {
    $q.notify({ type: 'warning', message: 'Please enter email/username and password' })
    return
  }

  loading.value = true

  try {
    let loginEmail = identifier.value

    // 2. Resolve Username to Email
    if (!emailPattern.test(identifier.value)) {
      const q = query(collection(db, 'user'), where('username', '==', identifier.value), limit(1))
      const snap = await getDocs(q)

      if (snap.empty) throw { code: 'custom/username-not-found' }

      const userRecord = snap.docs[0].data()
      loginEmail = userRecord.email
      if (!loginEmail) throw { code: 'custom/invalid-user-record' }
    }

    // 3. Authenticate with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, loginEmail, password.value)
    const user = userCredential.user

    // 4. Fetch User Role/Profile from Firestore
    let userData = null
    const userDocRef = doc(db, 'user', user.uid)
    const userDocSnap = await getDoc(userDocRef)

    if (userDocSnap.exists()) {
      userData = userDocSnap.data()
    } else {
      const emailQuery = query(collection(db, 'user'), where('email', '==', user.email), limit(1))
      const emailSnap = await getDocs(emailQuery)
      if (!emailSnap.empty) {
        userData = emailSnap.docs[0].data()
      }
    }

    if (!userData) {
      const existing = await getDocs(query(collection(db, 'user'), limit(1)))
      if (existing.empty) {
        const payload = {
          uid: user.uid,
          email: user.email,
          username: user.email,
          role: 'admin',
          orgOwnerUid: user.uid,
          branchId: user.uid,
          permissions: [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }
        await setDoc(doc(db, 'user', user.uid), payload)
        userData = payload
      }
    }

    let userRole = 'staff'
    let normalizedRole = 'staff'
    let currentUsername = 'User'
    let userPermissions = []

    let orgOwnerUid = null
    let branchId = null

    if (userData) {
      userRole = userData.role || 'staff'
      currentUsername = userData.username || 'User'
      orgOwnerUid = userData.orgOwnerUid || null
      branchId = userData.branchId || null
      normalizedRole = String(userRole || '')
        .toLowerCase()
        .replace(/[\s_-]+/g, '')

      // --- PERMISSIONS LOGIC ---
      if (normalizedRole === 'superadmin') {
        userPermissions = ['*']
      } else {
        userPermissions = userData.permissions || []
      }
    }

    // --- NEW STEP: Permission Validation ---
    // Check if user is an Admin OR has at least one permission
    const isAdmin = ['admin', 'superadmin'].includes(normalizedRole)
    const hasAnyPermission = userPermissions && userPermissions.length > 0

    if (!isAdmin && !hasAnyPermission) {
      // 1. Force logout immediately so they aren't "logged in" in the background
      await signOut(auth)
      // 2. Throw custom error to stop execution
      throw { code: 'custom/no-permission' }
    }
    // ----------------------------------------

    // 5. Populate Store (Only happens if permission check passed)
    authStore.setUser({
      uid: user.uid,
      email: user.email,
      role: userRole,
      username: currentUsername,
      orgOwnerUid:
        orgOwnerUid || (['admin', 'superadmin'].includes(normalizedRole) ? user.uid : null),
    })
    if (!branchId && ['superadmin', 'admin'].includes(normalizedRole)) {
      branchId = user.uid
    }
    authStore.setBranchId(branchId)
    await authStore.fetchPermissions()
    userPermissions = authStore.permissions || []

    // 6. Notify
    $q.notify({
      color: 'positive',
      message: `Welcome back, ${currentUsername}!`,
      icon: 'check',
      position: 'top',
    })

    // 7. Redirect
    if (['admin', 'superadmin'].includes(normalizedRole)) {
      router.push({ name: 'Dashboard' })
    } else if (userPermissions.includes('ordering:view')) {
      router.push({ name: 'POS' })
    } else if (userPermissions.includes('inventory:view')) {
      router.push({ name: 'Inventory' })
    } else if (userPermissions.includes('transactions:view')) {
      router.push({ name: 'Transactions' })
    } else {
      // This fallback catches valid users who have weird permissions not listed above
      router.push({ name: 'Dashboard' })
    }
  } catch (error) {
    console.error('Login Error:', error)

    let msg = 'Login failed. Please try again.'
    let notifType = 'negative'
    let notifIcon = 'report_problem'

    if (error.code === 'auth/invalid-credential') msg = 'Invalid email or password.'
    if (error.code === 'custom/username-not-found') msg = 'Username not found.'

    // --- CUSTOM ERROR MESSAGE FOR NO PERMISSION ---
    if (error.code === 'custom/no-permission') {
      msg = 'Access Denied: Your account has no assigned permissions.'
      notifType = 'warning'
      notifIcon = 'block'
    }

    $q.notify({
      color: notifType,
      message: msg,
      icon: notifIcon,
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.glass-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
}
.input-underline :deep(.q-field__control) {
  background-color: transparent !important;
  padding-left: 0;
  padding-right: 0;
}
.input-underline :deep(.q-field__control:before) {
  border-bottom: 1px solid #ccc;
}
.input-underline :deep(.q-field__control:after) {
  height: 2px;
}
.validation-error :deep(.q-field__label) {
  color: #c10015;
}
.validation-error :deep(.q-field__control:after) {
  background: #c10015;
  transform: scaleX(1);
}
.validation-success :deep(.q-field__label) {
  color: #21ba45;
}
.validation-success :deep(.q-field__control:after) {
  background: #21ba45;
  transform: scaleX(1);
}
</style>
