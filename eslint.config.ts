import antfu from '@antfu/eslint-config'

export default await antfu(
  {
    unocss: true,
    formatters: true,
    yaml: false,
    vue: true,
  },
)
