<template>
  <q-page class="bg-blue-grey-1 flex flex-center no-scroll overflow-hidden">
    <div class="column full-width q-px-md" style="max-width: 1000px; height: 75vh">
      <div class="col-auto q-mb-md">
        <div class="row items-center">
          <q-icon name="style" size="sm" color="primary" class="q-mr-xs" />
          <div>
            <div class="text-h5 text-weight-bolder text-blue-grey-10">Store Branding</div>
            <div class="text-caption text-grey-7">
              Configure your visual identity and global pricing rules
            </div>
          </div>
        </div>
      </div>

      <div class="col row q-col-gutter-md overflow-hidden">
        <div class="col-12 col-md-5 column">
          <q-card class="col shadow-1 bg-white q-pa-md border-radius-lg column">
            <div class="text-overline text-primary text-weight-bold q-mb-sm">Logo Assets</div>

            <div
              class="col upload-zone column items-center justify-center text-center cursor-pointer relative-position"
              :class="{ 'is-dragging': draggingActive, 'is-invalid': invalidActive }"
              @dragover.prevent="draggingActive = true"
              @dragleave.prevent="draggingActive = false"
              @drop.prevent="onDropActive"
              @click="$refs.activeFileInput.pickFiles()"
            >
              <q-avatar size="100px" class="q-mb-sm shadow-1 bg-grey-1">
                <q-img :src="previewActive || form.defaultLogo" fit="contain" />
              </q-avatar>
              <div class="text-weight-bold text-blue-grey-9 text-caption">Active System Logo</div>
              <div
                class="row items-center justify-center text-grey-6 q-gutter-xs"
                style="font-size: 10px"
              >
                <q-icon name="cloud_upload" size="14px" />
                <span>Change Photo</span>
              </div>
              <q-btn
                v-if="form.systemLogo"
                flat
                round
                color="negative"
                icon="delete_outline"
                size="sm"
                class="absolute-top-right q-ma-xs z-top"
                @click.stop="clearActiveLogo"
              />
            </div>

            <q-separator class="q-my-md" />

            <div
              class="col upload-zone column items-center justify-center text-center cursor-pointer relative-position"
              :class="{ 'is-dragging': draggingDefault, 'is-invalid': invalidDefault }"
              @dragover.prevent="draggingDefault = true"
              @dragleave.prevent="draggingDefault = false"
              @drop.prevent="onDropDefault"
              @click="$refs.defaultFileInput.pickFiles()"
            >
              <q-avatar size="70px" class="q-mb-xs bg-grey-2 shadow-1">
                <q-img
                  :src="previewDefault || 'https://cdn.quasar.dev/logo-v2/svg/logo.svg'"
                  fit="contain"
                />
              </q-avatar>
              <div class="text-weight-bold text-blue-grey-9" style="font-size: 11px">
                Fallback Default
              </div>
              <q-btn
                v-if="previewDefaultUrl || form.defaultLogo"
                flat
                round
                color="negative"
                icon="delete_outline"
                size="sm"
                class="absolute-top-right q-ma-xs z-top"
                @click.stop="clearDefaultLogo"
              />
            </div>

            <q-file
              ref="activeFileInput"
              v-model="activeFile"
              class="hidden"
              accept=".jpg, .jpeg, .png"
              @update:model-value="handleActiveUpload"
            />
            <q-file
              ref="defaultFileInput"
              v-model="defaultFile"
              class="hidden"
              accept=".jpg, .jpeg, .png"
              @update:model-value="handleDefaultUpload"
            />
          </q-card>
        </div>

        <div class="col-12 col-md-7 column">
          <q-card class="col shadow-1 bg-white q-pa-lg border-radius-lg column">
            <q-form @submit="onSubmit" class="column full-height">
              <div class="text-overline text-primary text-weight-bold q-mb-sm">System Identity</div>

              <div class="q-gutter-y-sm q-mb-lg">
                <q-input
                  v-model="form.systemName"
                  label="Display Name"
                  outlined
                  dense
                  stack-label
                  placeholder="Enter shop name"
                  :rules="[(val) => !!val || 'Required']"
                >
                  <template v-slot:prepend>
                    <q-icon name="storefront" color="primary" size="xs" />
                  </template>
                </q-input>
              </div>

              <div class="text-overline text-teal text-weight-bold q-mb-sm">Order Defaults</div>

              <div class="row q-col-gutter-md q-mb-md">
                <div class="col-6">
                  <q-input
                    v-model.number="form.defaultTax"
                    label="Sales Tax"
                    type="number"
                    outlined
                    dense
                    stack-label
                    suffix="%"
                    :rules="[(val) => val >= 0 || 'Invalid']"
                  >
                    <template v-slot:prepend>
                      <q-icon name="percent" color="teal" size="xs" />
                    </template>
                  </q-input>
                </div>

                <div class="col-6">
                  <q-input
                    v-model.number="form.defaultDiscount"
                    label="Standard Discount"
                    type="number"
                    outlined
                    dense
                    stack-label
                    suffix="%"
                    :rules="[(val) => val >= 0 || 'Invalid']"
                  >
                    <template v-slot:prepend>
                      <q-icon name="savings" color="orange-8" size="xs" />
                    </template>
                  </q-input>
                </div>
              </div>

              <div class="info-banner q-pa-sm row no-wrap items-start q-mb-md">
                <q-icon name="tips_and_updates" color="blue-7" size="xs" class="q-mr-sm q-mt-xs" />
                <div style="font-size: 11px" class="text-blue-grey-8">
                  <b>Tip:</b> Defaults will auto-populate the checkout page but can be adjusted
                  per-order by authorized staff.
                </div>
              </div>

              <div class="row justify-end q-mt-auto">
                <q-btn
                  label="Update Settings"
                  type="submit"
                  color="primary"
                  unelevated
                  class="q-px-xl border-radius-md"
                  :loading="store.loading"
                />
              </div>
            </q-form>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useSystemSettingsStore } from 'src/stores/systemSettingsStore'
import { SystemSettingsModel } from 'src/services/models/SystemSettings.js'

const $q = useQuasar()
const store = useSystemSettingsStore()

// Initialize form using the Model defaults
const form = reactive({
  ...new SystemSettingsModel(),
})

const activeFile = ref(null)
const defaultFile = ref(null)
const previewActiveUrl = ref(null)
const previewDefaultUrl = ref(null)

const draggingActive = ref(false)
const draggingDefault = ref(false)
const invalidActive = ref(false)
const invalidDefault = ref(false)

const previewActive = computed(() => previewActiveUrl.value || form.systemLogo)
const previewDefault = computed(() => previewDefaultUrl.value || form.defaultLogo)

const isValidFormat = (file) => {
  if (!file) return true
  const allowed = ['image/jpeg', 'image/jpg', 'image/png']
  return allowed.includes(file.type)
}

const triggerError = (type) => {
  if (type === 'active') {
    invalidActive.value = true
    setTimeout(() => (invalidActive.value = false), 2000)
  } else {
    invalidDefault.value = true
    setTimeout(() => (invalidDefault.value = false), 2000)
  }
}

const processFile = (file, target) => {
  if (!file || !isValidFormat(file)) {
    triggerError(target)
    return
  }

  const preview = URL.createObjectURL(file)
  if (target === 'active') previewActiveUrl.value = preview
  else previewDefaultUrl.value = preview

  const reader = new FileReader()
  reader.onload = (e) => {
    if (target === 'active') form.systemLogo = e.target.result
    else form.defaultLogo = e.target.result
  }
  reader.readAsDataURL(file)
}

const handleActiveUpload = (file) => processFile(file, 'active')
const handleDefaultUpload = (file) => processFile(file, 'default')

const onDropActive = (e) => {
  draggingActive.value = false
  const file = e.dataTransfer.files[0]
  processFile(file, 'active')
}

const onDropDefault = (e) => {
  draggingDefault.value = false
  const file = e.dataTransfer.files[0]
  processFile(file, 'default')
}

const clearActiveLogo = () => {
  activeFile.value = null
  previewActiveUrl.value = null
  form.systemLogo = null
}

const clearDefaultLogo = () => {
  defaultFile.value = null
  previewDefaultUrl.value = null
  form.defaultLogo = 'https://cdn.quasar.dev/logo-v2/svg/logo.svg'
}

const onSubmit = async () => {
  await store.saveSettings(form)
  $q.notify({
    type: 'positive',
    message: 'System configuration saved',
    position: 'top',
    timeout: 1500,
  })
}

// Fetch data on mount
onMounted(async () => {
  await store.fetchSettings()

  if (store.settings) {
    // This populates System Name, Logs, Tax, and Discount automatically
    Object.assign(form, store.settings)
  }
})
</script>

<style scoped>
.no-scroll {
  overflow: hidden !important;
}
.border-radius-lg {
  border-radius: 12px;
}
.border-radius-md {
  border-radius: 8px;
}

.upload-zone {
  border: 1.5px dashed #cbd5e0;
  border-radius: 12px;
  transition: all 0.2s ease;
  background-color: #f8fafc;
}

.upload-zone:hover,
.is-dragging {
  border-color: var(--q-primary);
  background-color: #ebf8ff;
}

.is-invalid {
  border-color: var(--q-negative) !important;
  background-color: #fff5f5 !important;
}

.info-banner {
  background: #f0f7ff;
  border-radius: 8px;
  border: 1px solid #d1e6ff;
}

.z-top {
  z-index: 10;
}
</style>
