import { boot } from 'quasar/wrappers'
import { auth, db } from 'src/services/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useAuthStore } from 'src/features/index'

export default boot(async ({ store }) => {
  const authStore = useAuthStore(store)

  await new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        authStore.user = user

        try {
          // --- THE FIX IS HERE ---
          // Changed 'users' to 'user' to match your Firestore screenshot
          const userDocRef = doc(db, 'user', user.uid)
          const userSnap = await getDoc(userDocRef)

          if (userSnap.exists()) {
            const userData = userSnap.data()

            // Hydrate store
            authStore.permissions = userData.permissions || []
            authStore.role = userData.role || 'user'

            // Optional: Store the DB ID if needed
            // authStore.dbId = userSnap.id
          } else {
            console.error('User logged in, but no profile found in "user" collection')
            authStore.permissions = []
          }
        } catch (error) {
          console.error('Error fetching permissions:', error)
          authStore.permissions = []
        }
      } else {
        authStore.user = null
        authStore.permissions = []
      }

      unsubscribe()
      resolve()
    })
  })
})
