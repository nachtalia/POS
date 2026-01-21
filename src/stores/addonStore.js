import { defineStore } from 'pinia'
import { db } from '../services/firebase'
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore'
import { Addon } from '../services/models/Addon'
import { Category } from '../services/models/Category'
import { logAudit } from '../services/auditService'

export const useAddonStore = defineStore('addonStore', {
  state: () => ({
    addons: [],
    addonCategories: [],
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
    async fetchAddonCategories() {
      try {
        const snap = await getDocs(collection(db, 'addonCategories'))
        this.addonCategories = snap.docs.map((d) => Category.fromFirestore(d))
      } catch (e) {
        console.error('Error fetching addon categories:', e)
      }
    },
    async addAddonCategory(data) {
      try {
        const cat = new Category(data)
        const ref = await addDoc(collection(db, 'addonCategories'), cat.toFirestore())
        cat.id = ref.id
        this.addonCategories.push(cat)
        await logAudit({
          module: 'inventory',
          action: 'add',
          entityType: 'addonCategory',
          entityId: ref.id,
          details: cat.toFirestore()
        })
      } catch (e) {
        console.error('Error adding addon category:', e)
        throw e
      }
    },
    async deleteAddonCategory(id) {
      try {
        await deleteDoc(doc(db, 'addonCategories', id))
        this.addonCategories = this.addonCategories.filter((c) => c.id !== id)
        await logAudit({
          module: 'inventory',
          action: 'delete',
          entityType: 'addonCategory',
          entityId: id,
          details: null
        })
      } catch (e) {
        console.error('Error deleting addon category:', e)
        throw e
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
