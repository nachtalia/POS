const routes = [
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
      {
        path: '/ordering',
        name: 'Ordering',
        component: () => import('pages/admin/OrderingPage.vue'),
        meta: {
          isSidebarItem: true,
          label: 'Ordering',
          icon: 'shopping_cart',
          caption: 'Process customer orders',
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
      // --- USER MANAGEMENT ROUTE ---
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

  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
