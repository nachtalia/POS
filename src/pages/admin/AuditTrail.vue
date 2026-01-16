<template>
  <q-page padding class="bg-app">
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card class="glass-card">
          <q-card-section>
            <div class="text-h6">Audit Trail</div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div class="row q-col-gutter-sm q-mb-md">
              <div class="col-12 col-md-3">
                <q-select v-model="filterModule" :options="moduleOptions" outlined dense label="Module" emit-value />
              </div>
              <div class="col-12 col-md-3">
                <q-select v-model="filterAction" :options="actionOptions" outlined dense label="Action" emit-value />
              </div>
              <div class="col-12 col-md-4">
                <q-input v-model="searchQuery" outlined dense placeholder="Search (email, type, id)">
                  <template v-slot:prepend><q-icon name="search" /></template>
                </q-input>
              </div>
              <div class="col-12 col-md-2">
                <q-btn color="primary" icon="refresh" label="Refresh" unelevated @click="fetchLogs" :loading="loading" />
              </div>
            </div>
            <q-table
              :rows="filteredLogs"
              :columns="columns"
              row-key="id"
              :loading="loading"
              flat
              bordered
              :pagination="pagination"
            >
              <template v-slot:body-cell-timestamp="props">
                <q-td :props="props">
                  {{ formatDate(props.row.timestamp) }}
                </q-td>
              </template>
              <template v-slot:no-data>
                <div class="full-width row flex-center q-gutter-sm q-pa-lg text-grey-8">
                  <q-icon size="2em" name="history" />
                  <span>Walang na-log na aksyon</span>
                </div>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { db } from 'src/services/firebase'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'

const $q = useQuasar()
const loading = ref(false)
const logs = ref([])
const filterModule = ref('All')
const filterAction = ref('All')
const searchQuery = ref('')
const moduleOptions = ['All', 'inventory', 'ordering', 'userManagement']
const actionOptions = ['All', 'add', 'edit', 'delete']

const columns = [
  { name: 'timestamp', label: 'Time', field: 'timestamp', align: 'left', sortable: true },
  { name: 'userEmail', label: 'User', field: 'userEmail', align: 'left', sortable: true },
  { name: 'module', label: 'Module', field: 'module', align: 'left', sortable: true },
  { name: 'action', label: 'Action', field: 'action', align: 'left', sortable: true },
  { name: 'entityType', label: 'Type', field: 'entityType', align: 'left', sortable: true },
  { name: 'entityId', label: 'ID', field: 'entityId', align: 'left' },
]

const pagination = ref({ rowsPerPage: 10 })

const fetchLogs = async () => {
  loading.value = true
  try {
    const qRef = query(collection(db, 'audit_trail'), orderBy('timestamp', 'desc'))
    const snap = await getDocs(qRef)
    logs.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    if (!logs.value.length) {
      $q.notify({ color: 'warning', message: 'Wala pang logs', icon: 'history' })
    }
  } catch (e) {
    console.error(e)
    $q.notify({ color: 'negative', message: 'Error loading audit trail', icon: 'report_problem' })
  } finally {
    loading.value = false
  }
}

const formatDate = (ts) => {
  try {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000)
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).format(d)
  } catch {
    return ''
  }
}

const filteredLogs = computed(() => {
  let list = logs.value || []
  if (filterModule.value !== 'All') {
    list = list.filter(l => l.module === filterModule.value)
  }
  if (filterAction.value !== 'All') {
    list = list.filter(l => l.action === filterAction.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(l => 
      (l.userEmail || '').toLowerCase().includes(q) ||
      (l.entityType || '').toLowerCase().includes(q) ||
      (String(l.entityId || '')).toLowerCase().includes(q)
    )
  }
  return list
})

onMounted(fetchLogs)
</script>
