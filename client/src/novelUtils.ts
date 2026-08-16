import type { Chapter, Novel, Scene, Section } from './types';

export const uid = () => crypto.randomUUID();

export function newScene(): Scene {
  return {
    id: uid(),
    title: '新场景',
    summary: '',
    goal: '',
    conflict: '',
    pov: '',
    linkedElementIds: [],
    draft: '',
    updatedAt: Date.now(),
  };
}

export interface SceneRef {
  chapter: Chapter;
  section: Section;
  scene: Scene;
  chapterIndex: number;
  sectionIndex: number;
  sceneIndex: number;
}

export function collectScenes(novel: Novel): SceneRef[] {
  const out: SceneRef[] = [];
  novel.chapters.forEach((chapter, chapterIndex) => {
    chapter.sections.forEach((section, sectionIndex) => {
      section.scenes.forEach((scene, sceneIndex) => {
        out.push({ chapter, section, scene, chapterIndex, sectionIndex, sceneIndex });
      });
    });
  });
  return out;
}

export function findScene(novel: Novel, sceneId: string): SceneRef | null {
  return collectScenes(novel).find((r) => r.scene.id === sceneId) || null;
}

export function findSection(
  novel: Novel,
  sectionId: string,
): { chapter: Chapter; section: Section; chapterIndex: number; sectionIndex: number } | null {
  for (let ci = 0; ci < novel.chapters.length; ci++) {
    const chapter = novel.chapters[ci];
    for (let si = 0; si < chapter.sections.length; si++) {
      if (chapter.sections[si].id === sectionId) {
        return { chapter, section: chapter.sections[si], chapterIndex: ci, sectionIndex: si };
      }
    }
  }
  return null;
}

export function findChapter(
  novel: Novel,
  chapterId: string,
): { chapter: Chapter; index: number } | null {
  const index = novel.chapters.findIndex((c) => c.id === chapterId);
  return index >= 0 ? { chapter: novel.chapters[index], index } : null;
}

export function moveItem<T>(arr: T[], index: number, dir: -1 | 1) {
  const j = index + dir;
  if (j < 0 || j >= arr.length) return;
  const tmp = arr[index];
  arr[index] = arr[j];
  arr[j] = tmp;
}
