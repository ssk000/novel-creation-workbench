export interface ElementField {
  key: string;
  value: string;
}

export interface Element {
  id: string;
  /** 'character' | 'location' | 'item' | 'world' | <自定义类型 id> */
  type: string;
  name: string;
  summary: string;
  description: string;
  fields: ElementField[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface CustomType {
  id: string;
  name: string;
  icon?: string;
  fieldDefs: { key: string; label: string }[];
}

export interface Scene {
  id: string;
  title: string;
  summary: string;
  goal?: string;
  conflict?: string;
  pov?: string;
  linkedElementIds: string[];
  draft: string;
  updatedAt: number;
}

export interface Section {
  id: string;
  title: string;
  summary: string;
  order: number;
  scenes: Scene[];
}

export interface Chapter {
  id: string;
  title: string;
  summary: string;
  order: number;
  sections: Section[];
}

export interface NovelMeta {
  id: string;
  title: string;
  description: string;
  genre: string;
  createdAt: number;
  updatedAt: number;
}

export interface Novel extends NovelMeta {
  elements: Element[];
  customTypes: CustomType[];
  chapters: Chapter[];
}

export interface Provider {
  id: string;
  name: string;
  kind: 'openai' | 'anthropic';
  baseURL: string;
  apiKey: string;
  model: string;
}

export interface Settings {
  defaultProviderId: string;
  providers: Provider[];
}

export interface BuiltinType {
  type: string;
  label: string;
  icon: string;
}

export const BUILTIN_ELEMENT_TYPES: BuiltinType[] = [
  { type: 'character', label: '角色', icon: '👤' },
  { type: 'location', label: '场景', icon: '🗺️' },
  { type: 'item', label: '物品 / 道具', icon: '📦' },
  { type: 'world', label: '世界观 / 设定', icon: '🌌' },
];

export function elementTypeMeta(
  type: string,
  customTypes: CustomType[],
): { label: string; icon: string } {
  const builtin = BUILTIN_ELEMENT_TYPES.find((t) => t.type === type);
  if (builtin) return { label: builtin.label, icon: builtin.icon };
  const custom = customTypes.find((t) => t.id === type);
  if (custom) return { label: custom.name, icon: custom.icon || '🏷️' };
  return { label: type, icon: '🏷️' };
}
