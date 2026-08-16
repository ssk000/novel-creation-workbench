import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.NOVEL_DATA_DIR || path.join(__dirname, '..', 'data');
const INDEX_FILE = path.join(DATA_DIR, 'index.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const NOVELS_DIR = path.join(DATA_DIR, 'novels');

export function newId() {
  return crypto.randomUUID();
}

async function ensureDirs() {
  await fs.mkdir(NOVELS_DIR, { recursive: true });
}

/* ---------------- index ---------------- */

async function readIndex() {
  try {
    return JSON.parse(await fs.readFile(INDEX_FILE, 'utf8'));
  } catch {
    return { novels: [] };
  }
}

async function writeIndex(index) {
  await ensureDirs();
  await fs.writeFile(INDEX_FILE, JSON.stringify(index, null, 2), 'utf8');
}

/* ---------------- novels ---------------- */

export async function listNovels() {
  const idx = await readIndex();
  return [...idx.novels].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function novelFile(id) {
  return path.join(NOVELS_DIR, `${id}.json`);
}

export async function getNovel(id) {
  try {
    return JSON.parse(await fs.readFile(novelFile(id), 'utf8'));
  } catch {
    return null;
  }
}

export async function createNovel(data) {
  const now = Date.now();
  const novel = {
    id: newId(),
    title: (data && data.title) || '未命名小说',
    description: (data && data.description) || '',
    genre: (data && data.genre) || '',
    elements: [],
    customTypes: [],
    chapters: [],
    createdAt: now,
    updatedAt: now,
  };
  await saveNovel(novel);
  return novel;
}

export async function saveNovel(novel) {
  await ensureDirs();
  novel.updatedAt = Date.now();
  await fs.writeFile(novelFile(novel.id), JSON.stringify(novel, null, 2), 'utf8');

  const idx = await readIndex();
  const meta = {
    id: novel.id,
    title: novel.title,
    description: novel.description,
    genre: novel.genre,
    createdAt: novel.createdAt,
    updatedAt: novel.updatedAt,
  };
  const existing = idx.novels.find((n) => n.id === novel.id);
  if (existing) Object.assign(existing, meta);
  else idx.novels.push(meta);
  await writeIndex(idx);
  return novel;
}

export async function deleteNovel(id) {
  const idx = await readIndex();
  idx.novels = idx.novels.filter((n) => n.id !== id);
  await writeIndex(idx);
  await fs.rm(novelFile(id), { force: true });
}

/* ---------------- settings ---------------- */

const DEFAULT_SETTINGS = {
  defaultProviderId: 'ollama',
  providers: [
    { id: 'ollama', name: 'Ollama（本地）', kind: 'openai', baseURL: 'http://localhost:11434/v1', apiKey: '', model: 'llama3.1' },
    { id: 'deepseek', name: 'DeepSeek（云）', kind: 'openai', baseURL: 'https://api.deepseek.com/v1', apiKey: '', model: 'deepseek-chat' },
    { id: 'openai', name: 'OpenAI（云）', kind: 'openai', baseURL: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o-mini' },
    { id: 'claude', name: 'Claude（云）', kind: 'anthropic', baseURL: 'https://api.anthropic.com/v1', apiKey: '', model: 'claude-sonnet-4-5' },
  ],
};

export async function getSettings() {
  try {
    const s = JSON.parse(await fs.readFile(SETTINGS_FILE, 'utf8'));
    return { ...DEFAULT_SETTINGS, ...s };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings) {
  await ensureDirs();
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  return settings;
}

/* ---------------- sample novel ---------------- */

export async function createSampleNovel() {
  const now = Date.now();
  const novel = {
    id: newId(),
    title: '示例：星尘之约',
    description: '一个关于失落文明与少年冒险的科幻奇幻故事，用于演示工作台的三大模块。',
    genre: '科幻奇幻',
    elements: [
      {
        id: newId(), type: 'character', name: '林澈', summary: '十七岁少年，好奇心旺盛，意外获得星尘印记。',
        description: '黑发黑眸，身形清瘦。生于边境小城，父亲是机械师。性格倔强、重情义，面对未知时既恐惧又兴奋。',
        fields: [
          { key: '年龄', value: '17' },
          { key: '身份', value: '见习机械师' },
          { key: '目标', value: '寻找失踪的父亲' },
        ],
        tags: ['主角', '少年'], createdAt: now, updatedAt: now,
      },
      {
        id: newId(), type: 'character', name: '艾薇尔', summary: '来自星空的迷之少女，失去记忆，掌握古老星术。',
        description: '银发紫瞳，声音清冷。坠落于边境荒原，随身携带一枚会发光的水晶。对林澈怀有莫名的信任。',
        fields: [{ key: '身份', value: '星空来客' }], tags: ['女主', '神秘'], createdAt: now, updatedAt: now,
      },
      {
        id: newId(), type: 'location', name: '锈色荒原', summary: '小城西侧的废弃战场，遍布古代机械残骸。',
        description: '赤褐色的沙土，锈蚀的机甲与倒塌的高塔。传说这里埋葬着失落文明「星舟」的遗迹。夜晚会泛起幽蓝的荧光。',
        fields: [{ key: '气候', value: '干燥多风' }], tags: ['野外', '遗迹'], createdAt: now, updatedAt: now,
      },
      {
        id: newId(), type: 'item', name: '星尘水晶', summary: '艾薇尔携带的发光水晶，能与星舟遗迹共鸣。',
        description: '掌心大小的多面体，通体幽蓝，内部有星点流动。触碰时会发热，并在荒原遗迹附近发出共鸣般的低鸣。',
        fields: [], tags: ['关键道具'], createdAt: now, updatedAt: now,
      },
      {
        id: newId(), type: 'world', name: '星舟文明', summary: '失落的上古文明，曾以星尘驱动巨舰航行于群星之间。',
        description: '传说星舟文明在千年前一夜覆灭，只留下散布各地的遗迹与守护者。星尘是其核心能源，也蕴含着巨大的危险。',
        fields: [{ key: '时代', value: '千年前' }], tags: ['世界观'], createdAt: now, updatedAt: now,
      },
    ],
    customTypes: [
      { id: newId(), name: '势力', icon: '🏛️', fieldDefs: [{ key: '领袖', label: '领袖' }, { key: '立场', label: '立场' }] },
    ],
    chapters: [
      {
        id: newId(), title: '第一章 坠落', summary: '林澈在荒原捡到坠落的艾薇尔，卷入一场争夺水晶的追捕。', order: 0,
        sections: [
          {
            id: newId(), title: '第一节 荒原异象', summary: '林澈随修理队进入锈色荒原，目睹夜空中坠落的流星。', order: 0,
            scenes: [
              {
                id: newId(), title: '场景 1 · 出发', summary: '清晨，修理队集结，林澈与父亲的旧同事寒暄。', goal: '交代背景与人物关系', conflict: '林澈对父亲失踪的执念', pov: '林澈',
                linkedElementIds: [], draft: '', updatedAt: now,
              },
              {
                id: newId(), title: '场景 2 · 流星坠落', summary: '傍晚，众人目睹流星坠入荒原深处，林澈决定独自前往查看。', goal: '触发主线', conflict: '好奇与危险的抉择', pov: '林澈',
                linkedElementIds: [], draft: '', updatedAt: now,
              },
            ],
          },
          {
            id: newId(), title: '第二节 星尘水晶', summary: '林澈在坠落点找到昏迷的艾薇尔与星尘水晶，追兵逼近。', order: 1,
            scenes: [
              {
                id: newId(), title: '场景 1 · 相遇', summary: '林澈发现艾薇尔，水晶与遗迹共鸣，追兵的黑影出现。', goal: '建立羁绊', conflict: '是否施救', pov: '林澈',
                linkedElementIds: [], draft: '', updatedAt: now,
              },
            ],
          },
        ],
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  // 让章节内元素引用示例元素
  const chars = novel.elements.filter((e) => e.type === 'character');
  const locs = novel.elements.filter((e) => e.type === 'location');
  const items = novel.elements.filter((e) => e.type === 'item');
  const firstScene = novel.chapters[0].sections[0].scenes[0];
  firstScene.linkedElementIds = [chars[0].id, locs[0].id];
  const secondScene = novel.chapters[0].sections[0].scenes[1];
  secondScene.linkedElementIds = [chars[0].id, locs[0].id];
  const meetScene = novel.chapters[0].sections[1].scenes[0];
  meetScene.linkedElementIds = [chars[0].id, chars[1].id, items[0].id, locs[0].id];

  await saveNovel(novel);
  return novel;
}
