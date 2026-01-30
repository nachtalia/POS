<template>
  <q-dialog v-model="localDialog" persistent position="right" full-height>
    <q-card class="column" style="width: 450px; max-width: 100vw; height: 100vh">
      <q-card-section class="row items-center justify-between bg-primary text-white q-py-md">
        <div class="text-h6">Add New User</div>
        <q-btn flat round dense icon="close" color="white" v-close-popup size="sm" />
      </q-card-section>

      <q-card-section class="col scroll q-pa-md">
        <div class="q-mb-md">
          <div class="text-subtitle2 text-weight-medium text-blue-grey-9 q-mb-sm">
            User Credentials
          </div>
          <div class="q-gutter-y-sm">
            <q-input
              outlined
              v-model="username"
              label="Username"
              dense
              lazy-rules
              :rules="[(val) => !!val || 'Required']"
            >
              <template v-slot:prepend><q-icon name="person" /></template>
            </q-input>
            <q-input
              outlined
              v-model="email"
              label="Email"
              type="email"
              dense
              :rules="[(val) => /.+@.+\..+/.test(val) || 'Invalid email']"
            >
              <template v-slot:prepend><q-icon name="email" /></template>
            </q-input>
            <q-input
              outlined
              v-model="password"
              label="Password"
              :type="showPassword ? 'text' : 'password'"
              dense
              :rules="[(val) => val.length >= 6 || 'Min 6 characters']"
            >
              <template v-slot:prepend><q-icon name="lock" /></template>
              <template v-slot:append>
                <q-icon
                  :name="showPassword ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  size="xs"
                  @click="showPassword = !showPassword"
                />
              </template>
            </q-input>
          </div>
        </div>

        <q-separator spaced />

        <div class="q-mb-md">
          <div class="text-subtitle2 text-weight-medium text-blue-grey-9 q-mb-xs">
            Quick Role Assignment
          </div>
          <q-select
            outlined
            dense
            v-model="selectedRole"
            :options="userRoles"
            label="Select Role Template"
            emit-value
            map-options
            @update:model-value="applyRoleTemplate"
            color="primary"
            bg-color="blue-grey-1"
          >
            <template v-slot:prepend><q-icon name="badge" /></template>
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section>
                  <q-item-label>{{ scope.opt.label }}</q-item-label>
                  <q-item-label caption v-if="scope.opt.permissions">
                    {{ scope.opt.permissions.length }} permissions
                  </q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
          <div class="text-caption text-grey-7 q-mt-xs">
            Selecting a role template will auto-fill permissions.
          </div>
        </div>

        <div class="q-mb-md">
          <div class="text-subtitle2 text-weight-medium text-blue-grey-9 q-mb-xs">
            Assigned Permissions
            <q-badge color="primary" class="q-ml-xs" :label="selectedPermissions.length" />
          </div>
          <div class="q-gutter-xs bg-grey-2 q-pa-sm rounded-borders" style="min-height: 50px">
            <q-chip
              v-for="perm in selectedPermissions"
              :key="perm"
              color="primary"
              text-color="white"
              dense
              removable
              @remove="removePermission(perm)"
            >
              {{ perm }}
            </q-chip>
            <div
              v-if="!selectedPermissions.length"
              class="text-caption text-grey-6 text-center q-pa-sm"
            >
              No permissions assigned yet
            </div>
          </div>
        </div>

        <q-separator spaced />

        <div class="q-mb-md">
          <div class="text-subtitle2 text-weight-medium text-blue-grey-9 q-mb-xs">
            Manual Customization
          </div>
          <div class="row q-col-gutter-xs q-mb-sm">
            <q-btn
              outline
              size="sm"
              color="primary"
              label="Select All"
              @click="selectAllPermissions"
              class="col"
            />
            <q-btn
              outline
              size="sm"
              color="grey"
              label="Clear All"
              @click="clearAllPermissions"
              class="col"
            />
          </div>

          <q-list bordered class="rounded-borders">
            <q-expansion-item
              v-for="(actions, page) in actionsByPage"
              :key="page"
              :label="page"
              header-class="bg-grey-1"
              expand-separator
            >
              <q-item v-for="action in actions" :key="action.value" dense>
                <q-item-section avatar>
                  <q-checkbox
                    v-model="selectedPermissions"
                    :val="action.value"
                    color="primary"
                    @update:model-value="selectedRole = null"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ action.label }}</q-item-label>
                  <q-item-label caption>{{ action.value }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-expansion-item>
          </q-list>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right" class="q-pa-md bg-grey-1">
        <q-btn flat label="Cancel" color="grey" v-close-popup class="q-px-lg" />
        <q-btn
          label="Create User"
          color="green-7"
          @click="submit"
          :disable="!isFormValid"
          :loading="loading"
          icon="person_add"
          class="q-px-lg"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useUserManagementStore } from 'src/stores/usermanagementStore.js'
import { useAuthStore } from 'src/features/index.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'add'])

const $q = useQuasar()
const userStore = useUserManagementStore()
const authStore = useAuthStore()

const localDialog = ref(props.modelValue)
const loading = ref(false)

// Form Fields
const username = ref('')
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const selectedRole = ref(null)
const selectedPermissions = ref([])

// --- Dynamic Role Definitions from Store ---
const userRoles = computed(() => {
  const base = userStore.roles.map((role) => ({
    label: role.label || role.name,
    value: role.value,
    description: role.description || '',
    permissions: role.permissions || [],
  }))
  return base
})

// --- Permissions Definitions (System Constants) ---
const actionsByPage = {
  Dashboard: [{ label: 'View Dashboard', value: 'dashboard:view' }],
  Products: [
    { label: 'View Product', value: 'inventory:view' },
    { label: 'Add Category', value: 'inventory:addCategory' },
    { label: 'Add Product', value: 'inventory:addProduct' },
    { label: 'Edit Product', value: 'inventory:editProduct' },
    { label: 'Delete Product', value: 'inventory:deleteProduct' },
  ],
  // --- ADDED ADDONS SECTION ---
  Addons: [
    { label: 'View Addons', value: 'addons:view' },
    { label: 'Add Addon', value: 'addons:create' },
    { label: 'Edit Addon', value: 'addons:edit' },
    { label: 'Delete Addon', value: 'addons:delete' },
  ],
  Ordering: [
    { label: 'View Orders', value: 'ordering:view' },
    { label: 'New POS Order', value: 'ordering:create' },
  ],
  Transactions: [
    { label: 'View Transactions', value: 'transactions:view' },
    { label: 'Refund Transaction', value: 'transactions:refund' },
  ],
  UserManagement: [
    { label: 'View Users', value: 'userManagement:view' },
    { label: 'Manage Permissions', value: 'userManagement:assign' },
  ],
}

// --- Logic to Apply Dynamic Role ---
const applyRoleTemplate = (roleValue) => {
  const roleObj = userRoles.value.find((r) => r.value === roleValue)

  if (roleObj) {
    if (roleObj.permissions.includes('*')) {
      // Select ALL available permissions
      selectedPermissions.value = Object.values(actionsByPage)
        .flat()
        .map((a) => a.value)
    } else {
      selectedPermissions.value = [...roleObj.permissions]
    }
  }
}

// --- Helper Functions ---
const selectAllPermissions = () => {
  selectedPermissions.value = Object.values(actionsByPage)
    .flat()
    .map((a) => a.value)
  selectedRole.value = null
}

const clearAllPermissions = () => {
  selectedPermissions.value = []
  selectedRole.value = null
}

const removePermission = (perm) => {
  selectedPermissions.value = selectedPermissions.value.filter((p) => p !== perm)
  selectedRole.value = null
}

const isFormValid = computed(() => {
  const normalizeRole = (r) =>
    String(r || '')
      .toLowerCase()
      .replace(/[\s_-]+/g, '')
  const selected = normalizeRole(selectedRole.value)
  const mainOk = !authStore.isMainAdmin || selected === 'superadmin'
  return (
    username.value.length > 0 &&
    /.+@.+\..+/.test(email.value) &&
    password.value.length >= 6 &&
    selectedPermissions.value.length > 0 &&
    mainOk
  )
})

const resetForm = () => {
  username.value = ''
  email.value = ''
  password.value = ''
  selectedRole.value = null
  selectedPermissions.value = []
}

const submit = async () => {
  loading.value = true
  try {
    await userStore.addUser({
      username: username.value,
      email: email.value,
      password: password.value,
      permissions: selectedPermissions.value,
      role: selectedRole.value || 'custom',
    })
    $q.notify({ type: 'positive', message: 'User created successfully', icon: 'check_circle' })
    emit('add')
    localDialog.value = false
  } catch (error) {
    console.error(error)
    $q.notify({ type: 'negative', message: 'Error creating user', icon: 'error' })
  } finally {
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  (val) => {
    localDialog.value = val
  },
)
watch(localDialog, (val) => {
  emit('update:modelValue', val)
  if (!val) resetForm()
})
</script>
