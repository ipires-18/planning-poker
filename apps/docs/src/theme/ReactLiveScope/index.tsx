import React from 'react'
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Initials,
  Input,
  Label,
  Separator,
  Spinner,
} from '@pp/ds/atoms'
import { Field, PersonChip, StatBlock } from '@pp/ds/molecules'
import { Modal } from '@pp/ds/organisms'
import { FEEDBACK, RADII, ROLE_ACCENT, SPACE_SCALE, TYPE_SCALE } from '@pp/ds/tokens'

/**
 * O que o playground enxerga.
 *
 * O editor ao vivo não resolve `import`, então o escopo é montado aqui — e
 * aponta para o pacote de verdade, pelo workspace. Documentação que importa uma
 * cópia envelhece sem ninguém perceber.
 */
const ReactLiveScope = {
  React,
  ...React,

  // Átomos
  Button,
  Input,
  Checkbox,
  Label,
  Badge,
  Avatar,
  Separator,
  Card,
  Spinner,
  Initials,

  // Moléculas
  Field,
  PersonChip,
  StatBlock,

  // Organismos
  Modal,

  // Tokens
  ROLE_ACCENT,
  FEEDBACK,
  TYPE_SCALE,
  SPACE_SCALE,
  RADII,
}

export default ReactLiveScope
