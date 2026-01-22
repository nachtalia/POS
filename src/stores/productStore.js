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
// IMPORT logEditAndGetDiff here
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
        const querySnapshot = await getDocs(collection(db, 'products'))
        this.products = querySnapshot.docs.map((doc) => Product.fromFirestore(doc))
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchHistory(entityId) {
      this.loading = true
      this.history = []
      try {
        const logsRef = collection(db, 'audit_logs')
        const q = query(logsRef, where('entityId', '==', entityId), orderBy('timestamp', 'desc'))
        const snapshot = await getDocs(q)
        this.history = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      } catch (error) {
        console.error('Error fetching product history:', error)
      } finally {
        this.loading = false
      }
    },

    async addProduct(productData) {
      try {
        const newProduct = new Product(productData)
        const docRef = await addDoc(collection(db, 'products'), newProduct.toFirestore())
        newProduct.id = docRef.id
        this.products.push(newProduct)

        await logAudit({
          module: 'inventory',
          action: 'add',
          entityType: 'product',
          entityId: docRef.id,
          details: newProduct.toFirestore(),
        })
      } catch (error) {
        console.error('Error adding product:', error)
        throw error
      }
    },

    async updateProduct(productId, partialData) {
      try {
        const updatePayload = {
          ...partialData,
          updatedAt: Timestamp.now(),
        }

        // --- CHANGED: Calculate Difference Before Update ---
        await logEditAndGetDiff('products', productId, updatePayload, 'inventory', 'product')

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
        await deleteDoc(doc(db, 'products', productId))
        this.products = this.products.filter((product) => product.id !== productId)

        await logAudit({
          module: 'inventory',
          action: 'delete',
          entityType: 'product',
          entityId: productId,
          details: null,
        })
      } catch (error) {
        console.error('Error deleting product:', error)
      }
    },
  },
})
