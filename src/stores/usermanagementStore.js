import { defineStore } from 'pinia'
// 1. ADDED: 'functions' to the import
import { db, secondaryAuth, functions } from 'src/services/firebase'
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
// 2. ADDED: 'httpsCallable'
import { httpsCallable } from 'firebase/functions'
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { logAudit, logEditAndGetDiff } from 'src/services/auditService'

export const useUserManagementStore = defineStore('usermanagementStore', {
  state: () => ({
    users: [],
    roles: [],
    history: [],
    loading: false,
  }),

  actions: {
    // ----------------------------------------------------------------
    // USER ACTIONS
    // ----------------------------------------------------------------
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

    // ----------------------------------------------------------------
    // UPDATED: updateUser logic to handle Cloud Function
    // ----------------------------------------------------------------
    async updateUser(id, updates) {
      try {
        const ref = doc(db, 'user', id)
        const safeUpdates = { ...(updates || {}) }

        // 1. Extract the password so we can use it later
        let newPassword = null
        if ('password' in safeUpdates) {
          newPassword = safeUpdates.password
          // Remove from payload so it doesn't get written to Firestore
          delete safeUpdates.password
        }

        const payload = { ...safeUpdates, updatedAt: Timestamp.now() }

        // Calculate Diff and Log (Firestore Data only)
        await logEditAndGetDiff('user', id, payload, 'userManagement', 'user')

        // 2. Update Firestore Metadata
        await updateDoc(ref, payload)

        // 3. Call Cloud Function if password exists
        if (newPassword && newPassword.length > 0) {
          console.log(`Updating password for user ${id}...`)
          const updatePasswordFn = httpsCallable(functions, 'adminUpdateUserPassword')

          await updatePasswordFn({
            targetUid: id,
            newPassword: newPassword,
          })

          // Optional: Audit log that password was changed (without logging the actual password)
          await logAudit({
            module: 'userManagement',
            action: 'change_password',
            entityType: 'user',
            entityId: id,
            details: { updatedBy: 'admin_action' },
          })
        }

        // 4. Update Local State
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

    // ----------------------------------------------------------------
    // ROLE ACTIONS
    // ----------------------------------------------------------------

    async fetchRoles() {
      try {
        const q = query(collection(db, 'roles'), orderBy('value'))
        const querySnapshot = await getDocs(q)

        const fetchedRoles = querySnapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))

        if (fetchedRoles.length > 0) {
          this.roles = fetchedRoles
        } else {
          this.roles = [{ label: 'Administrator', value: 'admin', permissions: ['*'] }]
        }
      } catch (error) {
        console.error('Error fetching roles:', error)
      }
    },

    async addRole(roleData) {
      this.loading = true
      try {
        // Use value as ID if possible, or auto-ID
        const roleId = roleData.value
          ? roleData.value.toLowerCase()
          : doc(collection(db, 'roles')).id

        const payload = {
          label: roleData.label,
          value: roleData.value || roleId,
          permissions: roleData.permissions || [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }

        await setDoc(doc(db, 'roles', roleId), payload)

        this.roles.push({ id: roleId, ...payload })

        await logAudit({
          module: 'userManagement',
          action: 'create_role',
          entityType: 'role',
          entityId: roleId,
          details: { label: roleData.label, permissions: roleData.permissions },
        })
      } catch (error) {
        console.error('Error creating role:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateRole(id, updates) {
      this.loading = true
      try {
        const ref = doc(db, 'roles', id)
        const payload = {
          ...updates,
          updatedAt: Timestamp.now(),
        }

        await logAudit({
          module: 'userManagement',
          action: 'update_role',
          entityType: 'role',
          entityId: id,
          details: updates,
        })

        await updateDoc(ref, payload)

        const index = this.roles.findIndex((r) => r.id === id)
        if (index !== -1) {
          this.roles[index] = { ...this.roles[index], ...payload }
        }
      } catch (error) {
        console.error('Error updating role:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteRole(id) {
      this.loading = true
      try {
        await deleteDoc(doc(db, 'roles', id))
        this.roles = this.roles.filter((r) => r.id !== id)

        await logAudit({
          module: 'userManagement',
          action: 'delete_role',
          entityType: 'role',
          entityId: id,
          details: null,
        })
      } catch (error) {
        console.error('Error deleting role:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
  },
})
