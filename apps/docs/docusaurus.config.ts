import type { Config } from '@docusaurus/types'
import type * as Preset from '@docusaurus/preset-classic'
import { themes as prismThemes } from 'prism-react-renderer'

/**
 * Vitrine do design system.
 *
 * O playground roda os componentes de verdade, importados do @pp/ds pelo
 * workspace — não uma cópia. Se um átomo mudar, a página muda junto, o que é a
 * única forma de a documentação não mentir com o tempo.
 */
const config: Config = {
  title: 'Planning Poker DS',
  tagline: 'Tokens, átomos, moléculas e organismos sobre React Aria',
  favicon: 'img/favicon.ico',
  url: 'https://planning-poker-ds.local',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  markdown: { hooks: { onBrokenMarkdownLinks: 'warn' } },
  i18n: { defaultLocale: 'pt-BR', locales: ['pt-BR'] },

  themes: ['@docusaurus/theme-live-codeblock'],
  plugins: ['./plugins/tailwind.ts'],

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'Planning Poker DS',
      items: [
        { to: '/fundamentos/style-guide', label: 'Fundamentos', position: 'left' },
        { to: '/componentes/atomos', label: 'Componentes', position: 'left' },
      ],
    },
    liveCodeBlock: { playgroundPosition: 'bottom' },
    prism: { theme: prismThemes.github, darkTheme: prismThemes.dracula },
    footer: undefined,
  } satisfies Preset.ThemeConfig,
}

export default config
