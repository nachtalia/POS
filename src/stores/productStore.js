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
  orderBy,
} from 'firebase/firestore'
import { Product } from '../services/models/Product'
import { logAudit, logEditAndGetDiff } from '../services/auditService'

export const useProductStore = defineStore('productStore', {
  state: () => ({
    products: [],
    history: [],
    loading: false,
  }),

  actions: {
    async fetchProducts() {
      this.loading = true
      try {
        const { useAuthStore } = await import('src/features/index')
        const authStore = useAuthStore()
        const branchId = authStore.branchId

        let q
        if (authStore.isMainAdmin) {
          this.products = []
          this.loading = false
          return
        } else if (branchId) {
          q = query(collection(db, 'products'), where('branchId', '==', branchId))
        } else {
          this.products = []
          this.loading = false
          return
        }

        const querySnapshot = await getDocs(q)
        this.products = querySnapshot.docs.map((doc) => Product.fromFirestore(doc))
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchProductsForDashboard(branchIds) {
      const { useAuthStore } = await import('src/features/index')
      const authStore = useAuthStore()
      if (!authStore.isMainAdmin) return

      const ids = Array.from(new Set((branchIds || []).filter(Boolean)))
      this.loading = true
      try {
        if (ids.length === 0) {
          this.products = []
          return
        }
        const snapshots = await Promise.all(
          ids.map((id) => getDocs(query(collection(db, 'products'), where('branchId', '==', id)))),
        )
        const list = []
        snapshots.forEach((snap) => {
          snap.docs.forEach((d) => list.push(Product.fromFirestore(d)))
        })
        this.products = list
      } catch (error) {
        console.error('Error fetching dashboard products:', error)
        this.products = []
      } finally {
        this.loading = false
      }
    },

    async fetchHistory(entityId) {
      this.loading = true
      this.history = []
      try {
        const { useAuthStore } = await import('src/features/index')
        const authStore = useAuthStore()
        const branchId = authStore.branchId
        const logsRef = collection(db, 'audit_logs')
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
        console.error('Error fetching product history:', error)
      } finally {
        this.loading = false
      }
    },

    async addProduct(productData) {
      try {
        const { useAuthStore } = await import('src/features/index')
        const authStore = useAuthStore()
        const branchId = authStore.branchId
        const orgOwnerUid = authStore.orgOwnerUid
        if (authStore.isMainAdmin) throw new Error('Main account cannot add products')

        const newProduct = new Product({
          ...productData,
          branchId,
        })
        const docRef = await addDoc(collection(db, 'products'), newProduct.toFirestore())
        newProduct.id = docRef.id
        this.products.push(newProduct)

        await logAudit({
          module: 'inventory',
          action: 'add',
          entityType: 'product',
          entityId: docRef.id,
          details: newProduct.toFirestore(),
          branchId,
          orgOwnerUid,
        })
      } catch (error) {
        console.error('Error adding product:', error)
        throw error
      }
    },

    async updateProduct(productId, partialData) {
      try {
        const { useAuthStore } = await import('src/features/index')
        const authStore = useAuthStore()
        const branchId = authStore.branchId
        const orgOwnerUid = authStore.orgOwnerUid

        const updatePayload = {
          ...partialData,
          updatedAt: Timestamp.now(),
        }

        await logEditAndGetDiff(
          'products',
          productId,
          updatePayload,
          'inventory',
          'product',
          branchId,
          orgOwnerUid,
        )

        await updateDoc(doc(db, 'products', productId), updatePayload)

        const index = this.products.findIndex((p) => p.id === productId)
        if (index !== -1) {
          const updatedInstance = new Product({
            ...this.products[index],
            ...updatePayload,
            updatedAt: updatePayload.updatedAt,
          })
          this.products[index] = updatedInstance
        }
      } catch (error) {
        console.error('Error updating product:', error)
        throw error
      }
    },

    async deleteProduct(productId) {
      try {
        const { useAuthStore } = await import('src/features/index')
        const authStore = useAuthStore()
        await deleteDoc(doc(db, 'products', productId))
        this.products = this.products.filter((product) => product.id !== productId)

        await logAudit({
          module: 'inventory',
          action: 'delete',
          entityType: 'product',
          entityId: productId,
          details: null,
          branchId: authStore.branchId,
          orgOwnerUid: authStore.orgOwnerUid,
        })
      } catch (error) {
        console.error('Error deleting product:', error)
      }
    },
  },
})
