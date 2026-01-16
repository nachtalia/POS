<template>
  <q-card>
    <q-card-section>
      <div class="text-h6 text-blue-grey-8 q-mb-md">User List</div>

      <div class="row items-center justify-between q-mb-md">
        <div class="col-12 col-md-4">
          <q-input
            outlined
            v-model="search"
            placeholder="Search users..."
            dense
            clearable
          >
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
      </div>

      <q-table
        :rows="formattedUsers"
        :columns="columns"
        row-key="username"
        :loading="loading"
        :pagination="pagination"
        flat
        bordered
      >
        <template v-slot:body-cell-permissions="props">
          <q-td :props="props">
            <div class="permissions-container">
              <div v-if="!props.row.showAllPermissions" class="permissions-limited">
                <q-badge
                  v-for="permission in getLimitedPermissions(props.row)"
                  :key="permission"
                  :color="getPermissionColor(permission)"
                  class="q-px-sm q-py-xs q-mr-xs q-mb-xs"
                >{{ getPermissionLabel(permission) }}</q-badge>
                
                <q-badge
                  v-if="hasMorePermissions(props.row)"
                  color="grey-6"
                  class="q-px-sm q-py-xs q-mr-xs q-mb-xs cursor-pointer"
                  @click="togglePermissions(props.row)"
                >
                  +{{ getMoreCount(props.row) }} more
                </q-badge>
              </div>
              
              <div v-else class="permissions-full">
                <q-badge
                  v-for="permission in getAllPermissions(props.row)"
                  :key="permission"
                  :color="getPermissionColor(permission)"
                  class="q-px-sm q-py-xs q-mr-xs q-mb-xs"
                >{{ getPermissionLabel(permission) }}</q-badge>
                
                <q-badge
                  color="grey-6"
                  class="q-px-sm q-py-xs q-mr-xs q-mb-xs cursor-pointer"
                  @click="togglePermissions(props.row)"
                >
                  Show less
                </q-badge>
              </div>
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-createdAt="props">
          <q-td :props="props">
            {{ props.row.formattedCreatedAt || 'N/A' }}
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <div class="row no-wrap q-gutter-xs">
              <q-btn
                icon="add_box"
                size="sm"
                color="green"
                dense
                flat
                @click="$emit('manage-roles', props.row)"
                title="Manage Permissions"
                v-if="canManageRoles"
              />
              <q-btn
                icon="edit"
                size="sm"
                color="primary"
                dense
                flat
                @click="$emit('edit', props.row)"
                title="Edit User"
                v-if="canEditUser"
              />
              <q-btn
                icon="delete"
                size="sm"
                color="negative"
                dense
                flat
                @click="$emit('delete', props.row)"
                title="Delete User"
                v-if="canDeleteUser"
              />
            </div>
          </q-td>
        </template>

        <template v-slot:no-data>
          <div class="full-width row flex-center text-grey-6 q-pa-lg">
            <q-icon name="person_off" size="2em" class="q-mr-sm" />
            <span>No users found</span>
          </div>
        </template>
      </q-table>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  users: { type: Array, default: () => [] },
  availableRoles: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  pagination: { type: Object, default: () => ({ sortBy: 'username', descending: false, page: 1, rowsPerPage: 10 }) },
  canManageRoles: { type: Boolean, default: false },
  canEditUser: { type: Boolean, default: false },
  canDeleteUser: { type: Boolean, default: false },
})

defineEmits(['manage-roles', 'edit', 'delete'])

const search = ref('')
const expandedRows = ref({}) // Store which rows are expanded

const columns = [
  { name: 'username', label: 'Username', field: 'username', align: 'left', sortable: true },
  { name: 'permissions', label: 'Permissions', field: 'permissions', align: 'left', sortable: true },
  { name: 'createdAt', label: 'Created Date', field: 'formattedCreatedAt', align: 'left', sortable: true, width: '200px' },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center', sortable: false, width: '180px' },
]

const filteredUsers = computed(() => {
  let filtered = props.users
  if (search.value) {
    const searchTerm = search.value.toLowerCase()
    filtered = filtered.filter(user =>
      (user.username && user.username.toLowerCase().includes(searchTerm)) ||
      (Array.isArray(user.permissions) && user.permissions.some(p => String(p).toLowerCase().includes(searchTerm))) ||
      (Array.isArray(user.roles) && user.roles.some(role => String(role).toLowerCase().includes(searchTerm)))
    )
  }
  return filtered
})

const formattedUsers = computed(() => {
  return filteredUsers.value.map(user => {
    let dateValue = user.createdAt || user.created_at || user.createdDate ||
                    user.created_date || user.dateCreated || user.date_created ||
                    user.registrationDate || user.registration_date ||
                    user.created || user.date

    return {
      ...user,
      permissions: extractPermissions(user),
      formattedCreatedAt: formatFirestoreTimestamp(dateValue),
      showAllPermissions: expandedRows.value[user.username] || false
    }
  })
})

const formatFirestoreTimestamp = (timestamp) => {
  if (!timestamp) {
    return 'N/A'
  }

  try {
    let date
    
    // Check if it's a Firestore Timestamp object
    if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp && 'nanoseconds' in timestamp) {
      // It's a Firestore Timestamp object
      console.log('Firestore Timestamp object detected:', timestamp)
      // Convert to JavaScript Date
      date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000)
    } else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      // Alternative: if it has a toDate() method
      date = timestamp.toDate()
    } else if (timestamp instanceof Date) {
      // It's already a Date object
      date = timestamp
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      // It's a string or number that can be converted to Date
      date = new Date(timestamp)
    } else {
      // Unknown format, return string representation
      console.log('Unknown timestamp format:', timestamp)
      return String(timestamp)
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.log('Invalid date:', timestamp)
      return String(timestamp)
    }
    
    // Format to "January 15, 2026 at 10:00:10 PM UTC+8"
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    const month = monthNames[date.getMonth()]
    const day = date.getDate()
    const year = date.getFullYear()
    
    // Get time in 12-hour format for UTC+8 (add 8 hours for Philippine Time)
    const utcHours = date.getUTCHours()
    const phHours = (utcHours + 8) % 24
    let hours = phHours
    const minutes = date.getUTCMinutes().toString().padStart(2, '0')
    const seconds = date.getUTCSeconds().toString().padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    
    hours = hours % 12
    hours = hours ? hours : 12 // the hour '0' should be '12'
    const formattedHours = hours.toString().padStart(2, '0')
    
    // Return in exact format: "January 15, 2026 at 10:00:10 PM UTC+8"
    return `${month} ${day}, ${year} at ${formattedHours}:${minutes}:${seconds} ${ampm} UTC+8`
    
  } catch (e) {
    console.error('Timestamp formatting error:', e, 'for value:', timestamp)
    return String(timestamp)
  }
}

const getPermissionLabel = (value) => {
  const found = (props.availableRoles || []).find((r) => r.value === value)
  return found ? found.label : value
}

const getPermissionColor = (permission) => {
  switch (permission) {
    case 'admin': return 'red'
    case 'manager': return 'orange'
    case 'user': return 'blue'
    case 'editor': return 'purple'
    case 'viewer': return 'green'
    default: return 'grey'
  }
}

const extractPermissions = (user) => {
  const incoming = Array.isArray(user?.permissions)
    ? user.permissions
    : (Array.isArray(user?.roles) ? user.roles : [])
  return Array.from(new Set(incoming.map(p => String(p))))
}

const getAllPermissions = (row) => {
  return Array.isArray(row?.permissions) ? row.permissions : extractPermissions(row)
}

const getLimitedPermissions = (row) => {
  const allPermissions = getAllPermissions(row)
  return allPermissions.slice(0, 3) // Show only 3 permissions initially
}

const hasMorePermissions = (row) => {
  const allPermissions = getAllPermissions(row)
  return allPermissions.length > 3
}

const getMoreCount = (row) => {
  const allPermissions = getAllPermissions(row)
  return allPermissions.length - 3
}

const togglePermissions = (row) => {
  expandedRows.value[row.username] = !expandedRows.value[row.username]
}
</script>

<style scoped>
.permissions-container {
  min-height: 40px;
}

.permissions-limited,
.permissions-full {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: flex-start;
}

.q-badge {
  flex-shrink: 0;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  opacity: 0.8;
}
</style>