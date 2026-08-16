import { useState } from 'react';
import { useStore } from '../../store';
import { useUI } from '../../uiStore';
import { findScene } from '../../novelUtils';
import { elementTypeMeta, type Novel, type Scene } from '../../types';

export default function ScenePanel() {
  const novel = useStore((s) => s.novel)!;
  const updateNovel = useStore((s) => s.updateNovel);
  const selectedSceneId = useUI((s) => s.selectedSceneId);
  const setTab = useUI((s) => s.setTab);
  const [search, setSearch] = useState('');

  const ref = selectedSceneId ? findScene(novel, selectedSceneId) : null;

  if (!ref) {
    return (
      <div className="plot-detail">
        <div className="hint" style={{ marginTop: 20 }}>
          在画布或左侧大纲中选择一个场景，即可在此编辑它的剧情结构与关联元素。
        </div>
      </div>
    );
  }

  const { scene, chapter, section } = ref;
  const customTypes = novel.customTypes || [];

  const setScene = (patch: Partial<Scene>) =>
    updateNovel((n: Novel) => {
      const r = findScene(n, scene.id);
      if (r) Object.assign(r.scene, patch, { updatedAt: Date.now() });
    });

  const toggleLink = (elId: string) =>
    updateNovel((n: Novel) => {
      const r = findScene(n, scene.id);
      if (!r) return;
      const cur = r.scene.linkedElementIds || [];
      r.scene.linkedElementIds = cur.includes(elId)
        ? cur.filter((x) => x !== elId)
        : [...cur, elId];
    });

  const q = search.trim();
  const filteredElements = novel.elements.filter((el) => !q || el.name.includes(q));

  return (
    <div className="plot-detail">
      <div className="panel-title">📄 场景详情</div>
      <div className="panel-section">
        <span className="hint">
          {chapter.title} / {section.title}
        </span>
      </div>

      <div className="panel-section">
        <label className="field-label">场景标题</label>
        <input className="input" value={scene.title} onChange={(e) => setScene({ title: e.target.value })} />
      </div>
      <div className="panel-section">
        <label className="field-label">剧情概要</label>
        <textarea className="textarea" rows={3} value={scene.summary} onChange={(e) => setScene({ summary: e.target.value })} />
      </div>
      <div className="panel-section">
        <label className="field-label">本场目标</label>
        <input className="input" value={scene.goal || ''} onChange={(e) => setScene({ goal: e.target.value })} />
      </div>
      <div className="panel-section">
        <label className="field-label">冲突 / 张力</label>
        <input className="input" value={scene.conflict || ''} onChange={(e) => setScene({ conflict: e.target.value })} />
      </div>
      <div className="panel-section">
        <label className="field-label">视角（POV）</label>
        <input className="input" value={scene.pov || ''} onChange={(e) => setScene({ pov: e.target.value })} />
      </div>

      <div className="panel-section">
        <label className="field-label">关联元素（创作台将据此注入上下文）</label>
        <input
          className="input"
          placeholder="搜索元素…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <div className="link-picker">
          {filteredElements.map((el) => {
            const meta = elementTypeMeta(el.type, customTypes);
            const on = (scene.linkedElementIds || []).includes(el.id);
            return (
              <span
                key={el.id}
                className={`link-chip ${on ? 'on' : ''}`}
                onClick={() => toggleLink(el.id)}
                title={el.summary}
              >
                {meta.icon} {el.name}
              </span>
            );
          })}
        </div>
      </div>

      <div className="panel-section">
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setTab('studio')}>
          ✍️ 去创作台生成正文
        </button>
      </div>
    </div>
  );
}
