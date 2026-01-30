import { boot } from 'quasar/wrappers'
import { auth, db } from 'src/services/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore'
import { useAuthStore } from 'src/features/index'

export default boot(async ({ store }) => {
  const authStore = useAuthStore(store)

  await new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'user', user.uid)
          const userSnap = await getDoc(userDocRef)

          if (userSnap.exists()) {
            const userData = userSnap.data()
            const role = userData.role || 'user'
            const normalizedRole = String(role).toLowerCase()
            const hydratedUser = {
              uid: user.uid,
              email: user.email,
              role,
              username: userData.username || user.displayName || user.email,
              orgOwnerUid: userData.orgOwnerUid || (normalizedRole === 'admin' ? user.uid : null),
            }

            authStore.setUser(hydratedUser)

            let branchId = userData.branchId
            if (!branchId && (normalizedRole === 'admin' || normalizedRole === 'superadmin')) {
              branchId = user.uid
            }
            authStore.setBranchId(branchId)
          } else {
            const existing = await getDocs(query(collection(db, 'user'), limit(1)))
            if (existing.empty) {
              const payload = {
                uid: user.uid,
                email: user.email,
                username: user.displayName || user.email,
                role: 'admin',
                orgOwnerUid: user.uid,
                branchId: user.uid,
                permissions: [],
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              }
              await setDoc(doc(db, 'user', user.uid), payload)
              authStore.setUser({
                uid: user.uid,
                email: user.email,
                role: 'admin',
                username: payload.username,
                orgOwnerUid: user.uid,
              })
              authStore.setBranchId(user.uid)
            } else {
              authStore.setUser({
                uid: user.uid,
                email: user.email,
                role: 'user',
                username: user.displayName || user.email,
                orgOwnerUid: null,
              })
              authStore.setPermissions([])
              authStore.setBranchId(null)
            }
          }
        } catch (error) {
          console.error('Error fetching permissions:', error)
          authStore.setPermissions([])
        }
      } else {
        authStore.setUser(null)
        authStore.setPermissions([])
        authStore.setBranchId(null)
      }

      unsubscribe()
      resolve()
    })
  })
})
