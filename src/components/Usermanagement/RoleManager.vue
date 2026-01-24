<template>
  <q-card class="column full-height overflow-hidden" style="min-height: 600px">
    <q-card-section class="bg-primary text-white row items-center justify-between q-py-sm shrink">
      <div class="text-h6">Role Management</div>
      <q-btn flat round dense icon="close" v-close-popup />
    </q-card-section>

    <q-card-section class="col scroll q-pa-md">
      <div class="row justify-between items-center q-mb-md q-col-gutter-y-sm">
        <div class="col-12 col-sm-auto">
          <div class="text-subtitle1 text-grey-8">Configure access levels</div>
        </div>
        <div class="col-12 col-sm-auto text-right">
          <q-btn
            color="secondary"
            icon="add"
            label="Create New Role"
            @click="openDialog()"
            class="full-width q-px-sm"
          />
        </div>
      </div>

      <q-table
        :rows="roles"
        :columns="columns"
        row-key="id"
        flat
        bordered
        :loading="loading"
        :grid="$q.screen.xs"
        :rows-per-page-options="[10, 20, 0]"
      >
        <template v-slot:body-cell-permissions="props">
          <q-td :props="props" style="white-space: normal; min-width: 300px">
            <div v-if="props.row.permissions && props.row.permissions.length > 0">
              <div v-if="!isExpanded(props.row.id)" class="row q-gutter-xs">
                <q-badge
                  v-for="perm in props.row.permissions.slice(0, 3)"
                  :key="perm"
                  color="grey-3"
                  text-color="grey-9"
                  class="q-pa-xs border-grey"
                >
                  {{ perm }}
                </q-badge>

                <q-badge
                  v-if="props.row.permissions.length > 3"
                  color="primary"
                  class="cursor-pointer q-pa-xs"
                  @click="toggleExpand(props.row.id)"
                >
                  +{{ props.row.permissions.length - 3 }} more
                </q-badge>
              </div>

              <div v-else class="row q-gutter-xs">
                <q-badge
                  v-for="perm in props.row.permissions"
                  :key="perm"
                  color="grey-3"
                  text-color="grey-9"
                  class="q-pa-xs border-grey"
                >
                  {{ perm }}
                </q-badge>

                <q-badge
                  color="primary"
                  outline
                  class="cursor-pointer q-pa-xs"
                  @click="toggleExpand(props.row.id)"
                >
                  Show less
                </q-badge>
              </div>
            </div>
            <div v-else class="text-grey-5 text-caption">No permissions assigned</div>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn flat round color="primary" icon="edit" size="sm" @click="openDialog(props.row)">
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
          </q-td>
        </template>

        <template v-slot:item="props">
          <div class="q-pa-xs col-xs-12 col-sm-6 col-md-4">
            <q-card flat bordered class="q-mb-sm shadow-1 full-height">
              <q-card-section class="row justify-between items-center bg-grey-1 q-py-sm">
                <div class="text-subtitle1 text-weight-bold">{{ props.row.label }}</div>
                <q-chip
                  dense
                  square
                  color="blue-grey-1"
                  text-color="blue-grey-8"
                  class="text-caption"
                >
                  {{ props.row.value }}
                </q-chip>
              </q-card-section>

              <q-separator />

              <q-card-section class="q-py-md">
                <div class="text-caption text-grey-7 q-mb-xs">Permissions:</div>

                <div v-if="props.row.permissions && props.row.permissions.length > 0">
                  <div v-if="!isExpanded(props.row.id)" class="row q-gutter-xs">
                    <q-badge
                      v-for="perm in props.row.permissions.slice(0, 3)"
                      :key="perm"
                      color="grey-3"
                      text-color="grey-9"
                      class="border-grey"
                    >
                      {{ perm }}
                    </q-badge>
                    <q-badge
                      v-if="props.row.permissions.length > 3"
                      color="primary"
                      class="cursor-pointer"
                      @click="toggleExpand(props.row.id)"
                    >
                      +{{ props.row.permissions.length - 3 }} more
                    </q-badge>
                  </div>

                  <div v-else class="row q-gutter-xs">
                    <q-badge
                      v-for="perm in props.row.permissions"
                      :key="perm"
                      color="grey-3"
                      text-color="grey-9"
                      class="border-grey"
                    >
                      {{ perm }}
                    </q-badge>
                    <q-badge
                      color="primary"
                      outline
                      class="cursor-pointer"
                      @click="toggleExpand(props.row.id)"
                    >
                      Show less
                    </q-badge>
                  </div>
                </div>
                <div v-else class="text-grey-5 text-italic">None</div>
              </q-card-section>

              <q-separator />

              <q-card-actions align="right">
                <q-btn
                  flat
                  color="primary"
                  icon="edit"
                  label="Edit"
                  size="sm"
                  @click="openDialog(props.row)"
                />
                <q-btn
                  flat
                  color="negative"
                  icon="delete"
                  label="Delete"
                  size="sm"
                  @click="confirmDelete(props.row)"
                  :disable="['admin'].includes(props.row.value)"
                />
              </q-card-actions>
            </q-card>
          </div>
        </template>
      </q-table>
    </q-card-section>

    <q-dialog
      v-model="dialogVisible"
      persistent
      position="right"
      maximized
      transition-show="slide-left"
      transition-hide="slide-right"
    >
      <q-card class="column" style="width: 500px; max-width: 100vw">
        <q-card-section
          class="row items-center justify-between bg-primary text-white q-py-md shrink"
        >
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
                label="Role ID"
                dense
                :readonly="isEditing"
                :disable="isEditing"
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
                    <q-item-label class="text-weight-medium">{{ action.label }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-expansion-item>
            </q-list>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right" class="q-pa-md bg-grey-1 shrink">
          <q-btn flat label="Cancel" color="grey" v-close-popup class="q-px-lg" />
          <q-btn
            :label="isEditing ? 'Update' : 'Create'"
            color="green-7"
            @click="saveRole"
            :loading="saving"
            icon="save"
            class="q-px-lg"
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

const dialogVisible = ref(false)
const saving = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
// Added for table expand/collapse logic
const expandedRows = ref({})

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

onMounted(() => {
  userStore.fetchRoles()
})

// Toggle Logic for Table
const isExpanded = (id) => !!expandedRows.value[id]
const toggleExpand = (id) => {
  expandedRows.value[id] = !expandedRows.value[id]
}

const autoFillValue = (val) => {
  if (!isEditing.value && val) {
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
  .q-card__section--vert {
    padding: 12px;
  }

  .q-btn {
    min-height: 36px;
  }

  .q-checkbox__inner {
    width: 20px;
    height: 20px;
  }
}

.border-grey {
  border: 1px solid #e0e0e0;
}

.cursor-pointer {
  cursor: pointer;
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
