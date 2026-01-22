import { defineStore } from 'pinia'
import { db, secondaryAuth } from 'src/services/firebase'
import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  updateDoc,
  Timestamp,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth'
// IMPORT logEditAndGetDiff here
import { logAudit, logEditAndGetDiff } from 'src/services/auditService'

export const useUserManagementStore = defineStore('usermanagementStore', {
  state: () => ({
    users: [],
    history: [],
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
        console.error('Error fetching user history:', error)
      } finally {
        this.loading = false
      }
    },

    async addUser(userData) {
      const { username, email, password, role, permissions = [] } = userData

      try {
        const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password)
        const uid = userCred.user.uid

        const payload = {
          username,
          email,
          role,
          permissions: permissions,
          uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }

        await setDoc(doc(db, 'user', uid), payload)

        this.users.push({ id: uid, ...payload })

        await logAudit({
          module: 'userManagement',
          action: 'add',
          entityType: 'user',
          entityId: uid,
          details: { username, email, role, permissions },
        })

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

        if ('password' in safeUpdates) {
          delete safeUpdates.password
        }

        const payload = { ...safeUpdates, updatedAt: Timestamp.now() }

        // --- CHANGED: Calculate Diff ---
        // 'user' is the collection name for your users
        await logEditAndGetDiff('user', id, payload, 'userManagement', 'user')

        await updateDoc(ref, payload)

        const idx = this.users.findIndex((u) => u.id === id)
        if (idx !== -1) {
          this.users[idx] = { ...this.users[idx], ...payload }
        }
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
