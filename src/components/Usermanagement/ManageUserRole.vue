<template>
  <q-dialog v-model="localDialog" persistent position="right" full-height>
    <q-card class="column" style="width: 450px; max-width: 100vw; height: 100vh">
      <q-card-section class="row items-center justify-between bg-primary text-white q-py-md">
        <div class="row items-center">
          <q-icon name="manage_accounts" class="q-mr-sm" size="sm" />
          <div class="text-h6">Edit User & Permissions</div>
        </div>
        <q-btn flat round dense icon="close" color="white" v-close-popup size="sm" />
      </q-card-section>

      <q-card-section class="col scroll q-pa-md">
        <div class="q-mb-lg">
          <div class="text-subtitle2 text-weight-bold text-blue-grey-9 q-mb-sm">
            User Credentials
          </div>

          <q-form ref="formRef" class="q-gutter-y-sm">
            <q-input
              outlined
              dense
              v-model="username"
              label="Username"
              :rules="[(val) => !!val || 'Username is required']"
            >
              <template v-slot:prepend><q-icon name="person" /></template>
            </q-input>

            <q-input
              outlined
              dense
              v-model="email"
              label="Email"
              type="email"
              :rules="[(val) => /.+@.+\..+/.test(val) || 'Invalid email']"
            >
              <template v-slot:prepend><q-icon name="email" /></template>
            </q-input>

            <q-input
              outlined
              dense
              v-model="password"
              label="New Password"
              :type="showPassword ? 'text' : 'password'"
              hint="Leave blank to keep current password"
              :rules="[
                (val) => !val || val.length >= 6 || 'Password must be at least 6 characters',
              ]"
            >
              <template v-slot:prepend><q-icon name="lock" /></template>
              <template v-slot:append>
                <q-icon
                  :name="showPassword ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="showPassword = !showPassword"
                />
              </template>
            </q-input>
          </q-form>
        </div>

        <q-separator class="q-mb-md" />

        <div class="q-mb-md">
          <div class="text-subtitle2 text-weight-bold text-blue-grey-9 q-mb-xs">
            Role Assignment
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
        </div>

        <div class="q-mb-md">
          <div class="text-subtitle2 text-weight-bold text-blue-grey-9 q-mb-xs">
            Active Permissions
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
              No permissions assigned
            </div>
          </div>
        </div>

        <q-separator class="q-mb-md" />

        <div class="q-mb-md">
          <div class="text-subtitle2 text-weight-bold text-blue-grey-9 q-mb-xs">
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
              :default-opened="hasPermissionInGroup(actions)"
            >
              <template v-slot:header>
                <q-item-section>
                  <span class="text-weight-bold">{{ page }}</span>
                </q-item-section>
                <q-item-section side>
                  <q-badge
                    v-if="getSelectedCount(actions) > 0"
                    color="blue-grey"
                    :label="getSelectedCount(actions)"
                  />
                </q-item-section>
              </template>

              <q-item
                v-for="action in actions"
                :key="action.value"
                dense
                clickable
                @click="togglePermission(action.value)"
              >
                <q-item-section avatar>
                  <q-checkbox
                    v-model="selectedPermissions"
                    :val="action.value"
                    color="primary"
                    dense
                    style="pointer-events: none"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ action.label }}</q-item-label>
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
          label="Save Changes"
          color="primary"
          @click="submit"
          :loading="loading"
          icon="save"
          class="q-px-lg"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useUserManagementStore } from 'src/stores/usermanagementStore.js'
import { useAuthStore } from 'src/features/index.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  selectedUser: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:modelValue', 'updated'])

const $q = useQuasar()
const userStore = useUserManagementStore()
const authStore = useAuthStore()

const localDialog = ref(props.modelValue)
const loading = ref(false)
const formRef = ref(null)

//Fields
const username = ref('')
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const selectedRole = ref(null)
const selectedPermissions = ref([])

// 1. Dynamic Roles from Store
const userRoles = computed(() => {
  return userStore.roles.map((role) => ({
    label: role.label || role.name,
    value: role.value,
    permissions: role.permissions || [],
  }))
})

// Define available system actions
const actionsByPage = {
  Dashboard: [{ label: 'View Dashboard', value: 'dashboard:view' }],
  Products: [
    { label: 'View Product', value: 'inventory:view' },
    { label: 'Add Category', value: 'inventory:addCategory' },
    { label: 'Add Product', value: 'inventory:addProduct' },
    { label: 'Edit Product', value: 'inventory:editProduct' },
    { label: 'Delete Product', value: 'inventory:deleteProduct' },
  ],
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

// Logic: Fetch Data on Open
watch(
  () => props.selectedUser,
  (newUser) => {
    if (newUser) {
      username.value = newUser.username || ''
      email.value = newUser.email || ''

      // Reset password field specifically
      password.value = ''

      if (Array.isArray(newUser.permissions)) {
        selectedPermissions.value = [...newUser.permissions]
      } else {
        selectedPermissions.value = []
      }
      selectedRole.value = newUser.role || null
    }
  },
  { immediate: true, deep: true },
)

// Dynamic Role Application
const applyRoleTemplate = (roleValue) => {
  const selectedRoleObj = userRoles.value.find((r) => r.value === roleValue)
  if (selectedRoleObj) {
    if (selectedRoleObj.permissions.includes('*')) {
      selectedPermissions.value = Object.values(actionsByPage)
        .flat()
        .map((a) => a.value)
    } else {
      selectedPermissions.value = [...selectedRoleObj.permissions]
    }
  }
}

const selectAllPermissions = () => {
  selectedPermissions.value = Object.values(actionsByPage)
    .flat()
    .map((a) => a.value)
}

const clearAllPermissions = () => {
  selectedPermissions.value = []
}

const removePermission = (perm) => {
  selectedPermissions.value = selectedPermissions.value.filter((p) => p !== perm)
}

const getSelectedCount = (groupActions) =>
  groupActions.filter((a) => selectedPermissions.value.includes(a.value)).length

const hasPermissionInGroup = (groupActions) =>
  groupActions.some((a) => selectedPermissions.value.includes(a.value))

const togglePermission = (val) => {
  if (selectedPermissions.value.includes(val)) {
    selectedPermissions.value = selectedPermissions.value.filter((p) => p !== val)
  } else {
    selectedPermissions.value.push(val)
  }
}

// --- FIXED SUBMIT FUNCTION ---
const submit = async () => {
  // 1. Trigger Form Validation
  const success = await formRef.value?.validate()
  if (!success) {
    $q.notify({ type: 'warning', message: 'Please fix validation errors' })
    return
  }

  if (!props.selectedUser?.id) return

  loading.value = true
  try {
    const uniquePerms = Array.from(new Set(selectedPermissions.value))

    // Prepare Base Payload
    const payload = {
      username: username.value,
      email: email.value,
      permissions: uniquePerms,
      role: selectedRole.value || 'custom',
    }

    // 2. Handle Password Update
    // IMPORTANT: Your backend store or Cloud Function must handle the actual auth update.
    if (password.value && password.value.length > 0) {
      payload.password = password.value
    }

    await userStore.updateUser(props.selectedUser.id, payload)

    // 3. Update Local Auth Store if editing self
    if (
      authStore.user?.uid &&
      (props.selectedUser.uid === authStore.user.uid ||
        props.selectedUser.email === authStore.user.email)
    ) {
      authStore.setPermissions(uniquePerms)
      if (payload.password) {
        $q.notify({
          type: 'info',
          message: 'You updated your own password. You may need to log in again.',
        })
      }
    }

    $q.notify({ type: 'positive', message: 'User updated successfully', icon: 'check_circle' })

    // 4. Cleanup
    password.value = '' // Clear sensitive field
    emit('updated')
    localDialog.value = false
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Failed to update user', caption: e.message })
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
})
</script>
