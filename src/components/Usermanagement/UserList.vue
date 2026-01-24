<template>
  <q-card>
    <q-card-section>
      <div class="text-h6 text-blue-grey-8 q-mb-md">User List</div>

      <div class="row items-center justify-between q-mb-md">
        <div class="col-12 col-md-4">
          <q-input
            outlined
            v-model="search"
            placeholder="Search users, roles, or permissions..."
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
        :grid="$q.screen.xs"
        flat
        bordered
      >
        <template v-slot:body-cell-role="props">
          <q-td :props="props">
            <q-chip
              dense
              :color="getRoleColor(props.row.role)"
              text-color="white"
              size="sm"
              class="text-weight-bold"
            >
              {{ getRoleLabel(props.row.role) }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-permissions="props">
          <q-td :props="props">
            <div class="permissions-container">
              <div v-if="!props.row.showAllPermissions" class="permissions-limited">
                <q-badge
                  v-for="permission in getLimitedPermissions(props.row)"
                  :key="permission"
                  color="grey-3"
                  text-color="grey-9"
                  class="q-px-sm q-py-xs q-mr-xs q-mb-xs border-grey"
                >
                  {{ permission }}
                </q-badge>

                <q-badge
                  v-if="hasMorePermissions(props.row)"
                  color="primary"
                  class="q-px-sm q-py-xs q-mr-xs q-mb-xs cursor-pointer"
                  @click.stop="togglePermissions(props.row)"
                >
                  +{{ getMoreCount(props.row) }} more
                </q-badge>
              </div>

              <div v-else class="permissions-full">
                <q-badge
                  v-for="permission in getAllPermissions(props.row)"
                  :key="permission"
                  color="grey-3"
                  text-color="grey-9"
                  class="q-px-sm q-py-xs q-mr-xs q-mb-xs border-grey"
                >
                  {{ permission }}
                </q-badge>

                <q-badge
                  color="primary"
                  outline
                  class="q-px-sm q-py-xs q-mr-xs q-mb-xs cursor-pointer"
                  @click.stop="togglePermissions(props.row)"
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
            <div class="row no-wrap q-gutter-xs justify-center">
              <q-btn
                icon="settings"
                size="sm"
                color="green"
                dense
                flat
                @click="$emit('manage-roles', props.row)"
                title="Manage Permissions"
                v-if="canManageRoles"
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

        <template v-slot:item="props">
          <div class="q-pa-xs col-xs-12 col-sm-6 col-md-4">
            <q-card flat bordered class="q-mb-sm">
              <q-card-section class="row justify-between items-center q-pb-none">
                <div class="text-subtitle1 text-weight-bold">{{ props.row.username }}</div>
                <q-chip
                  dense
                  :color="getRoleColor(props.row.role)"
                  text-color="white"
                  size="sm"
                  class="text-weight-bold"
                >
                  {{ getRoleLabel(props.row.role) }}
                </q-chip>
              </q-card-section>

              <q-card-section>
                <div class="text-caption text-grey-7 q-mb-xs">Permissions:</div>
                <div class="permissions-container-mobile">
                  <div v-if="!props.row.showAllPermissions" class="permissions-limited">
                    <q-badge
                      v-for="permission in getLimitedPermissions(props.row)"
                      :key="permission"
                      color="grey-3"
                      text-color="grey-9"
                      class="q-px-sm q-py-xs q-mr-xs q-mb-xs border-grey"
                    >
                      {{ permission }}
                    </q-badge>
                    <q-badge
                      v-if="hasMorePermissions(props.row)"
                      color="primary"
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
                      color="grey-3"
                      text-color="grey-9"
                      class="q-px-sm q-py-xs q-mr-xs q-mb-xs border-grey"
                    >
                      {{ permission }}
                    </q-badge>
                    <q-badge
                      color="primary"
                      outline
                      class="q-px-sm q-py-xs q-mr-xs q-mb-xs cursor-pointer"
                      @click="togglePermissions(props.row)"
                    >
                      Show less
                    </q-badge>
                  </div>
                </div>
              </q-card-section>

              <q-separator />

              <q-card-actions align="right" class="row items-center">
                <div class="text-caption text-grey q-mr-auto q-pl-sm">
                  Created: {{ props.row.formattedCreatedAt || 'N/A' }}
                </div>

                <q-btn
                  icon="settings"
                  size="sm"
                  color="green"
                  dense
                  flat
                  round
                  @click="$emit('manage-roles', props.row)"
                  v-if="canManageRoles"
                />
                <q-btn
                  icon="delete"
                  size="sm"
                  color="negative"
                  dense
                  flat
                  round
                  @click="$emit('delete', props.row)"
                  v-if="canDeleteUser"
                />
              </q-card-actions>
            </q-card>
          </div>
        </template>
      </q-table>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar' // 1. Import useQuasar

const $q = useQuasar() // 2. Initialize

const props = defineProps({
  users: { type: Array, default: () => [] },
  availableRoles: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  pagination: {
    type: Object,
    default: () => ({ sortBy: 'username', descending: false, page: 1, rowsPerPage: 10 }),
  },
  canManageRoles: { type: Boolean, default: false },
  canEditUser: { type: Boolean, default: false },
  canDeleteUser: { type: Boolean, default: false },
})

defineEmits(['manage-roles', 'edit', 'delete'])

const search = ref('')
const expandedRows = ref({})

const columns = [
  { name: 'username', label: 'Username', field: 'username', align: 'left', sortable: true },
  { name: 'role', label: 'Role', field: 'role', align: 'left', sortable: true, width: '150px' },
  {
    name: 'permissions',
    label: 'Permissions',
    field: 'permissions',
    align: 'left',
    sortable: false,
  },
  {
    name: 'createdAt',
    label: 'Created Date',
    field: 'formattedCreatedAt',
    align: 'left',
    sortable: true,
    width: '220px',
  },
  {
    name: 'actions',
    label: 'Actions',
    field: 'actions',
    align: 'center',
    sortable: false,
    width: '150px',
  },
]

// Search Filter
const filteredUsers = computed(() => {
  let filtered = props.users
  if (search.value) {
    const term = search.value.toLowerCase()
    filtered = filtered.filter(
      (user) =>
        (user.username && user.username.toLowerCase().includes(term)) ||
        (user.role && user.role.toLowerCase().includes(term)) ||
        (Array.isArray(user.permissions) &&
          user.permissions.some((p) => String(p).toLowerCase().includes(term))),
    )
  }
  return filtered
})

// Format Data
const formattedUsers = computed(() => {
  return filteredUsers.value.map((user) => {
    let dateValue = user.createdAt || user.created_at || user.dateCreated || user.date
    return {
      ...user,
      permissions: extractPermissions(user),
      formattedCreatedAt: formatFirestoreTimestamp(dateValue),
      showAllPermissions: expandedRows.value[user.username] || false,
    }
  })
})

// --- ROLE DISPLAY LOGIC ---
const getRoleLabel = (roleValue) => {
  if (!roleValue) return 'No Role'
  const found = props.availableRoles.find((r) => r.value === roleValue)
  if (found) return found.label
  return roleValue
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const getRoleColor = (roleValue) => {
  if (!roleValue) return 'grey'
  const r = roleValue.toLowerCase()
  if (r === 'admin') return 'negative'
  if (r.includes('manager')) return 'deep-orange'
  if (r === 'cashier') return 'blue'
  if (r === 'clerk' || r === 'inventory') return 'teal'
  return 'blue-grey'
}

// Helpers
const formatFirestoreTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A'
  try {
    let date
    if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
      date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000)
    } else if (timestamp.toDate) {
      date = timestamp.toDate()
    } else {
      date = new Date(timestamp)
    }
    if (isNaN(date.getTime())) return String(timestamp)
    return new Intl.DateTimeFormat('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date)
  } catch {
    return String(timestamp)
  }
}

const extractPermissions = (user) => {
  const incoming = Array.isArray(user?.permissions) ? user.permissions : []
  return Array.from(new Set(incoming.map((p) => String(p))))
}

const getAllPermissions = (row) => row.permissions
const getLimitedPermissions = (row) => getAllPermissions(row).slice(0, 3)
const hasMorePermissions = (row) => getAllPermissions(row).length > 3
const getMoreCount = (row) => getAllPermissions(row).length - 3
const togglePermissions = (row) => {
  expandedRows.value[row.username] = !expandedRows.value[row.username]
}
</script>

<style scoped>
.permissions-container {
  min-height: 40px;
}
.permissions-container-mobile {
  min-height: auto;
}
.permissions-limited,
.permissions-full {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}
.border-grey {
  border: 1px solid #e0e0e0;
}
.cursor-pointer {
  cursor: pointer;
}
.cursor-pointer:hover {
  opacity: 0.8;
}
</style>
