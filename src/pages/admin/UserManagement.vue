<template>
  <q-page class="q-pa-md bg-grey-2">
    <div class="row justify-center">
      <div class="col-12" style="max-width: 1400px">
        
        <div class="row items-center justify-between q-mb-md">
          <div>
            <div class="text-h5 text-weight-bold text-blue-grey-9">User Management</div>
            <div class="text-caption text-grey-7">Manage and track user accounts</div>
          </div>
        </div>

        <AddNewUser v-if="canAddUser" @add="handleAddUser" />

        <UserList
          :users="users"
          :available-roles="availableRoles"
          :loading="loading"
          :pagination="pagination"
          :can-manage-roles="canManagePermissions"
          :can-edit-user="canEditUser"
          :can-delete-user="canDeleteUser"
          @manage-roles="addRolesToUser"
          @edit="editUser"
          @delete="confirmDeleteUser"
        />

        <!-- Edit User Dialog -->
        <q-dialog v-model="editDialog" persistent>
          <q-card style="min-width: 400px">
            <q-card-section>
              <div class="text-h6">Edit User</div>
            </q-card-section>

            <q-card-section class="q-pt-none">
              <q-input
                outlined
                v-model="editingUser.username"
                label="Username"
                class="q-mb-md"
                :rules="[val => !!val || 'Username is required']"
                lazy-rules
              />
              
              <q-input 
                outlined 
                v-model="editingUser.password" 
                label="Password" 
                :type="showEditPassword ? 'text' : 'password'"
                :rules="[val => !!val || 'Password is required']"
                lazy-rules
                class="q-mb-md"
              >
                <template v-slot:append>
                  <q-icon
                    :name="showEditPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showEditPassword = !showEditPassword"
                  />
                </template>
              </q-input>
            </q-card-section>

            <q-card-actions align="right">
              <q-btn flat label="Cancel" color="grey" v-close-popup />
              <q-btn label="Save" color="primary" @click="saveUserEdit" />
            </q-card-actions>
          </q-card>
        </q-dialog>

        <ManageUserRoles
          v-model="addRolesDialog"
          :selected-user="selectedUser"
          :available-roles="availableRoles"
          @save="handleSaveAddedRoles"
        />

        <!-- Delete Confirmation Dialog -->
        <q-dialog v-model="deleteDialog" persistent>
          <q-card>
            <q-card-section class="row items-center">
              <q-avatar icon="warning" color="warning" text-color="white" />
              <span class="q-ml-sm">Are you sure you want to delete this user?</span>
            </q-card-section>

            <q-card-actions align="right">
              <q-btn flat label="Cancel" color="grey" v-close-popup />
              <q-btn label="Delete" color="negative" @click="deleteUser" />
            </q-card-actions>
          </q-card>
        </q-dialog>

      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import AddNewUser from 'src/components/Usermanagement/AddNewUser.vue'
import UserList from 'src/components/Usermanagement/UserList.vue'
import ManageUserRoles from 'src/components/Usermanagement/ManageUserRoles.vue'
import { useUserManagementStore } from 'src/stores/usermanagementStore.js'
import { useAuthStore } from 'src/features/index.js'

const $q = useQuasar()
const router = useRouter()
const userStore = useUserManagementStore()
const authStore = useAuthStore()

const users = computed(() => userStore.users)

const showEditPassword = ref(false)

// Edit user
const editingUser = ref({})
const editDialog = ref(false)

// Add roles dialog
const addRolesDialog = ref(false)
const selectedUser = ref(null)

// Handle add user event from AddNewUser component
const handleAddUser = async () => {
  try {
    await userStore.fetchUsers()
  } catch (e) {
    console.error(e)
  }
}

// Delete user
const deleteDialog = ref(false)
const userToDelete = ref(null)

// Loading state
const loading = computed(() => userStore.loading)

// Permission gating
const has = (perm) =>
  authStore.isSuperAdmin ||
  authStore.permissions.includes('*') ||
  authStore.permissions.includes(perm)
computed(
  () => authStore.can('view', 'userManagement') || has('userManagement:view'),
)
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

// Available permissions sourced from Sidebar routes
const availableRoles = computed(() => {
  return router
    .getRoutes()
    .filter((r) => r.meta?.isSidebarItem)
    .map((r) => ({
      label: r.meta?.label || r.name,
      value: r.name,
      caption: r.meta?.caption || '',
    }))
})

// Pagination
const pagination = ref({
  sortBy: 'id',
  descending: false,
  page: 1,
  rowsPerPage: 10
})

const editUser = (user) => {
  editingUser.value = { ...user }
  editDialog.value = true
}

const saveUserEdit = async () => {
  try {
    await userStore.updateUser(editingUser.value.id, {
      username: editingUser.value.username,
      password: editingUser.value.password
    })
    editDialog.value = false
    $q.notify({
      type: 'positive',
      message: 'User updated successfully',
      position: 'top-right',
      icon: 'check_circle'
    })
  } catch (e) {
    console.error(e)
    $q.notify({
      type: 'negative',
      message: 'Failed to update user',
      position: 'top-right',
      icon: 'error'
    })
  }
}

// Role management methods
const addRolesToUser = (user) => {
  selectedUser.value = { ...user }
  addRolesDialog.value = true
}

// Permission selection logic handled in ManageUserRoles component

const handleSaveAddedRoles = async (permissions) => {
  if (!selectedUser.value) return
  try {
    const uniquePerms = Array.from(new Set(permissions))
    await userStore.updateUser(selectedUser.value.id, { permissions: uniquePerms })
    if (authStore.user?.uid && (selectedUser.value.uid === authStore.user.uid || selectedUser.value.email === authStore.user.email)) {
      authStore.setPermissions(uniquePerms)
    }
    addRolesDialog.value = false
    $q.notify({
      type: 'positive',
      message: `Updated permissions for ${selectedUser.value.username}`,
      icon: 'check_circle',
      position: 'top-right',
      timeout: 2000
    })
  } catch (e) {
    console.error(e)
    $q.notify({
      type: 'negative',
      message: 'Failed to update permissions',
      position: 'top-right',
      icon: 'error'
    })
  }
}

const confirmDeleteUser = (user) => {
  userToDelete.value = typeof user === 'string' ? user : user?.id
  deleteDialog.value = true
}

const deleteUser = async () => {
  try {
    await userStore.deleteUser(userToDelete.value)
    deleteDialog.value = false
    $q.notify({
      type: 'positive',
      message: 'User deleted successfully',
      position: 'top-right',
      icon: 'check_circle'
    })
  } catch (e) {
    console.error(e)
    $q.notify({
      type: 'negative',
      message: 'Failed to delete user',
      position: 'top-right',
      icon: 'error'
    })
  }
}

// Role color mapping handled in child components

// Initialize
onMounted(async () => {
  await userStore.fetchUsers()
})
</script>

<style scoped>
/* Table improvements carried by Quasar defaults */
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
