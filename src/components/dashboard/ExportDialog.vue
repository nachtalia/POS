<template>
  <q-dialog v-model="model">
    <q-card>
      <q-card-section>Export Sales Report</q-card-section>
      <q-card-actions>
        <q-btn label="Cancel" v-close-popup />
        <q-btn label="Export" @click="$emit('export')" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
const model = defineModel()
</script>
