import { useStore } from '../store';
import { useUI } from '../uiStore';
import ElementLibrary from './elements/ElementLibrary';
import PlotBoard from './plot/PlotBoard';
import CreationStudio from './studio/CreationStudio';

const TABS = [
  { id: 'elements', label: '元素库', icon: '🧩' },
  { id: 'plot', label: '情节板', icon: '🕸️' },
  { id: 'studio', label: '创作台', icon: '✍️' },
] as const;

export default function Workspace({ onOpenSettings }: { onOpenSettings: () => void }) {
  const novel = useStore((s) => s.novel);
  const closeNovel = useStore((s) => s.closeNovel);
  const dirty = useStore((s) => s.dirty);
  const saving = useStore((s) => s.saving);
  const tab = useUI((s) => s.tab);
  const setTab = useUI((s) => s.setTab);

  if (!novel) return null;

  return (
    <>
      <div className="topbar">
        <button className="btn btn-ghost btn-sm" onClick={closeNovel}>
          ← 书架
        </button>
        <div className="topbar-title">{novel.title}</div>
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="topbar-spacer" />
        <div className={`save-indicator ${dirty ? 'dirty' : 'saved'}`}>
          {saving ? '⏳ 保存中…' : dirty ? '● 未保存' : '✓ 已保存'}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onOpenSettings}>
          ⚙️
        </button>
      </div>

      <div className="workspace-body">
        {tab === 'elements' && <ElementLibrary />}
        {tab === 'plot' && <PlotBoard />}
        {tab === 'studio' && <CreationStudio />}
      </div>
    </>
  );
}
