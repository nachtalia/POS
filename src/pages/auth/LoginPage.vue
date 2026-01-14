<template>
  <q-page class="window-height window-width bg-grey-2">
    <div class="column items-center justify-center full-height">
      <q-card shadow-10 bordered class="glass-card q-pa-xl" style="max-width: 420px; width: 100%">
        <div class="row justify-center q-mb-md">
          <q-avatar size="80px" class="bg-white">
            <img src="https://cdn.quasar.dev/logo-v2/svg/logo.svg" alt="Company Logo" />
          </q-avatar>
        </div>

        <div class="text-h6 text-center q-mb-xs text-weight-bold">Welcome back</div>
        <div class="text-caption text-center q-mb-lg text-grey-7">Sign in to continue</div>

        <q-form @submit="onEmailSubmit" class="q-gutter-y-md">
          <q-input
            v-model="email"
            label="Email Address"
            dense
            class="input-underline"
            :class="{ 'validation-error': isEmailError, 'validation-success': isEmailSuccess }"
            color="primary"
            :disable="loading"
          >
            <template v-slot:prepend>
              <q-icon name="email" />
            </template>
            <template v-slot:append>
              <q-icon name="check_circle" color="positive" v-if="isEmailSuccess" />
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

          <div class="column items-center q-mt-lg">
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
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

// Firebase Imports (Removed signInAnonymously)
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from 'src/services/firebase'

const router = useRouter()
const $q = useQuasar()

// State
const email = ref('')
const password = ref('')
const isPwdHidden = ref(true)
const loading = ref(false)

// Validation Logic
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isEmailSuccess = computed(() => {
  return email.value.length > 0 && emailPattern.test(email.value)
})

const isEmailError = computed(() => {
  return email.value.length > 0 && !emailPattern.test(email.value)
})

// --- Email/Password Login Logic ---
const onEmailSubmit = async () => {
  if (!email.value || !password.value) {
    $q.notify({ type: 'warning', message: 'Please enter email and password' })
    return
  }

  loading.value = true

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value)

    console.log('Login successful:', userCredential.user.uid)

    $q.notify({
      color: 'positive',
      message: 'Login successful!',
      icon: 'check',
      position: 'top',
    })

    router.push('/ordering')
  } catch (error) {
    console.error('Login Error:', error.code)

    let msg = 'Login failed. Please try again.'
    if (error.code === 'auth/invalid-credential') msg = 'Invalid email or password.'
    if (error.code === 'auth/user-not-found') msg = 'Account not found.'
    if (error.code === 'auth/wrong-password') msg = 'Incorrect password.'
    if (error.code === 'auth/too-many-requests')
      msg = 'Too many attempts. Account temporarily locked.'
    if (error.code === 'auth/invalid-email') msg = 'Invalid email format.'

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
