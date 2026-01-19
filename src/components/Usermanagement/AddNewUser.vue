<template>
  <q-dialog v-model="localDialog" persistent position="right" full-height>
    <q-card class="column" style="width: 450px; max-width: 100vw">
      <q-card-section class="row items-center justify-between bg-primary text-white q-py-sm">
        <div class="text-h6">Add New User</div>
        <q-btn flat round dense icon="close" color="white" v-close-popup size="sm" />
      </q-card-section>

      <q-separator />

      <q-card-section class="col scroll q-pa-md">
        <div class="q-gutter-y-md">
          <div class="text-subtitle2 text-blue-grey-9">User Credentials</div>

          <q-input
            outlined
            v-model="username"
            label="Username"
            :rules="[(val) => !!val || 'Username is required']"
            lazy-rules
            dense
          >
            <template v-slot:prepend>
              <q-icon name="person" />
            </template>
          </q-input>

          <q-input
            outlined
            v-model="email"
            label="Email"
            type="email"
            :rules="[
              (val) => !!val || 'Email is required',
              (val) => /.+@.+\..+/.test(val) || 'Please enter a valid email',
            ]"
            lazy-rules
            dense
          >
            <template v-slot:prepend>
              <q-icon name="email" />
            </template>
          </q-input>

          <q-input
            outlined
            v-model="password"
            label="Password"
            :type="showPassword ? 'text' : 'password'"
            :rules="[(val) => !!val || 'Password is required']"
            lazy-rules
            dense
          >
            <template v-slot:prepend>
              <q-icon name="lock" />
            </template>
            <template v-slot:append>
              <q-icon
                :name="showPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                size="xs"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>

          <q-separator spaced />

          <div>
            <div class="text-subtitle2 text-blue-grey-9 q-mb-xs">Assign Role</div>
            <div class="text-caption text-grey-7 q-mb-sm">
              Select a role to automatically assign the correct permissions.
            </div>

            <q-select
              outlined
              v-model="selectedRole"
              :options="userRoles"
              label="Select Role"
              emit-value
              map-options
              :rules="[(val) => !!val || 'Role is required']"
              dense
              bg-color="blue-grey-1"
            >
              <template v-slot:prepend>
                <q-icon name="badge" color="primary" />
              </template>
              <template v-slot:option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section>
                    <q-item-label>{{ scope.opt.label }}</q-item-label>
                    <q-item-label caption>{{ scope.opt.description }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>

            <q-slide-transition>
              <div v-if="selectedRole" class="q-mt-sm bg-blue-1 q-pa-sm rounded-borders">
                <div class="text-caption text-blue-10 text-weight-bold q-mb-xs">
                  Permissions to be assigned:
                </div>
                <div class="row q-gutter-xs">
                  <q-badge
                    v-for="perm in previewPermissions"
                    :key="perm"
                    color="blue-8"
                    outline
                    :label="perm"
                  />
                </div>
              </div>
            </q-slide-transition>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right" class="q-pa-md bg-grey-1">
        <q-btn flat label="Cancel" color="grey" v-close-popup class="q-px-lg" />
        <q-btn
          label="Create User"
          color="primary"
          @click="submit"
          :disable="!isFormValid"
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

// PROPS to handle v-model from parent
const props = defineProps({
  modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'add'])

const localDialog = ref(props.modelValue)
const username = ref('')
const email = ref('')
const password = ref('')
const selectedRole = ref(null)
const showPassword = ref(false)

const $q = useQuasar()
const userStore = useUserManagementStore()

// Sync prop with local state
watch(
  () => props.modelValue,
  (val) => {
    localDialog.value = val
  },
)

watch(localDialog, (val) => {
  emit('update:modelValue', val)
  if (!val) resetForm() // Clear form when closed
})

// --- 1. Role Definitions (Identical to ManageUserRoles) ---
const userRoles = [
  { label: 'Administrator', value: 'admin', description: 'Full access to all modules' },
  {
    label: 'Store Manager',
    value: 'manager',
    description: 'Access to everything except user management',
  },
  { label: 'Cashier', value: 'cashier', description: 'Access to Ordering and Transactions only' },
  { label: 'Inventory Clerk', value: 'clerk', description: 'Access to Inventory only' },
]

// --- 2. Permission Definitions (Identical to ManageUserRoles) ---
const actionsByPage = {
  Dashboard: [{ value: 'dashboard:view' }],
  Inventory: [
    { value: 'inventory:view' },
    { value: 'inventory:addCategory' },
    { value: 'inventory:addProduct' },
    { value: 'addons:add' },
    { value: 'inventory:editProduct' },
    { value: 'inventory:deleteProduct' },
    { value: 'addons:edit' },
    { value: 'addons:delete' },
  ],
  Ordering: [{ value: 'ordering:view' }, { value: 'ordering:create' }],
  Transactions: [{ value: 'transactions:view' }, { value: 'transactions:refund' }],
  UserManagement: [
    { value: 'userManagement:view' },
    { value: 'userManagement:create' },
    { value: 'userManagement:edit' },
    { value: 'userManagement:delete' },
    { value: 'userManagement:assign' },
  ],
  Settings: [{ value: 'settings:view' }, { value: 'settings:update' }],
}

// --- 3. Logic to Calculate Permissions ---
const getPermissionsForRole = (role) => {
  let permissions = []
  switch (role) {
    case 'admin':
      Object.values(actionsByPage).forEach((group) =>
        group.forEach((a) => permissions.push(a.value)),
      )
      break
    case 'manager':
      Object.keys(actionsByPage).forEach((key) => {
        if (key !== 'UserManagement') actionsByPage[key].forEach((a) => permissions.push(a.value))
      })
      break
    case 'cashier':
      if (actionsByPage.Ordering) actionsByPage.Ordering.forEach((a) => permissions.push(a.value))
      if (actionsByPage.Transactions) {
        const viewTrans = actionsByPage.Transactions.find((a) => a.value === 'transactions:view')
        if (viewTrans) permissions.push(viewTrans.value)
      }
      break
    case 'clerk':
      if (actionsByPage.Inventory) actionsByPage.Inventory.forEach((a) => permissions.push(a.value))
      break
  }
  return permissions
}

// Computed property for visual preview in UI
const previewPermissions = computed(() => {
  if (!selectedRole.value) return []
  return getPermissionsForRole(selectedRole.value)
})

const isFormValid = computed(() => {
  return (
    username.value.trim() !== '' &&
    email.value.trim() !== '' &&
    /.+@.+\..+/.test(email.value) &&
    password.value.trim() !== '' &&
    selectedRole.value !== null
  )
})

const resetForm = () => {
  username.value = ''
  email.value = ''
  password.value = ''
  selectedRole.value = null
  showPassword.value = false
}

const submit = async () => {
  if (!isFormValid.value) return

  // 1. Calculate permissions
  const calculatedPermissions = getPermissionsForRole(selectedRole.value)

  // 2. Log them to console to verify calculation worked
  console.log('DIALOG: Sending Permissions:', calculatedPermissions)

  try {
    // 3. Send entire object to store
    await userStore.addUser({
      username: username.value,
      email: email.value,
      password: password.value,
      role: selectedRole.value,
      permissions: calculatedPermissions, // <--- Crucial
    })

    $q.notify({
      type: 'positive',
      message: 'User created successfully',
      position: 'top-right',
      icon: 'check_circle',
    })

    emit('add')
    localDialog.value = false
  } catch (e) {
    console.error(e)
    $q.notify({
      type: 'negative',
      message: 'Failed to create user: ' + e.message,
      position: 'top-right',
      icon: 'error',
    })
  }
}
</script>
