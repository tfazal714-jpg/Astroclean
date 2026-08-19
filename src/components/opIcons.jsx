import { Scissors } from 'lucide-react'
import { OP_ICONS } from '../utils/opIcons.js'

export function OpIcon({ name, className }) {
  const Icon = OP_ICONS[name] ?? Scissors
  return <Icon className={className} aria-hidden="true" />
}
