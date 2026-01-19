import { defineStore } from 'pinia'
import { db, secondaryAuth } from '../services/firebase'
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore'
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { logAudit } from '../services/auditService'

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

    // Updated addUser with Debug Logs
    async addUser(userData) {
      // DEBUG: Print what the store received
      console.log('--- STORE: addUser Called ---')
      console.log('Received Data:', userData)
      console.log('Permissions Check:', userData.permissions)

      // Destructure and provide defaults
      const { username, email, password, role, permissions = [] } = userData

      try {
        const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password)
        const uid = userCred.user.uid

        // Construct Payload
        const payload = {
          username,
          email,
          role,
          permissions: permissions, // Explicitly setting this
          uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }

        // DEBUG: Print what we are sending to Firestore
        console.log('--- STORE: Saving to Firestore ---')
        console.log('Payload:', payload)

        const docRef = await addDoc(collection(db, 'user'), payload)

        this.users.push({ id: docRef.id, ...payload })

        await logAudit({
          module: 'userManagement',
          action: 'add',
          entityType: 'user',
          entityId: docRef.id,
          details: { username, email, role, permissions },
        })

        await signOut(secondaryAuth)
        return docRef.id
      } catch (error) {
        console.error('Error adding user:', error)
        throw error
      }
    },

    async updateUser(id, updates) {
      try {
        const ref = doc(db, 'user', id)
        const safeUpdates = { ...(updates || {}) }
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
