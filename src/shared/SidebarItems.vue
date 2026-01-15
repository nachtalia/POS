<template>
  <q-item
    clickable
    v-ripple
    exact
    :to="{ name: props.name }"
    class="q-my-xs q-mx-sm rounded-borders sidebar-item transition-generic"
    active-class="sidebar-item-active"
  >
    <q-item-section v-if="props.icon" avatar style="min-width: 40px">
      <q-icon :name="props.icon" size="20px" class="transition-generic" />
    </q-item-section>

    <q-item-section>
      <q-item-label class="text-body2 transition-generic label-text">
        {{ props.label }}
      </q-item-label>

      <q-item-label v-if="props.caption" caption class="text-grey-6" style="font-size: 11px">
        {{ props.caption }}
      </q-item-label>
    </q-item-section>

    <q-item-section side v-if="isActive">
      <div class="active-indicator"></div>
    </q-item-section>
  </q-item>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  caption: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: '',
  },
  meta: {
    type: Object,
    default: () => ({}),
  },
})

const route = useRoute()

// Helper to determine if this specific item is active
// We use exact matching here to sync with the 'exact' prop on the q-item
const isActive = computed(() => route.name === props.name)
</script>

<style lang="scss" scoped>
/* 1. Base Item Styles */
.sidebar-item {
  color: #616161;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

/* 2. Hover State */
.sidebar-item:hover {
  background-color: #f5f5f5;
  color: #424242;
  padding-left: 20px;
}

/* 3. Active State */
.sidebar-item-active {
  background-color: rgba(25, 118, 210, 0.08);
  color: var(--q-primary) !important;
  font-weight: 600;
  border-color: rgba(25, 118, 210, 0.15);
}

.sidebar-item-active .q-icon {
  transform: scale(1.1);
}

/* Generic helper */
.transition-generic {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

/* Active Indicator Dot */
.active-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--q-primary);
  box-shadow: 0 0 8px var(--q-primary);
}
</style>
