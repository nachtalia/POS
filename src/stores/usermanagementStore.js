import { defineStore } from 'pinia'
import { db, secondaryAuth } from 'src/services/firebase'
import {
  collection,
  getDocs,
  setDoc, // <--- CHANGED: Import setDoc instead of addDoc
  deleteDoc,
  doc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore'
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { logAudit } from 'src/services/auditService'

export const useUserManagementStore = defineStore('usermanagementStore', {
  state: () => ({
    users: [],
    loading: false,
  }),

  actions: {
    async fetchUsers() {
      this.loading = true
      try {
        const querySnapshot = await getDocs(collection(db, 'user'))
        this.users = querySnapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        this.loading = false
      }
    },

    // Updated addUser
    async addUser(userData) {
      console.log('--- STORE: addUser Called ---', userData)

      const { username, email, password, role, permissions = [] } = userData

      try {
        // 1. Create User in Firebase Auth
        const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password)
        const uid = userCred.user.uid // Get the actual Auth UID

        // 2. Construct Payload
        const payload = {
          username,
          email,
          role,
          permissions: permissions,
          uid, // Store UID inside document too (optional but helpful)
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }

        console.log('--- STORE: Saving to Firestore with ID:', uid)

        // 3. CRITICAL CHANGE: Use setDoc with the UID
        // This ensures Document ID === Auth UID
        await setDoc(doc(db, 'user', uid), payload)

        // 4. Update Local State
        this.users.push({ id: uid, ...payload })

        // 5. Audit Log
        await logAudit({
          module: 'userManagement',
          action: 'add',
          entityType: 'user',
          entityId: uid, // Use the UID as the reference
          details: { username, email, role, permissions },
        })

        // 6. Sign out the secondary auth (so it doesn't interfere with current session)
        await signOut(secondaryAuth)

        return uid
      } catch (error) {
        console.error('Error adding user:', error)
        throw error
      }
    },

    async updateUser(id, updates) {
      try {
        const ref = doc(db, 'user', id)
        const safeUpdates = { ...(updates || {}) }

        // Don't save password to Firestore
        if ('password' in safeUpdates) {
          delete safeUpdates.password
        }

        const payload = { ...safeUpdates, updatedAt: Timestamp.now() }

        await updateDoc(ref, payload)

        const idx = this.users.findIndex((u) => u.id === id)
        if (idx !== -1) {
          this.users[idx] = { ...this.users[idx], ...payload }
        }

        await logAudit({
          module: 'userManagement',
          action: 'edit',
          entityType: 'user',
          entityId: id,
          details: safeUpdates,
        })
      } catch (error) {
        console.error('Error updating user:', error)
        throw error
      }
    },

    async deleteUser(id) {
      try {
        // Note: This only deletes from Firestore.
        // Deleting from Auth requires Cloud Functions if done from the client SDK
        // (unless you log in as that user, which you can't easily do here).
        await deleteDoc(doc(db, 'user', id))

        this.users = this.users.filter((u) => u.id !== id)

        await logAudit({
          module: 'userManagement',
          action: 'delete',
          entityType: 'user',
          entityId: id,
          details: null,
        })
      } catch (error) {
        console.error('Error deleting user:', error)
        throw error
      }
    },
  },
})
