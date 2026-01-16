import { defineStore } from 'pinia'
import { db } from '../services/firebase' 
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore'
import { Product } from '../services/models/Product' // <--- 1. Import the Model
import { logAudit } from '../services/auditService'

export const useProductStore = defineStore('productStore', {
  state: () => ({
    products: [],
    loading: false
  }),

  actions: {
    async fetchProducts() {
      this.loading = true
      try {
        const querySnapshot = await getDocs(collection(db, "products"))
        // 2. Use the static factory method to create clean Product instances
        this.products = querySnapshot.docs.map(doc => Product.fromFirestore(doc))
      } catch (error) {
        console.error("Error fetching products:", error)
      } finally {
        this.loading = false
      }
    },

    async addProduct(productData) {
      try {
        // 3. Create a new instance to sanitize data / defaults
        const newProduct = new Product(productData)
        
        // 4. Send formatted data to Firestore
        const docRef = await addDoc(collection(db, "products"), newProduct.toFirestore())
        
        // 5. Update local state with the ID and the clean instance
        newProduct.id = docRef.id
        this.products.push(newProduct)
        await logAudit({
          module: 'inventory',
          action: 'add',
          entityType: 'product',
          entityId: docRef.id,
          details: newProduct.toFirestore()
        })
      } catch (error) {
        console.error("Error adding product:", error)
        throw error // Re-throw so the UI knows it failed
      }
    },

    async updateProduct(productId, partialData) {
      try {
        // 6. Add an 'updatedAt' timestamp to the payload automatically
        const updatePayload = {
            ...partialData,
            updatedAt: Timestamp.now()
        }

        await updateDoc(doc(db, "products", productId), updatePayload)

        // 7. Update local state while keeping the item as a Class Instance
        const index = this.products.findIndex(p => p.id === productId)
        if (index !== -1) {
            // Merge existing data with updates and recreate the Product instance
            // This ensures the item in your array remains a valid Product object
            const updatedInstance = new Product({ 
                ...this.products[index], 
                ...updatePayload,
                // Convert Timestamp back to Date/null for the local UI instance immediately
                updatedAt: updatePayload.updatedAt 
            })
            this.products[index] = updatedInstance
        }
        await logAudit({
          module: 'inventory',
          action: 'edit',
          entityType: 'product',
          entityId: productId,
          details: updatePayload
        })
      } catch (error) {
        console.error("Error updating product:", error)
        throw error
      }
    },

    async deleteProduct(productId) {
      try {
        await deleteDoc(doc(db, "products", productId))
        this.products = this.products.filter(product => product.id !== productId)
        await logAudit({
          module: 'inventory',
          action: 'delete',
          entityType: 'product',
          entityId: productId,
          details: null
        })
      } catch (error) {
        console.error("Error deleting product:", error)
      }
    }
  }
})
