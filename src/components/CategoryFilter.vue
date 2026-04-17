<template>
  <div class="cat-filter-wrap">
    <div class="chips">
      <button
        v-for="opt in options"
        :key="getVal(opt)"
        class="chip"
        :class="{ active: modelValue === getVal(opt) }"
        @click="$emit('update:modelValue', getVal(opt))"
      >
        {{ getLab(opt) }}
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: [String, Number],
  options: { type: Array, required: true }
})
const getVal = (o) => typeof o === 'object' ? o.v : o
const getLab = (o) => typeof o === 'object' ? (o.l || o.label) : o
</script>