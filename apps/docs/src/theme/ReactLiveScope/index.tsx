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
  Note,
  Progress,
  Select,
  Separator,
  Spinner,
} from '@pp/ds/atoms'
import { Field, PersonChip, StatBlock } from '@pp/ds/molecules'
import { Modal } from '@pp/ds/organisms'
import {
  PALETTES,
  RADII,
  RAMP_STEPS,
  ROLE_PALETTE,
  SPACE_SCALE,
  TONE_PALETTE,
  TONE_VARIANTS,
  TYPE_SCALE,
} from "@pp/ds/tokens"

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
  Select,
  Note,
  Progress,

  // Moléculas
  Field,
  PersonChip,
  StatBlock,

  // Organismos
  Modal,

  // Tokens
  PALETTES,
  RAMP_STEPS,
  ROLE_PALETTE,
  TONE_PALETTE,
  TONE_VARIANTS,
  TYPE_SCALE,
  SPACE_SCALE,
  RADII,
}

export default ReactLiveScope
