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
            <span>{{ taxLabel }}</span>
            <span>₱{{ taxAmount.toFixed(2) }}</span>
          </div>
          <div class="row justify-between text-caption text-grey-7 q-py-xs">
            <span>{{ discountLabel }}</span>
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

// --- Props ---
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  // This object comes from CheckoutSummary.vue -> emit('pay-now', newOrder)
  order: { type: Object, default: () => ({}) },
})

defineEmits(['update:modelValue'])

// --- Items Logic ---
const items = computed(() => {
  const it = Array.isArray(props.order?.items) ? props.order.items : []
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

// --- Totals Logic ---
const subtotal = computed(() => {
  if (typeof props.order?.subtotal === 'number') return Number(props.order.subtotal)
  return items.value.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
})

const taxAmount = computed(() => {
  if (typeof props.order?.taxAmount === 'number') return Number(props.order.taxAmount)
  const rate = typeof props.order?.taxRate === 'number' ? props.order.taxRate : 0
  return subtotal.value * rate
})

const discountAmount = computed(() => {
  if (typeof props.order?.discountAmount === 'number') return Number(props.order.discountAmount)
  const rate = typeof props.order?.discountRate === 'number' ? props.order.discountRate : 0
  return subtotal.value * rate
})

const total = computed(() => {
  if (typeof props.order?.totalAmount === 'number') return Number(props.order.totalAmount)
  return subtotal.value + taxAmount.value - discountAmount.value
})

const amountPaid = computed(() => {
  if (typeof props.order?.amountPaid === 'number') return Number(props.order.amountPaid)
  return total.value
})

const changeAmount = computed(() => {
  if (typeof props.order?.change === 'number') return Number(props.order.change)
  return Math.max(0, amountPaid.value - total.value)
})

// --- Labels & Metadata ---
const taxLabel = computed(() => {
  if (props.order?.taxDetails?.type === 'percent') {
    return `Tax (${props.order.taxDetails.value}%)`
  }
  return 'Tax'
})

const discountLabel = computed(() => {
  if (props.order?.discountDetails?.type === 'percent') {
    return `Discount (${props.order.discountDetails.value}%)`
  }
  return 'Discount'
})

const paymentMode = computed(() => props.order?.paymentMode || 'Cash')

const formattedDate = computed(() => {
  const d = props.order?.date || props.order?.createdAt || new Date()
  // Handle Firebase Timestamp (has toDate()) or standard Date
  try {
    if (d && typeof d.toDate === 'function') {
      return d.toDate().toLocaleString()
    }
    return new Date(d).toLocaleString()
  } catch {
    return String(d)
  }
})

// --- KEY FIX: Receipt Number Logic ---
const receiptNumber = computed(() => {
  // 1. Look for the formatted Order Number from Store (e.g. 20240121-0005)
  if (props.order?.orderNumber) return props.order.orderNumber

  // 2. Fallback to ID
  const id = props.order?.id
  if (id) return String(id)

  return 'N/A'
})

// --- Print Logic ---
const printReceipt = () => {
  // Use receiptNumber.value directly so we don't cut off the generated ID
  const title = `Receipt - ${receiptNumber.value}`

  const rows = items.value
    .map(
      (i) => `
    <tr>
      <td>${i.name}
        ${i.variant ? `<br><small>${i.variant}</small>` : ''}
        ${formatAddonNames(i.addons) ? `<br><small>+${formatAddonNames(i.addons)}</small>` : ''}
      </td>
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
          body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
          h1 { font-size: 16px; margin: 0 0 10px; text-align: center; text-transform: uppercase; }
          .meta { font-size: 12px; margin-bottom: 15px; text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px;}
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { text-align: left; border-bottom: 1px solid #000; }
          td { padding: 4px 0; vertical-align: top; }
          .totals { margin-top: 15px; border-top: 1px dashed #000; padding-top: 10px; }
          .totals table tr td { text-align: right; }
          .totals table tr td:first-child { text-align: left; }
          .total-row { font-weight: bold; font-size: 14px; }
        </style>
      </head>
      <body>
        <h1>POS Receipt</h1>
        <div class="meta">
          Ref: ${receiptNumber.value}<br> Date: ${formattedDate.value}<br>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th><th>Qty</th><th>Price</th><th>Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="totals">
          <table>
            <tr><td>Subtotal</td><td>₱${subtotal.value.toFixed(2)}</td></tr>
            <tr><td>${taxLabel.value}</td><td>₱${taxAmount.value.toFixed(2)}</td></tr>
            <tr><td>${discountLabel.value}</td><td>-₱${discountAmount.value.toFixed(2)}</td></tr>
            <tr class="total-row"><td>Total</td><td>₱${total.value.toFixed(2)}</td></tr>
            <tr><td>Paid (${paymentMode.value})</td><td>₱${amountPaid.value.toFixed(2)}</td></tr>
            <tr><td>Change</td><td>₱${changeAmount.value.toFixed(2)}</td></tr>
          </table>
        </div>
        <div style="text-align:center; margin-top: 20px; font-size: 10px;">
          Thank you for your purchase!
        </div>
      </body>
    </html>`

  const w = window.open('', '_blank', 'width=400,height=600')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => {
    w.print()
    w.close()
  }, 500)
}
</script>
