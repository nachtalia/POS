import { defineStore } from 'pinia'
import { db } from '../services/firebase'
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore'
import { Addon } from '../services/models/Addon'
import { logAudit } from '../services/auditService'

export const useAddonStore = defineStore('addonStore', {
  state: () => ({
    addons: [],
    loading: false
  }),

  actions: {
    async fetchAddons() {
      this.loading = true
      try {
        const querySnapshot = await getDocs(collection(db, 'addons'))
        this.addons = querySnapshot.docs.map(d => Addon.fromFirestore(d))
      } catch (e) {
        console.error('Error fetching addons:', e)
      } finally {
        this.loading = false
      }
    },
    async addAddon(data) {
      try {
        const addon = new Addon(data)
        const ref = await addDoc(collection(db, 'addons'), addon.toFirestore())
        addon.id = ref.id
        this.addons.push(addon)
        await logAudit({
          module: 'inventory',
          action: 'add',
          entityType: 'addon',
          entityId: ref.id,
          details: addon.toFirestore()
        })
      } catch (e) {
        console.error('Error adding addon:', e)
        throw e
      }
    },
    async updateAddon(id, partial) {
      try {
        const payload = { ...partial, updatedAt: Timestamp.now() }
        await updateDoc(doc(db, 'addons', id), payload)
        const idx = this.addons.findIndex(a => a.id === id)
        if (idx !== -1) {
          const updated = new Addon({ ...this.addons[idx], ...payload, updatedAt: payload.updatedAt })
          this.addons[idx] = updated
        }
        await logAudit({
          module: 'inventory',
          action: 'edit',
          entityType: 'addon',
          entityId: id,
          details: payload
        })
      } catch (e) {
        console.error('Error updating addon:', e)
        throw e
      }
    },
    async deleteAddon(id) {
      try {
        await deleteDoc(doc(db, 'addons', id))
        this.addons = this.addons.filter(a => a.id !== id)
        await logAudit({
          module: 'inventory',
          action: 'delete',
          entityType: 'addon',
          entityId: id,
          details: null
        })
      } catch (e) {
        console.error('Error deleting addon:', e)
        throw e
      }
    }
  }
})
