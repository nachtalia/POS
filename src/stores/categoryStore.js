import { defineStore } from 'pinia'
import { db } from '../services/firebase'
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  // --- NEW: Imports for querying history ---
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { Category } from '../services/models/Category'
import { logAudit } from '../services/auditService'

export const useCategoryStore = defineStore('categoryStore', {
  state: () => ({
    categories: [],
    history: [], // --- NEW: State to store history logs ---
    loading: false,
  }),

  actions: {
    async fetchCategories() {
      this.loading = true
      try {
        const { useAuthStore } = await import('src/features/index')
        const authStore = useAuthStore()
        const branchId = authStore.branchId
        if (authStore.isMainAdmin) {
          this.categories = []
          this.loading = false
          return
        }
        if (!branchId) {
          this.categories = []
          this.loading = false
          return
        }
        const qRef = query(collection(db, 'categories'), where('branchId', '==', branchId))
        const querySnapshot = await getDocs(qRef)
        this.categories = querySnapshot.docs.map((doc) => Category.fromFirestore(doc))
      } catch (error) {
        console.error('Error fetching categories:', error)
      } finally {
        this.loading = false
      }
    },

    // --- NEW: Action to fetch history for a specific category ---
    async fetchHistory(entityId) {
      this.loading = true
      this.history = [] // Reset history before fetching
      try {
        const { useAuthStore } = await import('src/features/index')
        const authStore = useAuthStore()
        const branchId = authStore.branchId
        // Ensure 'audit_logs' matches the collection name in your database
        const logsRef = collection(db, 'audit_logs')

        // Query: Find logs for this entity ID, sorted by newest first
        try {
          const qRef = query(
            logsRef,
            where('branchId', '==', branchId),
            where('entityId', '==', entityId),
            orderBy('timestamp', 'desc'),
          )
          const snapshot = await getDocs(qRef)
          this.history = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        } catch (inner) {
          const message = String(inner?.message || '')
          const isIndexError = /requires an index/i.test(message)
          if (!isIndexError) throw inner
          const fallbackRef = query(
            logsRef,
            where('branchId', '==', branchId),
            where('entityId', '==', entityId),
          )
          const snapshot = await getDocs(fallbackRef)
          const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
          const toMillis = (ts) =>
            ts?.toDate
              ? ts.toDate().getTime()
              : typeof ts?.seconds === 'number'
                ? ts.seconds * 1000
                : 0
          list.sort((a, b) => toMillis(b.timestamp) - toMillis(a.timestamp))
          this.history = list
        }
      } catch (error) {
        console.error('Error fetching category history:', error)
      } finally {
        this.loading = false
      }
    },

    async addCategory(categoryData) {
      try {
        const { useAuthStore } = await import('src/features/index')
        const authStore = useAuthStore()
        const branchId = authStore.branchId
        const orgOwnerUid = authStore.orgOwnerUid
        if (authStore.isMainAdmin) throw new Error('Main account cannot add categories')
        const newCategory = new Category({ ...categoryData, branchId })

        const docRef = await addDoc(collection(db, 'categories'), newCategory.toFirestore())

        newCategory.id = docRef.id
        this.categories.push(newCategory)
        await logAudit({
          module: 'inventory',
          action: 'add',
          entityType: 'category',
          entityId: docRef.id,
          details: newCategory.toFirestore(),
          branchId,
          orgOwnerUid,
        })
      } catch (error) {
        console.error('Error adding category:', error)
        throw error
      }
    },

    async deleteCategory(categoryId) {
      try {
        const { useAuthStore } = await import('src/features/index')
        const authStore = useAuthStore()
        await deleteDoc(doc(db, 'categories', categoryId))
        this.categories = this.categories.filter((c) => c.id !== categoryId)
        await logAudit({
          module: 'inventory',
          action: 'delete',
          entityType: 'category',
          entityId: categoryId,
          details: null,
          branchId: authStore.branchId,
          orgOwnerUid: authStore.orgOwnerUid,
        })
      } catch (error) {
        console.error('Error deleting category:', error)
        throw error
      }
    },
  },
})
