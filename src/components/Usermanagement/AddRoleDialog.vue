<template>
  <q-dialog v-model="localDialog" persistent position="right" full-height>
    <q-card class="column" style="width: 450px; max-width: 100vw; height: 100vh">
      <q-card-section class="row items-center justify-between bg-primary text-white q-py-md">
        <div class="row items-center">
          <q-icon name="verified_user" class="q-mr-sm" size="sm" />
          <div class="text-h6">Create New Role</div>
        </div>
        <q-btn flat round dense icon="close" color="white" v-close-popup size="sm" />
      </q-card-section>

      <q-card-section class="col scroll q-pa-md">
        <div class="q-mb-md">
          <div class="text-subtitle2 text-weight-medium text-blue-grey-9 q-mb-sm">Role Details</div>
          <div class="q-gutter-y-sm">
            <q-input
              outlined
              v-model="roleName"
              label="Role Name"
              placeholder="e.g. Supervisor"
              dense
              lazy-rules
              :rules="[(val) => !!val || 'Required']"
            >
              <template v-slot:prepend><q-icon name="badge" /></template>
            </q-input>

            <q-input
              outlined
              v-model="roleDescription"
              label="Description"
              placeholder="Brief description of access level"
              dense
              type="textarea"
              rows="2"
            />
          </div>
        </div>

        <q-separator spaced />

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
              No permissions selected
            </div>
          </div>
        </div>

        <q-separator spaced />

        <div class="q-mb-md">
          <div class="text-subtitle2 text-weight-medium text-blue-grey-9 q-mb-xs">
            Permission Selection
          </div>

          <div class="row q-col-gutter-xs q-mb-sm">
            <q-btn
              outline
              size="sm"
              color="primary"
              :label="isAllSelected ? 'Unselect All' : 'Select All'"
              @click="toggleGlobalSelect"
              class="col"
            />
          </div>

          <q-list bordered class="rounded-borders">
            <q-expansion-item
              v-for="(actions, page) in actionsByPage"
              :key="page"
              header-class="bg-grey-1"
              expand-separator
              default-opened
            >
              <template v-slot:header>
                <q-item-section>
                  <span class="text-weight-bold">{{ page }}</span>
                </q-item-section>
                <q-item-section side>
                  <q-checkbox
                    :model-value="getCategoryState(page)"
                    :indeterminate="getCategoryIndeterminate(page)"
                    @click.stop="toggleCategory(page)"
                    dense
                    color="primary"
                  />
                </q-item-section>
              </template>

              <q-item v-for="action in actions" :key="action.value" dense tag="label" clickable>
                <q-item-section avatar>
                  <q-checkbox
                    v-model="selectedPermissions"
                    :val="action.value"
                    color="primary"
                    dense
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
          label="Save Role"
          color="green-7"
          icon="save"
          @click="submitRole"
          :disable="!roleName || selectedPermissions.length === 0"
          :loading="loading"
          class="q-px-lg"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useUserManagementStore } from 'src/stores/usermanagementStore.js'
import { useQuasar } from 'quasar'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'created'])

const $q = useQuasar()
const userStore = useUserManagementStore()

const localDialog = ref(props.modelValue)
const roleName = ref('')
const roleDescription = ref('')
const selectedPermissions = ref([])
const loading = ref(false)

// --- CONFIGURATION ---
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

const allPermissionValues = Object.values(actionsByPage)
  .flat()
  .map((p) => p.value)

// --- COMPUTED HELPERS ---
const isAllSelected = computed(
  () => selectedPermissions.value.length === allPermissionValues.length,
)

// Check if all items in a category are selected
const getCategoryState = (categoryKey) => {
  const catActions = actionsByPage[categoryKey].map((a) => a.value)
  return catActions.every((p) => selectedPermissions.value.includes(p))
}

// Check if some (but not all) items in a category are selected
const getCategoryIndeterminate = (categoryKey) => {
  const catActions = actionsByPage[categoryKey].map((a) => a.value)
  const selectedCount = catActions.filter((p) => selectedPermissions.value.includes(p)).length
  return selectedCount > 0 && selectedCount < catActions.length
}

// --- METHODS ---
const toggleGlobalSelect = () => {
  selectedPermissions.value = isAllSelected.value ? [] : [...allPermissionValues]
}

const toggleCategory = (categoryKey) => {
  const catActions = actionsByPage[categoryKey].map((a) => a.value)
  const isCurrentlyFull = getCategoryState(categoryKey)

  if (isCurrentlyFull) {
    // Unselect all in this category
    selectedPermissions.value = selectedPermissions.value.filter((p) => !catActions.includes(p))
  } else {
    // Select all in this category (merge unique)
    const newPerms = catActions.filter((p) => !selectedPermissions.value.includes(p))
    selectedPermissions.value = [...selectedPermissions.value, ...newPerms]
  }
}

const removePermission = (perm) => {
  selectedPermissions.value = selectedPermissions.value.filter((p) => p !== perm)
}

const resetForm = () => {
  roleName.value = ''
  roleDescription.value = ''
  selectedPermissions.value = []
}

const submitRole = async () => {
  if (!roleName.value) return

  loading.value = true
  try {
    const newRole = {
      name: roleName.value,
      description: roleDescription.value,
      value: roleName.value.toLowerCase().replace(/\s+/g, '_'),
      permissions: selectedPermissions.value,
    }

    await userStore.createRole(newRole)

    $q.notify({
      type: 'positive',
      message: `Role "${roleName.value}" created!`,
      icon: 'check_circle',
    })

    emit('created')
    localDialog.value = false
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Failed to create role', icon: 'error' })
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
