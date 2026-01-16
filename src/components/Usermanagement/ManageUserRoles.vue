<template>
  <q-dialog v-model="localDialog" persistent position="right" full-height>
    <q-card class="q-dialog-plugin" style="min-width: 450px; height: 100vh">
      <q-card-section class="row items-center justify-between bg-primary text-white q-pb-md">
        <div class="text-h6">Manage User Permissions</div>
        <q-btn flat round dense icon="close" color="white" v-close-popup size="sm" />
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-card flat bordered class="q-mb-md bg-blue-grey-1">
          <q-card-section class="q-pa-sm">
            <div class="row items-center no-wrap">
              <q-avatar color="primary" text-color="white" size="md" class="q-mr-sm">
                {{ props.selectedUser?.username?.charAt(0).toUpperCase() }}
              </q-avatar>
              <div>
                <div class="text-subtitle1 text-weight-bold text-blue-grey-10">
                  {{ props.selectedUser?.username }}
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <div class="q-mb-md">
          <div class="text-subtitle2 text-weight-medium text-blue-grey-9 q-mb-xs">
            Current Permissions
            <q-badge color="grey" class="q-ml-xs" :label="selectedPermissions.length" />
          </div>
          <div class="q-gutter-xs">
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
            <div v-if="!selectedPermissions.length" class="text-caption text-grey-6 q-pa-sm">
              No permissions assigned yet
            </div>
          </div>
        </div>

        <q-separator spaced />

        <div class="q-mb-md">
          <div class="text-subtitle2 text-weight-medium text-blue-grey-9 q-mb-xs">
            Available Permissions
          </div>

          <div class="row q-col-gutter-xs q-mb-md">
            <q-btn outline size="sm" color="primary" label="Select All" @click="selectAllPermissions" class="col" />
            <q-btn outline size="sm" color="grey" label="Clear All" @click="clearAllPermissions" class="col" />
          </div>

          <q-list bordered class="rounded-borders">
            <q-expansion-item
              v-for="page in pages"
              :key="page.value"
              :label="page.label"
              :caption="getRoleDescription(page.value)"
              expand-separator
              :default-opened="false"
            >
              <q-item v-for="action in actionsByPage[page.value] || []" :key="action.value">
                <q-item-section avatar>
                  <q-checkbox
                    v-model="selectedPermissions"
                    :val="action.value"
                    color="primary"
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

        <q-banner v-if="selectedPermissions.length > 0" dense class="bg-green-1 text-green-9 q-mb-md">
          <template v-slot:avatar>
            <q-icon name="check_circle" color="green" />
          </template>
          {{ selectedPermissions.length }} permission(s) selected
        </q-banner>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="Cancel" color="grey" v-close-popup class="q-px-lg" />
        <q-btn 
          label="Apply Permissions" 
          color="green"
          @click="save"
          :disable="!selectedPermissions.length"
          class="q-px-lg"
          icon-right="check"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  selectedUser: { type: Object, default: () => null },
  availableRoles: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'save'])

const localDialog = ref(props.modelValue)
const selectedPermissions = ref([])

const pages = computed(() => (props.availableRoles || []))

const actionsByPage = {
  Dashboard: [
    { label: 'View Dashboard', value: 'dashboard:view' },
  ],
  Inventory: [
    { label: 'View Inventory', value: 'inventory:view' },
    { label: 'Add Category', value: 'inventory:addCategory' },
    { label: 'Add Product', value: 'inventory:addProduct' },
    { label: 'Add Add-on', value: 'addons:add' },
    { label: 'Edit Product', value: 'inventory:editProduct' },
    { label: 'Delete Product', value: 'inventory:deleteProduct' },
    { label: 'Edit Add-on', value: 'addons:edit' },
    { label: 'Delete Add-on', value: 'addons:delete' },
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
    { label: 'Add User', value: 'userManagement:create' },
    { label: 'Edit User', value: 'userManagement:edit' },
    { label: 'Delete User', value: 'userManagement:delete' },
    { label: 'Manage User Permissions', value: 'userManagement:assign' },
  ],
  Settings: [
    { label: 'View Settings', value: 'settings:view' },
    { label: 'Update Settings', value: 'settings:update' },
  ],
}

watch(() => props.modelValue, (val) => {
  localDialog.value = val
})

watch(localDialog, (val) => {
  emit('update:modelValue', val)
})

watch(() => props.selectedUser, (user) => {
  const legacyMap = {
    'addons:add-addons': 'addons:add',
  }
  const incoming = Array.isArray(user?.permissions) ? user.permissions : []
  selectedPermissions.value = Array.from(
    new Set(incoming.map((p) => legacyMap[p] || p)),
  )
}, { immediate: true })

const selectAllPermissions = () => {
  const all = []
  pages.value.forEach((p) => {
    const actions = actionsByPage[p.value] || actionsByPage[p.label] || []
    actions.forEach((a) => all.push(a.value))
  })
  selectedPermissions.value = all
}

const clearAllPermissions = () => {
  selectedPermissions.value = []
}

const removePermission = (perm) => {
  const index = selectedPermissions.value.indexOf(perm)
  if (index !== -1) {
    selectedPermissions.value.splice(index, 1)
  }
}

const save = () => {
  if (!props.selectedUser) return
  const legacyMap = {
    'addons:add-addons': 'addons:add',
  }
  const normalized = selectedPermissions.value.map((p) => legacyMap[p] || p)
  emit('save', Array.from(new Set(normalized)))
  localDialog.value = false
}

const getRoleDescription = (value) => {
  const found = (props.availableRoles || []).find((r) => r.value === value)
  return found?.caption || 'Sidebar access'
}
</script>

<style scoped>
.q-dialog-plugin {
  border-radius: 8px 0 0 8px;
}
.q-item {
  transition: all 0.3s ease;
}
.q-item:hover {
  background-color: rgba(0, 150, 255, 0.05);
}
</style>
