<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card style="width: 420px; max-width: 90vw">
      <q-card-section class="row items-center justify-between">
        <div class="text-subtitle1 text-weight-bold">Sale Complete</div>
        <q-btn flat round dense icon="close" v-close-popup />
      </q-card-section>
      <q-separator />
      <q-card-section>
        <div class="text-h6 text-weight-bold text-center">POS Receipt</div>
        <div class="text-caption text-grey-6 text-center">Receipt #{{ receiptNumber }}</div>
        <div class="text-caption text-grey-6 text-center q-mb-md">
          {{ formattedDate }}
        </div>
        <div class="q-mb-sm">
          <div v-for="(item, i) in items" :key="i" class="row justify-between items-center q-py-xs">
            <div>
              <div>
                <span class="text-weight-bold">{{ item.quantity }}x</span>
                <span class="q-ml-xs">{{ item.name }}</span>
              </div>
              <div
                v-if="
                  (item.variant && item.variant !== 'Standard') || formatAddonNames(item.addons)
                "
                class="text-caption text-grey-6"
              >
                <span v-if="item.variant && item.variant !== 'Standard'">{{ item.variant }}</span>
                <span
                  v-if="
                    item.variant && item.variant !== 'Standard' && formatAddonNames(item.addons)
                  "
                >
                  •
                </span>
                <span v-if="formatAddonNames(item.addons)">{{
                  formatAddonNames(item.addons)
                }}</span>
              </div>
            </div>
            <div class="text-weight-medium">₱{{ (item.unitPrice * item.quantity).toFixed(2) }}</div>
          </div>
          <div v-if="!items.length" class="text-caption text-grey-6">No items</div>
        </div>
        <q-separator class="q-my-sm" />
        <div class="q-mb-sm">
          <div class="row justify-between text-caption text-grey-7 q-py-xs">
            <span>Subtotal</span>
            <span>₱{{ subtotal.toFixed(2) }}</span>
          </div>
          <div class="row justify-between text-caption text-grey-7 q-py-xs">
            <span>
              {{ taxLabel }}
            </span>
            <span>₱{{ taxAmount.toFixed(2) }}</span>
          </div>
          <div class="row justify-between text-caption text-grey-7 q-py-xs">
            <span>
              {{ discountLabel }}
            </span>
            <span>-₱{{ discountAmount.toFixed(2) }}</span>
          </div>
          <q-separator class="q-my-sm" />
          <div class="row justify-between items-center q-py-xs">
            <span class="text-weight-bold">Total</span>
            <span class="text-weight-bold text-primary">₱{{ total.toFixed(2) }}</span>
          </div>
        </div>
        <q-separator class="q-my-sm" />
        <div class="q-mb-sm">
          <div class="row justify-between text-caption text-grey-7 q-py-xs">
            <span>Paid ({{ paymentMode }})</span>
            <span>₱{{ amountPaid.toFixed(2) }}</span>
          </div>
          <div class="row justify-between text-caption q-py-xs">
            <span class="text-positive text-weight-medium">Change</span>
            <span class="text-positive text-weight-medium">₱{{ changeAmount.toFixed(2) }}</span>
          </div>
        </div>
      </q-card-section>
      <q-separator />
      <q-card-actions align="right">
        <q-btn flat color="grey-8" label="Close" v-close-popup />
        <q-btn flat color="primary" icon="print" label="Print" @click="printReceipt" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'

const { modelValue, order } = defineProps({
  modelValue: { type: Boolean, default: false },
  order: { type: Object, default: () => ({}) },
})
defineEmits(['update:modelValue'])

const items = computed(() => {
  const it = Array.isArray(order?.items) ? order.items : []
  return it.map((x) => ({
    name: x.name || x.product?.name || 'Item',
    sku: x.sku || x.product?.sku || '',
    variant: x.variant || '',
    addons: x.addons || [],
    unitPrice: Number(x.unitPrice ?? x.price ?? 0),
    quantity: Number(x.quantity ?? 1),
    note: x.note || '',
  }))
})

const formatAddonNames = (addons) => {
  if (!Array.isArray(addons) || !addons.length) return ''
  const names = addons
    .map((a) => {
      if (typeof a === 'string') return a
      if (a && typeof a === 'object') return a.name || a.label || ''
      return ''
    })
    .filter((n) => n && n.length)
  return names.join(', ')
}

const subtotal = computed(() => {
  if (typeof order?.subtotal === 'number') return Number(order.subtotal)
  return items.value.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
})
const taxAmount = computed(() => {
  if (typeof order?.taxAmount === 'number') return Number(order.taxAmount)
  const rate = typeof order?.taxRate === 'number' ? order.taxRate : 0
  return subtotal.value * rate
})
const discountAmount = computed(() => {
  if (typeof order?.discountAmount === 'number') return Number(order.discountAmount)
  const rate = typeof order?.discountRate === 'number' ? order.discountRate : 0
  return subtotal.value * rate
})

const taxLabel = computed(() => {
  if (order?.taxMode === 'percent' && typeof order?.taxValue === 'number') {
    return `Tax (${Number(order.taxValue).toFixed(0)}%)`
  }
  return 'Tax'
})
const discountLabel = computed(() => {
  if (order?.discountMode === 'percent' && typeof order?.discountValue === 'number') {
    return `Discount (${Number(order.discountValue).toFixed(0)}%)`
  }
  return 'Discount'
})
const total = computed(() => {
  if (typeof order?.totalAmount === 'number') return Number(order.totalAmount)
  if (typeof order?.total === 'number') return Number(order.total)
  return subtotal.value + taxAmount.value - discountAmount.value
})

const paymentMode = computed(() => order?.paymentMode || 'Cash')
const amountPaid = computed(() => {
  if (typeof order?.amountPaid === 'number') return Number(order.amountPaid)
  return total.value
})
const changeAmount = computed(() => {
  if (typeof order?.change === 'number') return Number(order.change)
  return Math.max(0, amountPaid.value - total.value)
})

const formattedDate = computed(() => {
  const d = order?.date || order?.createdAt || new Date().toISOString()
  try {
    if (d && typeof d.toDate === 'function') {
      return d.toDate().toLocaleString()
    }
    return new Date(d).toLocaleString()
  } catch {
    return String(d)
  }
})

const receiptNumber = computed(() => {
  if (order?.orderNumber) return order.orderNumber
  const id = order?.id
  if (id) return String(id)
  return shortId.value
})

const shortId = computed(() => {
  const id = order?.id || order?.orderNumber || ''
  return id ? String(id).slice(0, 8) : 'N/A'
})

const printReceipt = () => {
  const title = `Receipt - ${shortId.value}`
  const rows = items.value
    .map(
      (i) => `
    <tr>
      <td>${i.name}</td>
      <td>${i.variant || ''}</td>
      <td>${i.quantity}</td>
      <td>₱${i.unitPrice.toFixed(2)}</td>
      <td>₱${(i.unitPrice * i.quantity).toFixed(2)}</td>
    </tr>
  `,
    )
    .join('')
  const html = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; }
          h1 { font-size: 18px; margin: 0 0 12px; }
          .meta { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; }
          th { background: #f3f4f6; text-align: left; }
          .totals { margin-top: 16px; width: 50%; float: right; }
          .totals table { width: 100%; }
        </style>
      </head>
      <body>
        <h1>POS Receipt</h1>
        <div class="meta">Order #${shortId.value} • ${formattedDate.value} • ${order?.customerName || 'Customer'}</div>
        <table>
          <thead>
            <tr>
              <th>Item</th><th>Variant</th><th>Qty</th><th>Unit</th><th>Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="totals">
          <table>
            <tr><td>Subtotal</td><td style="text-align:right">₱${subtotal.value.toFixed(2)}</td></tr>
            <tr><td>${taxLabel.value}</td><td style="text-align:right">₱${taxAmount.value.toFixed(2)}</td></tr>
            <tr><td>${discountLabel.value}</td><td style="text-align:right">-₱${discountAmount.value.toFixed(2)}</td></tr>
            <tr><th>Total</th><th style="text-align:right">₱${total.value.toFixed(2)}</th></tr>
            <tr><td>Paid (${paymentMode.value})</td><td style="text-align:right">₱${amountPaid.value.toFixed(2)}</td></tr>
            <tr><td>Change</td><td style="text-align:right">₱${changeAmount.value.toFixed(2)}</td></tr>
          </table>
        </div>
      </body>
    </html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => {
    w.print()
  }, 100)
}
</script>
