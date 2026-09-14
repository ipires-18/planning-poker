import type { Plugin } from '@docusaurus/types'
import tailwindPostcss from '@tailwindcss/postcss'

/**
 * Põe o Tailwind no pipeline de CSS do Docusaurus.
 *
 * Sem isto, o `@import 'tailwindcss'` que vem do @pp/ds chega intacto ao bundle
 * e o navegador o ignora — os componentes renderizam, mas sem classe nenhuma
 * aplicada. A vitrine mostraria HTML cru e ninguém entenderia o porquê.
 */
export default function tailwind(): Plugin {
  return {
    name: 'pp-tailwind',
    configurePostCss(options) {
      options.plugins.push(tailwindPostcss)
      return options
    },
  }
}
