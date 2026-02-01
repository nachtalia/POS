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

    // 0. EXPLICITLY ALLOW CUSTOMER ROUTES (Bypass Auth)
    if (to.path.startsWith('/customer') || to.name === 'CustomerTableOrder') {
      next()
      return
    }

    // 1. Check if the route requires authentication
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

    // 2. Check if user is logged in
    const isAuthenticated = !!authStore.user

    // Helper: Get Role safely
    const userRole = authStore.user?.role || ''

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
      const isMainOnly = to.matched.some((record) => record.meta?.mainOnly)
      const isBranchOnly = to.matched.some((record) => record.meta?.branchOnly)
      if (isMainOnly && !authStore.isMainAdmin) {
        next({ path: '/error-403' })
        return
      }
      if (isBranchOnly && authStore.isMainAdmin) {
        next({ path: '/error-403' })
        return
      }

      const requiredPermissions = to.meta.permissions

      if (requiredPermissions) {
        const userPerms = authStore.permissions || []

        // --- THE FIX IS HERE ---
        // We explicitly check the role string (lowercased) to ensure superadmin always passes
        const isSuperAdminRole = authStore.isSuperAdmin

        const hasPermission =
          isSuperAdminRole ||
          (Array.isArray(userPerms) && userPerms.includes('*')) ||
          (Array.isArray(userPerms) && requiredPermissions.some((p) => userPerms.includes(p)))

        if (hasPermission) {
          next()
        } else {
          console.warn(
            `Access Denied. Role: ${userRole}, Perms: ${userPerms}, Required: ${requiredPermissions}`,
          )
          next({ path: '/error-403' }) // Ensure this route exists in your routes.js!
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
