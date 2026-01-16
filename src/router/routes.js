const routes = [
  {
    path: '/',
    component: () => import('layouts/IndexLayout.vue'),
    children: [{ path: '', component: () => import('pages/auth/LoginPage.vue') }],
  },
  {
    path: '/dashboard',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('pages/admin/DashboardPage.vue'),
        meta: {
          isSidebarItem: true,
          label: 'Dashboard',
          icon: 'dashboard',
          // Permission required to see this link:
          permissions: ['dashboard:view'],
        },
      },
      {
        path: '/inventory',
        name: 'Inventory',
        component: () => import('pages/admin/InventoryPage.vue'),
        meta: {
          isSidebarItem: true,
          isManagement: true,
          label: 'Inventory',
          icon: 'inventory',
          caption: 'Manage products and stock',
          // Permission required to see this link:
          permissions: ['inventory:view'],
        },
      },
      {
        path: '/ordering',
        name: 'Ordering',
        component: () => import('pages/admin/OrderingPage.vue'),
        meta: {
          isSidebarItem: true,
          isManagement: true,
          label: 'Ordering',
          icon: 'shopping_cart',
          caption: 'Process customer orders',
          // Permission required to see this link:
          permissions: ['ordering:view'],
        },
      },
      {
        path: '/transactions',
        name: 'Transactions',
        component: () => import('pages/admin/TransactionsPage.vue'),
        meta: {
          isSidebarItem: true,
          isManagement: true,
          label: 'Transactions',
          icon: 'receipt_long',
          caption: 'Transaction history',
          // Permission required to see this link:
          permissions: ['transactions:view'],
        },
      },
      {
        path: '/userManagement',
        name: 'UserManagement',
        component: () => import('pages/admin/UserManagement.vue'),
        meta: {
          isSidebarItem: true,
          isManagement: true,
          label: 'User Management',
          icon: 'people',           // Mas angkop para sa user management
          caption: 'Manage User',
          permissions: ['userManagement:view'],
        },
      },
      {
        path: '/AuditTrail',
        name: 'AuditTrail',
        component: () => import('pages/admin/AuditTrail.vue'),
        meta: {
          isSidebarItem: true,
          isManagement: true,
          label: 'Audit Trail',
          icon: 'history',          // Mas angkop para sa audit trail/history
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
          isManagement: true,
          label: 'Settings',
          icon: 'settings',
          caption: 'System settings',
          // Permission required to see this link:
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
