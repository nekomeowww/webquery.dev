<template>
  <div
    class="mx-auto h-full max-w-[1200px] w-full flex flex-col"
    p="l-[max(env(safe-area-inset-left),16px)] t-[max(env(safe-area-inset-top),16px)] r-[max(env(safe-area-inset-right),16px)] b-[max(env(safe-area-inset-bottom),16px)]"
    transition="all ease-in-out" duration-1000
  >
    <main w-full flex-1>
      <slot />
      <Footer />
    </main>
  </div>
</template>
