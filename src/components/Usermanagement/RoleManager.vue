<template>
  <q-card class="column full-height" style="min-height: 400px">
    <q-card-section class="bg-primary text-white row items-center justify-between">
      <div class="text-h6">Role Management</div>
      <q-btn flat round dense icon="close" v-close-popup />
    </q-card-section>

    <q-card-section class="col q-pa-sm q-pa-md-md">
      <div class="row justify-between q-mb-md">
        <div class="text-subtitle1 text-grey-8 q-mb-xs q-mb-sm-none">
          Configure access levels for your system
        </div>
        <q-btn 
          color="secondary" 
          icon="add" 
          label="Create New Role" 
          @click="openDialog()"
          class="full-width q-mb-sm q-mb-sm-none"
          :class="$q.screen.lt.sm ? '' : 'self-start'"
        />
      </div>

      <q-table
        :rows="roles"
        :columns="columns"
        row-key="id"
        flat
        bordered
        :loading="loading"
        :rows-per-page-options="[5, 10, 15]"
        :pagination="{ rowsPerPage: 10 }"
        class="sticky-header"
      >
        <!-- Mobile Grid View -->
        <template v-slot:item="props">
          <div class="q-pa-xs col-xs-12 col-sm-6 col-md-4">
            <q-card bordered flat class="full-height">
              <q-card-section>
                <div class="text-subtitle1 text-weight-bold q-mb-sm">{{ props.row.label }}</div>
                <div class="text-caption text-grey-7 q-mb-xs">
                  <q-icon name="fingerprint" size="14px" class="q-mr-xs" />
                  {{ props.row.value }}
                </div>
                <div class="q-mb-sm">
                  <q-badge color="blue-grey" outline>
                    {{ props.row.permissions?.length || 0 }} Permissions
                  </q-badge>
                </div>
              </q-card-section>
              <q-separator />
              <q-card-actions align="right" class="q-pa-sm">
                <q-btn
                  flat
                  round
                  color="primary"
                  icon="edit"
                  size="sm"
                  @click="openDialog(props.row)"
                >
                  <q-tooltip>Edit Role</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  round
                  color="negative"
                  icon="delete"
                  size="sm"
                  @click="confirmDelete(props.row)"
                  :disable="['admin'].includes(props.row.value)"
                >
                  <q-tooltip>Delete Role</q-tooltip>
                </q-btn>
              </q-card-actions>
            </q-card>
          </div>
        </template>

        <!-- Desktop Table View -->
        <template v-slot:body-cell-label="props">
          <q-td :props="props" class="text-weight-medium">
            {{ props.value }}
          </q-td>
        </template>

        <template v-slot:body-cell-value="props">
          <q-td :props="props">
            <div class="row items-center">
              <q-icon name="fingerprint" size="14px" class="q-mr-xs text-grey-6" />
              <span class="text-monospace">{{ props.value }}</span>
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-permissions="props">
          <q-td :props="props">
            <q-badge color="blue-grey" outline>
              {{ props.row.permissions?.length || 0 }} Permissions
            </q-badge>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <div class="row justify-end q-gutter-xs">
              <q-btn
                flat
                round
                color="primary"
                icon="edit"
                size="sm"
                @click="openDialog(props.row)"
              >
                <q-tooltip>Edit Role</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                color="negative"
                icon="delete"
                size="sm"
                @click="confirmDelete(props.row)"
                :disable="['admin'].includes(props.row.value)"
              >
                <q-tooltip>Delete Role</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>
    </q-card-section>

    <q-dialog v-model="dialogVisible" persistent :position="$q.screen.lt.sm ? 'bottom' : 'right'">
      <q-card
        class="column"
        :style="
          $q.screen.lt.sm
            ? 'width: 100vw; height: 100vh; max-height: 100vh;'
            : 'width: 500px; max-width: 100vw; height: 100vh'
        "
      >
        <q-card-section class="row items-center justify-between bg-primary text-white q-py-md">
          <div class="text-h6">{{ isEditing ? 'Edit Role' : 'Create New Role' }}</div>
          <q-btn flat round dense icon="close" color="white" v-close-popup size="sm" />
        </q-card-section>

        <q-card-section class="col scroll q-pa-md">
          <div class="q-mb-md">
            <div class="text-subtitle2 text-weight-medium text-blue-grey-9 q-mb-sm">
              Role Details
            </div>
            <div class="q-gutter-y-sm">
              <q-input
                outlined
                v-model="form.label"
                label="Role Name"
                dense
                :rules="[(val) => !!val || 'Required']"
                @update:model-value="autoFillValue"
              >
                <template v-slot:prepend><q-icon name="badge" /></template>
              </q-input>

              <q-input
                outlined
                v-model="form.value"
                label="Role ID (System Identifier)"
                dense
                :readonly="isEditing"
                :disable="isEditing"
                hint="Unique ID (e.g. senior_cashier)"
                :rules="[
                  (val) => !!val || 'Required',
                  (val) => /^[a-z_]+$/.test(val) || 'Lowercase letters and underscores only',
                ]"
              >
                <template v-slot:prepend><q-icon name="fingerprint" /></template>
              </q-input>
            </div>
          </div>

          <q-separator spaced />

          <div class="q-mb-md">
            <div class="text-subtitle2 text-weight-medium text-blue-grey-9 q-mb-xs">
              Assigned Permissions
              <q-badge color="primary" class="q-ml-xs" :label="form.permissions.length" />
            </div>
            <div class="q-gutter-xs bg-grey-2 q-pa-sm rounded-borders" style="min-height: 50px">
              <q-chip
                v-for="perm in form.permissions"
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
                v-if="!form.permissions.length"
                class="text-caption text-grey-6 text-center q-pa-sm"
              >
                No permissions assigned yet
              </div>
            </div>
          </div>

          <q-separator spaced />

          <div class="q-mb-md">
            <div class="text-subtitle2 text-weight-medium text-blue-grey-9 q-mb-xs">
              Permission Configuration
            </div>

            <div class="row q-col-gutter-xs q-mb-sm">
              <q-btn
                outline
                size="sm"
                color="primary"
                label="Select All"
                @click="selectAll"
                class="col"
              />
              <q-btn
                outline
                size="sm"
                color="grey"
                label="Clear All"
                @click="clearAll"
                class="col"
              />
            </div>

            <q-list bordered class="rounded-borders">
              <q-expansion-item
                v-for="(group, name) in actionsByPage"
                :key="name"
                expand-separator
                header-class="bg-grey-1"
                :label="name"
                dense
                :class="$q.screen.lt.sm ? 'q-py-xs' : ''"
              >
                <q-item
                  v-for="action in group"
                  :key="action.value"
                  dense
                  tag="label"
                  v-ripple
                  class="q-py-none"
                >
                  <q-item-section avatar>
                    <q-checkbox
                      v-model="form.permissions"
                      :val="action.value"
                      color="primary"
                      size="sm"
                    />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium" :class="$q.screen.lt.sm ? 'text-caption' : ''">
                      {{ action.label }}
                    </q-item-label>
                    <q-item-label caption :class="$q.screen.lt.sm ? 'text-caption' : ''">
                      {{ action.value }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-expansion-item>
            </q-list>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right" class="q-pa-md bg-grey-1">
          <q-btn flat label="Cancel" color="grey" v-close-popup :class="$q.screen.lt.sm ? 'q-px-sm' : 'q-px-lg'" />
          <q-btn
            :label="isEditing ? 'Update Role' : 'Create Role'"
            color="green-7"
            @click="saveRole"
            :loading="saving"
            icon="save"
            :class="$q.screen.lt.sm ? 'q-px-sm' : 'q-px-lg'"
            class="q-ml-xs"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useUserManagementStore } from 'src/stores/usermanagementStore.js'

const $q = useQuasar()
const userStore = useUserManagementStore()

// --- State ---
const dialogVisible = ref(false)
const saving = ref(false)
const isEditing = ref(false)
const editingId = ref(null)

const form = ref({
  label: '',
  value: '',
  permissions: [],
})

const loading = computed(() => userStore.loading)
const roles = computed(() => userStore.roles)

const columns = [
  { name: 'label', label: 'Role Name', field: 'label', align: 'left', sortable: true },
  { name: 'value', label: 'Role ID', field: 'value', align: 'left', sortable: true },
  { name: 'permissions', label: 'Permissions', field: 'permissions', align: 'left' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'right' },
]

// --- Permissions Definitions (Matches AddNewUser.vue) ---
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

// --- Lifecycle ---
onMounted(() => {
  userStore.fetchRoles()
})

// --- Methods ---

// Helper: Auto-generate ID from Name
const autoFillValue = (val) => {
  if (!isEditing.value && val) {
    // Convert "Senior Cashier" -> "senior_cashier"
    form.value.value = val
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
  }
}

const openDialog = (role = null) => {
  if (role) {
    isEditing.value = true
    editingId.value = role.id
    form.value = {
      label: role.label,
      value: role.value,
      permissions: [...(role.permissions || [])],
    }
  } else {
    isEditing.value = false
    editingId.value = null
    form.value = { label: '', value: '', permissions: [] }
  }
  dialogVisible.value = true
}

const selectAll = () => {
  form.value.permissions = Object.values(actionsByPage)
    .flat()
    .map((a) => a.value)
}

const clearAll = () => {
  form.value.permissions = []
}

const removePermission = (perm) => {
  form.value.permissions = form.value.permissions.filter((p) => p !== perm)
}

const saveRole = async () => {
  if (!form.value.label || !form.value.value) {
    $q.notify({ type: 'warning', message: 'Name and ID are required' })
    return
  }

  saving.value = true
  try {
    if (isEditing.value) {
      await userStore.updateRole(editingId.value, {
        label: form.value.label,
        permissions: form.value.permissions,
      })
      $q.notify({ type: 'positive', message: 'Role updated successfully' })
    } else {
      await userStore.addRole({
        label: form.value.label,
        value: form.value.value,
        permissions: form.value.permissions,
      })
      $q.notify({ type: 'positive', message: 'Role created successfully' })
    }
    dialogVisible.value = false
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Error saving role' })
  } finally {
    saving.value = false
  }
}

const confirmDelete = (role) => {
  $q.dialog({
    title: 'Confirm Delete',
    message: `Delete role "${role.label}"? Only do this if no users are currently assigned to it.`,
    cancel: true,
    persistent: true,
    ok: { color: 'negative', label: 'Delete' },
  }).onOk(async () => {
    try {
      await userStore.deleteRole(role.id)
      $q.notify({ type: 'positive', message: 'Role deleted' })
    } catch {
      $q.notify({ type: 'negative', message: 'Failed to delete role' })
    }
  })
}
</script>

<style scoped>
/* Mobile optimizations */
@media (max-width: 599px) {
  .q-table--mobile .q-table__top {
    padding: 8px;
  }
  
  .q-card__section--vert {
    padding: 12px;
  }
}

/* Sticky table header on mobile */
.sticky-header :deep(.q-table__top),
.sticky-header :deep(.q-table__middle) {
  max-height: calc(100vh - 150px);
}

.sticky-header :deep(.q-table__thead) {
  position: sticky;
  top: 0;
  z-index: 1;
  background-color: white;
}

/* Better touch targets on mobile */
@media (max-width: 599px) {
  .q-btn {
    min-height: 36px;
  }
  
  .q-item {
    min-height: 40px;
  }
  
  .q-checkbox__inner {
    width: 20px;
    height: 20px;
  }
}

/* Responsive typography */
.text-h6 {
  font-size: clamp(1.1rem, 2.5vw, 1.25rem);
}

.text-subtitle1 {
  font-size: clamp(0.9rem, 2vw, 1rem);
}

.text-subtitle2 {
  font-size: clamp(0.85rem, 1.8vw, 0.9rem);
}

.text-caption {
  font-size: clamp(0.75rem, 1.5vw, 0.8rem);
}
</style>