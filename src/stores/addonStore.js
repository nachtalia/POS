import { defineStore } from 'pinia'
import { db } from '../services/firebase'
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  Timestamp,
  query,
  where,
} from 'firebase/firestore'
import { Addon } from '../services/models/Addon'
import { logAudit } from '../services/auditService'

export const useAddonStore = defineStore('addonStore', {
  state: () => ({
    addons: [],
    loading: false,
  }),

  actions: {
    async fetchAddons() {
      this.loading = true
      try {
        const { useAuthStore } = await import('src/features/index')
        const authStore = useAuthStore()
        const branchId = authStore.branchId
        if (authStore.isMainAdmin) {
          this.addons = []
          this.loading = false
          return
        }
        if (!branchId) {
          this.addons = []
          this.loading = false
          return
        }
        const q = query(collection(db, 'addons'), where('branchId', '==', branchId))
        const querySnapshot = await getDocs(q)
        this.addons = querySnapshot.docs.map((d) => Addon.fromFirestore(d))
      } catch (e) {
        console.error('Error fetching addons:', e)
      } finally {
        this.loading = false
      }
    },
    async addAddon(data) {
      try {
        const { useAuthStore } = await import('src/features/index')
        const authStore = useAuthStore()
        const branchId = authStore.branchId
        const orgOwnerUid = authStore.orgOwnerUid
        if (authStore.isMainAdmin) throw new Error('Main account cannot add addons')
        const addon = new Addon({ ...data, branchId })
        const ref = await addDoc(collection(db, 'addons'), addon.toFirestore())
        addon.id = ref.id
        this.addons.push(addon)
        await logAudit({
          module: 'inventory',
          action: 'add',
          entityType: 'addon',
          entityId: ref.id,
          details: addon.toFirestore(),
          branchId,
          orgOwnerUid,
        })
      } catch (e) {
        console.error('Error adding addon:', e)
        throw e
      }
    },
    async updateAddon(id, partial) {
      try {
        const { useAuthStore } = await import('src/features/index')
        const authStore = useAuthStore()
        const payload = { ...partial, updatedAt: Timestamp.now() }
        await updateDoc(doc(db, 'addons', id), payload)
        const idx = this.addons.findIndex((a) => a.id === id)
        if (idx !== -1) {
          const updated = new Addon({
            ...this.addons[idx],
            ...payload,
            updatedAt: payload.updatedAt,
          })
          this.addons[idx] = updated
        }
        await logAudit({
          module: 'inventory',
          action: 'edit',
          entityType: 'addon',
          entityId: id,
          details: payload,
          branchId: authStore.branchId,
          orgOwnerUid: authStore.orgOwnerUid,
        })
      } catch (e) {
        console.error('Error updating addon:', e)
        throw e
      }
    },
    async deleteAddon(id) {
      try {
        const { useAuthStore } = await import('src/features/index')
        const authStore = useAuthStore()
        await deleteDoc(doc(db, 'addons', id))
        this.addons = this.addons.filter((a) => a.id !== id)
        await logAudit({
          module: 'inventory',
          action: 'delete',
          entityType: 'addon',
          entityId: id,
          details: null,
          branchId: authStore.branchId,
          orgOwnerUid: authStore.orgOwnerUid,
        })
      } catch (e) {
        console.error('Error deleting addon:', e)
        throw e
      }
    },
  },
})
