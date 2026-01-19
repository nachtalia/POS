import { route } from 'quasar/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import routes from './routes'
import { useAuthStore } from 'src/features/index' // Ensure path is correct

export default route(function (/* { store, ssrContext } */) {
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
    const authStore = useAuthStore()

    // 1. Check if the route requires authentication (checked parent meta too)
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

    // 2. Check if user is logged in
    const isAuthenticated = !!authStore.user // Or authStore.isAuthenticated if you have that getter

    // SCENARIO 1: Accessing Protected Route && NOT Logged In
    if (requiresAuth && !isAuthenticated) {
      // Prevent infinite loop: Only redirect if we are NOT already at login
      if (to.name !== 'login') {
        next({ name: 'login' })
      } else {
        next() // We are at login, let it show
      }
    }
    // SCENARIO 2: Accessing Login Page && ALREADY Logged In
    else if (to.name === 'login' && isAuthenticated) {
      next({ name: 'Dashboard' }) // Redirect to main dashboard
    }
    // SCENARIO 3: Accessing Protected Route && Logged In (Check Permissions)
    else if (requiresAuth && isAuthenticated) {
      // Check if route has specific permissions
      const requiredPermissions = to.meta.permissions

      if (requiredPermissions) {
        // Simple permission check (User has at least one of the required perms)
        const userPerms = authStore.permissions || []
        const hasPermission =
          authStore.isSuperAdmin ||
          userPerms.includes('*') ||
          requiredPermissions.some((p) => userPerms.includes(p))

        if (hasPermission) {
          next()
        } else {
          // User logged in but no permission for this specific page
          next({ path: '/error-403' }) // Or just next(false) to stay put
        }
      } else {
        // No specific permissions required, just auth
        next()
      }
    }
    // SCENARIO 4: Public Pages (404, etc)
    else {
      next()
    }
  })

  return Router
})
