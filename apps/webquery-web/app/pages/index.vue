<script setup lang="ts">
definePageMeta({
  layout: 'home',
})
</script>

<template>
  <div>
    <ClientOnly>
      <WebQuery />
    </ClientOnly>
  </div>
</template>
