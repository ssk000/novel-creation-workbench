import { useEffect, useState } from 'react';
import { useStore } from './store';
import NovelHome from './components/NovelHome';
import Workspace from './components/Workspace';
import SettingsModal from './components/settings/SettingsModal';

export default function App() {
  const novel = useStore((s) => s.novel);
  const settings = useStore((s) => s.settings);
  const loadNovels = useStore((s) => s.loadNovels);
  const loadSettings = useStore((s) => s.loadSettings);
  const [ready, setReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    (async () => {
      await Promise.all([loadNovels(), loadSettings()]);
      setReady(true);
    })();
  }, [loadNovels, loadSettings]);

  if (!ready) {
    return (
      <div className="boot">
        <div className="boot-title">小说创作工作台</div>
        <div className="boot-sub">正在加载…</div>
      </div>
    );
  }

  return (
    <div className="app">
      {novel ? (
        <Workspace onOpenSettings={() => setSettingsOpen(true)} />
      ) : (
        <NovelHome onOpenSettings={() => setSettingsOpen(true)} />
      )}
      {settingsOpen && settings && (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
