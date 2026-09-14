import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  ds: [
    'index',
    {
      type: 'category',
      label: 'Fundamentos',
      collapsed: false,
      items: ['fundamentos/style-guide', 'fundamentos/arquitetura'],
    },
    {
      type: 'category',
      label: 'Componentes',
      collapsed: false,
      items: ['componentes/atomos', 'componentes/moleculas', 'componentes/organismos'],
    },
  ],
}

export default sidebars
