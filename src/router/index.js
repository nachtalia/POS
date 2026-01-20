import { route } from 'quasar/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import routes from './routes'
import { useAuthStore } from 'src/features/index'

/* We destructure { store } here so we can pass it to Pinia */
export default route(function ({ store }) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  // --- NAVIGATION GUARD ---
  Router.beforeEach((to, from, next) => {
    // PASS THE STORE INSTANCE HERE
    const authStore = useAuthStore(store)

    // 1. Check if the route requires authentication
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

    // 2. Check if user is logged in
    // Because of the boot file, this is now GUARANTEED to be correct on reload
    const isAuthenticated = !!authStore.user

    // SCENARIO 1: Accessing Protected Route && NOT Logged In
    if (requiresAuth && !isAuthenticated) {
      if (to.name !== 'login') {
        next({ name: 'login' })
      } else {
        next()
      }
    }
    // SCENARIO 2: Accessing Login Page && ALREADY Logged In
    else if (to.name === 'login' && isAuthenticated) {
      next({ name: 'Dashboard' })
    }
    // SCENARIO 3: Accessing Protected Route && Logged In (Check Permissions)
    else if (requiresAuth && isAuthenticated) {
      const requiredPermissions = to.meta.permissions

      if (requiredPermissions) {
        const userPerms = authStore.permissions || []

        // Ensure userPerms is an array to prevent .includes errors
        const hasPermission =
          authStore.isSuperAdmin ||
          (Array.isArray(userPerms) && userPerms.includes('*')) ||
          (Array.isArray(userPerms) && requiredPermissions.some((p) => userPerms.includes(p)))

        if (hasPermission) {
          next()
        } else {
          next({ path: '/error-403' })
        }
      } else {
        next()
      }
    }
    // SCENARIO 4: Public Pages
    else {
      next()
    }
  })

  return Router
})
