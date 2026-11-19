import { ThemeAccentOption } from '../types/app';

export interface AccentPreset {
  id: ThemeAccentOption;
  label: string;
  hex: string;
  swatchClass: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: 'ocean', label: 'Ocean Blue', hex: '#0EA5E9', swatchClass: 'bg-[#0EA5E9]' },
  { id: 'emerald', label: 'Emerald Green', hex: '#10B981', swatchClass: 'bg-[#10B981]' },
  { id: 'purple', label: 'Royal Purple', hex: '#8B5CF6', swatchClass: 'bg-[#8B5CF6]' },
  { id: 'saffron', label: 'Warm Saffron', hex: '#F59E0B', swatchClass: 'bg-[#F59E0B]' },
  { id: 'coral', label: 'Coral Rose', hex: '#F43F5E', swatchClass: 'bg-[#F43F5E]' },
];
