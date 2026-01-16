<template>
  <q-page padding>
    <div class="row q-col-gutter-md">
      <!-- Welcome Card -->
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h5">Welcome to FAMS Cloud Dashboard</div>
            <div class="text-subtitle2 text-grey-7">Get insights into your business operations</div>
          </q-card-section>
        </q-card>
      </div>
      
      <!-- Stats Cards -->
      <div class="col-12 col-md-3">
        <q-card class="bg-primary text-white">
          <q-card-section>
            <div class="row items-center">
              <div class="col">
                <div class="text-h4">{{ totalOrders }}</div>
                <div class="text-subtitle2">Total Orders</div>
              </div>
              <div class="col-auto">
                <q-icon name="shopping_cart" size="48px" />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      
      <div class="col-12 col-md-3">
        <q-card class="bg-positive text-white">
          <q-card-section>
            <div class="row items-center">
              <div class="col">
                <div class="text-h4">{{ totalRevenue }}</div>
                <div class="text-subtitle2">Total Revenue</div>
              </div>
              <div class="col-auto">
                <q-icon name="attach_money" size="48px" />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      
      <div class="col-12 col-md-3">
        <q-card class="bg-warning text-white">
          <q-card-section>
            <div class="row items-center">
              <div class="col">
                <div class="text-h4">{{ lowStockItems }}</div>
                <div class="text-subtitle2">Low Stock Items</div>
              </div>
              <div class="col-auto">
                <q-icon name="warning" size="48px" />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      
      <div class="col-12 col-md-3">
        <q-card class="bg-info text-white">
          <q-card-section>
            <div class="row items-center">
              <div class="col">
                <div class="text-h4">{{ pendingOrders }}</div>
                <div class="text-subtitle2">Pending Orders</div>
              </div>
              <div class="col-auto">
                <q-icon name="pending" size="48px" />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      
      <!-- Recent Orders Chart -->
      <div class="col-12 col-md-8">
        <q-card>
          <q-card-section>
            <div class="text-h6">Recent Orders</div>
            <div class="text-subtitle2 text-grey-7">Last 7 days</div>
          </q-card-section>
          
          <q-card-section>
            <canvas id="ordersChart" width="400" height="200"></canvas>
          </q-card-section>
        </q-card>
      </div>
      
      <!-- Quick Actions -->
      <div class="col-12 col-md-4">
        <q-card>
          <q-card-section>
            <div class="text-h6">Quick Actions</div>
          </q-card-section>
          
          <q-list>
            <q-item clickable to="/inventory">
              <q-item-section avatar>
                <q-icon name="inventory" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Manage Inventory</q-item-label>
                <q-item-label caption>Add or update products</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item clickable to="/ordering">
              <q-item-section avatar>
                <q-icon name="shopping_cart" color="positive" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Process Orders</q-item-label>
                <q-item-label caption>View and manage orders</q-item-label>
              </q-item-section>
            </q-item>
            
            <q-item clickable>
              <q-item-section avatar>
                <q-icon name="assessment" color="warning" />
              </q-item-section>
              <q-item-section>
                <q-item-label>Generate Reports</q-item-label>
                <q-item-label caption>Sales and inventory reports</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const totalOrders = ref(156)
const totalRevenue = ref('₱24,350')
const lowStockItems = ref(12)
const pendingOrders = ref(8)

// Sample data for chart
const chartData = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [{
    label: 'Orders',
    data: [12, 19, 15, 25, 22, 30, 18],
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    borderColor: 'rgba(33, 150, 243, 1)',
    borderWidth: 2,
    tension: 0.4
  }]
}

onMounted(() => {
  // Simple chart implementation
  const canvas = document.getElementById('ordersChart')
  if (canvas) {
    const ctx = canvas.getContext('2d')
    // Basic chart drawing (simplified)
    const width = canvas.width
    const height = canvas.height
    const padding = 40
    const data = chartData.datasets[0].data
    const maxValue = Math.max(...data)
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height)
    
    // Draw axes
    ctx.strokeStyle = '#e0e0e0'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()
    
    // Draw data points and lines
    ctx.strokeStyle = chartData.datasets[0].borderColor
    ctx.lineWidth = 2
    ctx.beginPath()
    
    data.forEach((value, index) => {
      const x = padding + (index * (width - 2 * padding)) / (data.length - 1)
      const y = height - padding - (value / maxValue) * (height - 2 * padding)
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
      
      // Draw point
      ctx.fillStyle = chartData.datasets[0].borderColor
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, 2 * Math.PI)
      ctx.fill()
    })
    
    ctx.stroke()
    
    // Draw labels
    ctx.fillStyle = '#666'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    chartData.labels.forEach((label, index) => {
      const x = padding + (index * (width - 2 * padding)) / (data.length - 1)
      ctx.fillText(label, x, height - padding + 20)
    })
  }
})
</script>
