const routes = [
  // 1. PUBLIC / LOGIN
  {
    path: '/',
    component: () => import('layouts/IndexLayout.vue'),
    children: [
      {
        path: '',
        name: 'login',
        component: () => import('pages/auth/LoginPage.vue'),
      },
    ],
  },

  // 2. ADMIN DASHBOARD (With Sidebar & Header)
  {
    path: '/dashboard',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('pages/admin/DashboardPage.vue'),
        meta: {
          isSidebarItem: true,
          label: 'Dashboard',
          icon: 'dashboard',
          permissions: ['dashboard:view'],
        },
      },
      {
        path: '/inventory',
        name: 'Inventory',
        component: () => import('pages/admin/InventoryPage.vue'),
        meta: {
          isSidebarItem: true,
          label: 'Inventory',
          icon: 'inventory',
          caption: 'Manage products and stock',
          permissions: ['inventory:view'],
        },
      },

      // --- MODIFIED: ORDER MANAGEMENT (History List) ---
      {
        path: '/ordering', // Changed path to be distinct
        name: 'OrderManagement', // Renamed from 'Ordering'
        // Points to the file you renamed to OrderManagementPage.vue
        component: () => import('pages/admin/OrderManagementPage.vue'),
        meta: {
          isSidebarItem: true,
          label: 'Order Management',
          icon: 'list_alt', // Changed icon to represent a list/history
          caption: 'View and track past orders',
          permissions: ['ordering:view'],
        },
      },

      {
        path: '/transactions',
        name: 'Transactions',
        component: () => import('pages/admin/TransactionsPage.vue'),
        meta: {
          isSidebarItem: true,
          label: 'Transactions',
          icon: 'receipt_long',
          caption: 'Transaction history',
          permissions: ['transactions:view'],
        },
      },
      {
        path: '/userManagement',
        name: 'UserManagement',
        component: () => import('pages/admin/UserManagement.vue'),
        meta: {
          isSidebarItem: true,
          label: 'User Management',
          icon: 'people',
          caption: 'Manage User',
          permissions: [
            'userManagement:view',
            'userManagement:add',
            'userManagement:edit',
            'userManagement:delete',
          ],
        },
      },
      {
        path: '/AuditTrail',
        name: 'AuditTrail',
        component: () => import('pages/admin/AuditTrail.vue'),
        meta: {
          isSidebarItem: true,
          label: 'Audit Trail',
          icon: 'history',
          caption: 'Audit Trail history',
          permissions: ['auditTrail:view'],
        },
      },
      {
        path: '/settings',
        name: 'Settings',
        component: () => import('pages/admin/SettingsPage.vue'),
        meta: {
          isSidebarItem: true,
          label: 'Settings',
          icon: 'settings',
          caption: 'System settings',
          permissions: ['settings:view'],
        },
      },
    ],
  },

  // 3. NEW: POS TERMINAL ROUTE (Full Screen, No Sidebar)
  {
    path: '/pos',
    // Uses BlankLayout so the Admin Sidebar/Header does not appear
    component: () => import('layouts/BlankLayout.vue'),
    children: [
      {
        path: '',
        name: 'POS', // This matches router.push({ name: 'POS' }) or path '/pos'
        // Points to the NEW wrapper page we created
        component: () => import('pages/admin/POSTerminalPage.vue'),
        meta: { requiresAuth: true },
      },
    ],
  },

  // 4. CATCH ALL (404)
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
