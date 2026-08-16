import { useState, type ReactNode } from 'react';
import { useStore } from '../../store';
import { useUI } from '../../uiStore';
import { moveItem, newScene, uid } from '../../novelUtils';
import type { Novel } from '../../types';

type Rename = { kind: 'chapter' | 'section' | 'scene'; id: string; value: string } | null;

export default function OutlineTree() {
  const novel = useStore((s) => s.novel)!;
  const updateNovel = useStore((s) => s.updateNovel);
  const selectedSceneId = useUI((s) => s.selectedSceneId);
  const selectScene = useUI((s) => s.selectScene);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState<Rename>(null);

  const toggle = (id: string) =>
    setCollapsed((c) => {
      const n = new Set(c);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const commitRename = () => {
    if (!renaming) return;
    const title = renaming.value.trim();
    if (title) {
      updateNovel((n) => {
        if (renaming.kind === 'chapter') {
          const c = n.chapters.find((x) => x.id === renaming.id);
          if (c) c.title = title;
        } else if (renaming.kind === 'section') {
          for (const ch of n.chapters)
            for (const s of ch.sections) if (s.id === renaming.id) s.title = title;
        } else {
          for (const ch of n.chapters)
            for (const s of ch.sections)
              for (const sc of s.scenes) if (sc.id === renaming.id) sc.title = title;
        }
      });
    }
    setRenaming(null);
  };

  const addChapter = () =>
    updateNovel((n: Novel) => {
      n.chapters.push({
        id: uid(),
        title: `第${n.chapters.length + 1}章`,
        summary: '',
        order: n.chapters.length,
        sections: [
          { id: uid(), title: '第1节', summary: '', order: 0, scenes: [newScene()] },
        ],
      });
    });

  const addSection = (chapterId: string) =>
    updateNovel((n: Novel) => {
      const c = n.chapters.find((x) => x.id === chapterId);
      if (!c) return;
      c.sections.push({
        id: uid(),
        title: `第${c.sections.length + 1}节`,
        summary: '',
        order: c.sections.length,
        scenes: [newScene()],
      });
    });

  const addScene = (sectionId: string) =>
    updateNovel((n: Novel) => {
      for (const ch of n.chapters)
        for (const s of ch.sections)
          if (s.id === sectionId) s.scenes.push(newScene());
    });

  const removeChapter = (id: string) => {
    if (!window.confirm('删除该章及其下所有节和场景？')) return;
    updateNovel((n: Novel) => {
      n.chapters = n.chapters.filter((c) => c.id !== id);
    });
  };
  const removeSection = (id: string) => {
    if (!window.confirm('删除该节及其下所有场景？')) return;
    updateNovel((n: Novel) => {
      for (const ch of n.chapters) ch.sections = ch.sections.filter((s) => s.id !== id);
    });
  };
  const removeScene = (id: string) => {
    if (!window.confirm('删除该场景？')) return;
    updateNovel((n: Novel) => {
      for (const ch of n.chapters)
        for (const s of ch.sections) s.scenes = s.scenes.filter((sc) => sc.id !== id);
    });
  };

  const moveChapter = (id: string, dir: -1 | 1) =>
    updateNovel((n: Novel) => {
      const i = n.chapters.findIndex((c) => c.id === id);
      if (i >= 0) moveItem(n.chapters, i, dir);
    });
  const moveSection = (id: string, dir: -1 | 1) =>
    updateNovel((n: Novel) => {
      for (const ch of n.chapters) {
        const i = ch.sections.findIndex((s) => s.id === id);
        if (i >= 0) moveItem(ch.sections, i, dir);
      }
    });
  const moveScene = (id: string, dir: -1 | 1) =>
    updateNovel((n: Novel) => {
      for (const ch of n.chapters)
        for (const s of ch.sections) {
          const i = s.scenes.findIndex((sc) => sc.id === id);
          if (i >= 0) moveItem(s.scenes, i, dir);
        }
    });

  const isRenaming = (kind: string, id: string) =>
    !!(renaming && renaming.kind === kind && renaming.id === id);

  return (
    <div className="plot-tree">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px 12px' }}>
        <span className="panel-section-title">章 · 节 · 场景</span>
        <button className="btn btn-primary btn-sm" onClick={addChapter}>
          ＋ 章
        </button>
      </div>

      {novel.chapters.map((ch) => {
        const chCollapsed = collapsed.has(ch.id);
        return (
          <div className="tree-chapter" key={ch.id}>
            <Row
              className="chapter-row"
              caret={chCollapsed ? '▸' : '▾'}
              onToggle={() => toggle(ch.id)}
              selected={false}
            >
              <Title
                renaming={isRenaming('chapter', ch.id)}
                value={renaming?.value ?? ''}
                display={ch.title}
                onChange={(v) => setRenaming({ kind: 'chapter', id: ch.id, value: v })}
                onCommit={commitRename}
                onStartRename={() => setRenaming({ kind: 'chapter', id: ch.id, value: ch.title })}
              />
              <Actions>
                <A title="添加节" onClick={() => addSection(ch.id)}>＋节</A>
                <A title="重命名" onClick={() => setRenaming({ kind: 'chapter', id: ch.id, value: ch.title })}>✎</A>
                <A title="上移" onClick={() => moveChapter(ch.id, -1)}>↑</A>
                <A title="下移" onClick={() => moveChapter(ch.id, 1)}>↓</A>
                <A title="删除" onClick={() => removeChapter(ch.id)}>🗑</A>
              </Actions>
            </Row>

            {!chCollapsed && (
              <div className="tree-children">
                {ch.sections.map((sec) => {
                  const secCollapsed = collapsed.has(sec.id);
                  return (
                    <div key={sec.id}>
                      <Row
                        className="section-row"
                        caret={secCollapsed ? '▸' : '▾'}
                        onToggle={() => toggle(sec.id)}
                        selected={false}
                      >
                        <Title
                          renaming={isRenaming('section', sec.id)}
                          value={renaming?.value ?? ''}
                          display={sec.title}
                          onChange={(v) => setRenaming({ kind: 'section', id: sec.id, value: v })}
                          onCommit={commitRename}
                          onStartRename={() => setRenaming({ kind: 'section', id: sec.id, value: sec.title })}
                        />
                        <Actions>
                          <A title="添加场景" onClick={() => addScene(sec.id)}>＋场</A>
                          <A title="重命名" onClick={() => setRenaming({ kind: 'section', id: sec.id, value: sec.title })}>✎</A>
                          <A title="上移" onClick={() => moveSection(sec.id, -1)}>↑</A>
                          <A title="下移" onClick={() => moveSection(sec.id, 1)}>↓</A>
                          <A title="删除" onClick={() => removeSection(sec.id)}>🗑</A>
                        </Actions>
                      </Row>

                      {!secCollapsed &&
                        sec.scenes.map((sc) => (
                          <Row
                            key={sc.id}
                            className="scene-row"
                            selected={sc.id === selectedSceneId}
                            onSelect={() => selectScene(sc.id)}
                          >
                            <Title
                              renaming={isRenaming('scene', sc.id)}
                              value={renaming?.value ?? ''}
                              display={sc.title}
                              onChange={(v) => setRenaming({ kind: 'scene', id: sc.id, value: v })}
                              onCommit={commitRename}
                              onStartRename={() => setRenaming({ kind: 'scene', id: sc.id, value: sc.title })}
                            />
                            <Actions>
                              <A title="重命名" onClick={() => setRenaming({ kind: 'scene', id: sc.id, value: sc.title })}>✎</A>
                              <A title="上移" onClick={() => moveScene(sc.id, -1)}>↑</A>
                              <A title="下移" onClick={() => moveScene(sc.id, 1)}>↓</A>
                              <A title="删除" onClick={() => removeScene(sc.id)}>🗑</A>
                            </Actions>
                          </Row>
                        ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Row({
  className,
  caret,
  onToggle,
  selected,
  onSelect,
  children,
}: {
  className: string;
  caret?: string;
  onToggle?: () => void;
  selected: boolean;
  onSelect?: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className={`tree-row ${className} ${selected ? 'selected' : ''}`}
      onClick={() => (onSelect ? onSelect() : onToggle?.())}
    >
      {caret && (
        <span className="caret" onClick={onToggle}>
          {caret}
        </span>
      )}
      {!caret && <span className="caret" style={{ visibility: 'hidden' }}>•</span>}
      {children}
    </div>
  );
}

function Title({
  renaming,
  value,
  display,
  onChange,
  onCommit,
  onStartRename,
}: {
  renaming: boolean;
  value: string;
  display: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onStartRename: () => void;
}) {
  if (renaming) {
    return (
      <input
        className="input"
        style={{ flex: 1, padding: '2px 6px', fontSize: 12.5 }}
        value={value}
        autoFocus
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit();
          if (e.key === 'Escape') onCommit();
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }
  return (
    <span className="tlabel" onDoubleClick={onStartRename}>
      {display}
    </span>
  );
}

function Actions({ children }: { children: ReactNode }) {
  return (
    <span className="t-actions" onClick={(e) => e.stopPropagation()}>
      {children}
    </span>
  );
}

function A({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button className="icon-btn" title={title} onClick={onClick} style={{ width: 20, height: 20, fontSize: 12 }}>
      {children}
    </button>
  );
}
