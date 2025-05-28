<script setup lang="ts">
definePageMeta({
  layout: 'home',
})
</script>

<template>
  <div h-full w-full>
    <ClientOnly>
      <WebQuery />
    </ClientOnly>
  </div>
</template>
