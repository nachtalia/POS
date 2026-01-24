<template>
  <q-page class="q-pa-sm q-pa-md-md bg-grey-2">
    <div class="row justify-center">
      <div class="col-12" style="max-width: 1400px">
        <div class="row items-center justify-between q-mb-md">
          <div class="col-12 col-sm-auto q-mb-md q-mb-sm-none">
            <div class="text-h5 text-weight-bold text-blue-grey-9">User Management</div>
            <div class="text-caption text-grey-7">Manage users, access, and roles</div>
          </div>

          <div class="col-12 col-sm-auto">
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-auto" v-if="canManagePermissions">
                <q-btn
                  outline
                  rounded
                  no-caps
                  color="blue-grey-8"
                  icon="settings"
                  label="MANAGE ROLES"
                  @click="showRoleManager = true"
                  class="full-width"
                />
              </div>

              <div class="col-12 col-sm-auto" v-if="canAddUser">
                <q-btn
                  unelevated
                  rounded
                  no-caps
                  color="primary"
                  icon="add"
                  label="ADD NEW USER"
                  @click="showAddUserPanel = true"
                  class="full-width"
                />
              </div>
            </div>
          </div>
        </div>
        <AddNewUser v-model="showAddUserPanel" @add="refreshData" />

        <q-dialog
          v-model="showRoleManager"
          full-width
          :maximized="$q.screen.lt.md"
          transition-show="slide-up"
          transition-hide="slide-down"
          style="max-width: 1200px"
        >
          <RoleManager />
        </q-dialog>

        <UserList
          :users="users"
          :available-roles="availableRoles"
          :loading="loading"
          :pagination="pagination"
          :can-manage-roles="canManagePermissions"
          :can-edit-user="canEditUser"
          :can-delete-user="canDeleteUser"
          @manage-roles="openManageUserDialog"
          @edit="openManageUserDialog"
          @delete="confirmDeleteUser"
          :grid="$q.screen.xs"
        />

        <ManageUserRoles
          v-model="manageUserDialog"
          :selected-user="selectedUser"
          @updated="refreshData"
        />

        <q-dialog v-model="deleteDialog" persistent>
          <q-card style="min-width: 300px">
            <q-card-section class="row items-center">
              <q-avatar icon="warning" color="warning" text-color="white" />
              <span class="q-ml-sm">Are you sure you want to delete this user?</span>
            </q-card-section>

            <q-card-actions align="right">
              <q-btn flat rounded label="Cancel" color="grey" v-close-popup />
              <q-btn
                rounded
                label="Delete"
                color="negative"
                @click="deleteUser"
                :loading="loading"
              />
            </q-card-actions>
          </q-card>
        </q-dialog>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'

// --- Imports ---
import AddNewUser from 'src/components/Usermanagement/AddNewUser.vue'
import UserList from 'src/components/Usermanagement/UserList.vue'
import ManageUserRoles from 'src/components/Usermanagement/ManageUserRole.vue'
import RoleManager from 'src/components/Usermanagement/RoleManager.vue'

import { useUserManagementStore } from 'src/stores/usermanagementStore.js'
import { useAuthStore } from 'src/features/index.js'

const $q = useQuasar()
const userStore = useUserManagementStore()
const authStore = useAuthStore()

// --- State ---
const users = computed(() => userStore.users)
const loading = computed(() => userStore.loading)

// Dialog Controls
const showAddUserPanel = ref(false)
const showRoleManager = ref(false)
const manageUserDialog = ref(false)
const deleteDialog = ref(false)

const selectedUser = ref(null)
const userToDelete = ref(null)

// --- Permissions ---
const has = (perm) =>
  authStore.isSuperAdmin ||
  authStore.permissions.includes('*') ||
  authStore.permissions.includes(perm)

const canAddUser = computed(
  () => authStore.can('create', 'userManagement') || has('userManagement:create'),
)
const canEditUser = computed(
  () => authStore.can('edit', 'userManagement') || has('userManagement:edit'),
)
const canDeleteUser = computed(
  () => authStore.can('delete', 'userManagement') || has('userManagement:delete'),
)
const canManagePermissions = computed(
  () => authStore.can('assign', 'userManagement') || has('userManagement:assign'),
)

// --- Dynamic Roles from Store ---
const availableRoles = computed(() => {
  return userStore.roles.map((r) => ({
    label: r.label || r.name,
    value: r.value,
    caption: r.description || '',
  }))
})

const pagination = ref({
  sortBy: 'id',
  descending: false,
  page: 1,
  rowsPerPage: 10,
})

// --- Methods ---

const refreshData = async () => {
  try {
    await Promise.all([userStore.fetchUsers(), userStore.fetchRoles()])
  } catch (e) {
    console.error(e)
  }
}

// Opens the unified Edit/Permissions dialog
const openManageUserDialog = (user) => {
  selectedUser.value = { ...user }
  manageUserDialog.value = true
}

const confirmDeleteUser = (user) => {
  userToDelete.value = typeof user === 'string' ? user : user?.id
  deleteDialog.value = true
}

const deleteUser = async () => {
  try {
    await userStore.deleteUser(userToDelete.value)
    deleteDialog.value = false
    $q.notify({ type: 'positive', message: 'User deleted successfully', icon: 'check_circle' })
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Failed to delete user', icon: 'error' })
  }
}

// --- Lifecycle ---
onMounted(async () => {
  await refreshData()
})
</script>

<style scoped>
/* Ensure tables don't overflow on mobile horizontally */
:deep(.q-table__container) {
  width: 100%;
}

.q-table {
  background-color: white;
}
.q-table thead th {
  background-color: #f5f5f5;
  font-weight: 600;
}
.q-card {
  border-radius: 8px;
  overflow: hidden;
}
</style>
