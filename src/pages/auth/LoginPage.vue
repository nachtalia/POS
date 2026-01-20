<template>
  <q-page class="window-height window-width bg-grey-2">
    <div class="column items-center justify-center full-height">
      <q-card shadow-10 bordered class="glass-card q-pa-xl" style="max-width: 420px; width: 100%">
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
// ADDED: doc, getDoc
import { signInWithEmailAndPassword } from 'firebase/auth'
import { collection, getDocs, getDoc, doc, query, where, limit } from 'firebase/firestore'
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
  // 1. Client-side Validation
  if (!identifier.value || !password.value) {
    $q.notify({ type: 'warning', message: 'Please enter email/username and password' })
    return
  }

  loading.value = true

  try {
    let loginEmail = identifier.value

    // 2. Resolve Username to Email (if user typed a username)
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

    console.log('Firebase Auth successful. UID:', user.uid)

    // 4. Fetch User Role/Profile from Firestore
    // FIX: Try to get document by UID first (Best Practice), then fallback to Email search
    let userData = null

    // Attempt A: Direct lookup by UID (Fastest & Most Reliable)
    const userDocRef = doc(db, 'user', user.uid)
    const userDocSnap = await getDoc(userDocRef)

    if (userDocSnap.exists()) {
      userData = userDocSnap.data()
    } else {
      // Attempt B: Search by Email (Fallback if Doc ID != UID)
      const emailQuery = query(collection(db, 'user'), where('email', '==', user.email), limit(1))
      const emailSnap = await getDocs(emailQuery)
      if (!emailSnap.empty) {
        userData = emailSnap.docs[0].data()
      }
    }

    let userRole = 'staff' // Default if nothing found
    let currentUsername = 'User'
    let userPermissions = []

    if (userData) {
      // READ THE ROLE CORRECTLY
      userRole = userData.role || 'staff'
      currentUsername = userData.username || 'User'

      // --- PERMISSIONS LOGIC ---
      if (userRole === 'superadmin') {
        userPermissions = ['*'] // Use Wildcard, Router handles the rest
      } else {
        userPermissions = userData.permissions || []
      }
    }

    // 5. Populate Store
    authStore.setUser({
      uid: user.uid,
      email: user.email,
      role: userRole,
      username: currentUsername,
    })
    authStore.setPermissions(userPermissions)

    // 6. Notify
    $q.notify({
      color: 'positive',
      message: `Welcome back, ${currentUsername}! (${userRole})`,
      icon: 'check',
      position: 'top',
    })

    // 7. Redirect
    if (['admin', 'superadmin'].includes(userRole)) {
      router.push({ name: 'Dashboard' })
    } else if (userPermissions.includes('ordering:view')) {
      router.push({ name: 'Ordering' })
    } else {
      router.push({ name: 'Dashboard' })
    }
  } catch (error) {
    console.error('Login Error:', error)

    let msg = 'Login failed. Please try again.'
    if (error.code === 'auth/invalid-credential') msg = 'Invalid email or password.'
    if (error.code === 'custom/username-not-found') msg = 'Username not found.'

    $q.notify({
      color: 'negative',
      message: msg,
      icon: 'report_problem',
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
