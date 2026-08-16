import { useState } from 'react';
import { useStore } from '../store';
import Modal from './common/Modal';
import type { NovelMeta } from '../types';

export default function NovelHome({ onOpenSettings }: { onOpenSettings: () => void }) {
  const novels = useStore((s) => s.novels);
  const openNovel = useStore((s) => s.openNovel);
  const createNovel = useStore((s) => s.createNovel);
  const createSample = useStore((s) => s.createSample);
  const deleteNovel = useStore((s) => s.deleteNovel);

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    await createNovel({ title: title.trim(), genre: genre.trim(), description: desc.trim() });
    setBusy(false);
    setCreating(false);
    setTitle('');
    setGenre('');
    setDesc('');
  };

  return (
    <div className="home">
      <div className="home-inner">
        <div className="home-header">
          <div>
            <div className="home-title">小说创作工作台</div>
            <p className="home-sub">选择一部小说，进入「元素库 · 情节板 · 创作台」。</p>
          </div>
          <button className="btn" onClick={onOpenSettings}>
            ⚙️ 模型设置
          </button>
        </div>

        <div className="home-toolbar">
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            ＋ 新建小说
          </button>
          <button
            className="btn"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await createSample();
              setBusy(false);
            }}
          >
            ✦ 载入示例
          </button>
        </div>

        {novels.length === 0 ? (
          <div className="empty-state">
            <div className="big">📖</div>
            还没有小说，点击「新建小说」或「载入示例」开始吧。
          </div>
        ) : (
          <div className="novel-grid">
            {novels.map((n) => (
              <NovelCard
                key={n.id}
                meta={n}
                onOpen={() => openNovel(n.id)}
                onDelete={() => deleteNovel(n.id)}
              />
            ))}
          </div>
        )}
      </div>

      {creating && (
        <Modal
          title="新建小说"
          onClose={() => setCreating(false)}
          footer={
            <>
              <button className="btn" onClick={() => setCreating(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={submit} disabled={!title.trim() || busy}>
                创建
              </button>
            </>
          }
        >
          <div className="form-row">
            <label className="field-label">书名</label>
            <input
              className="input"
              value={title}
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：星尘之约"
            />
          </div>
          <div className="form-row">
            <label className="field-label">类型 / 题材</label>
            <input
              className="input"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="例如：科幻奇幻"
            />
          </div>
          <div className="form-row">
            <label className="field-label">简介</label>
            <textarea
              className="textarea"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="一句话或几句话概括这个故事…"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

function NovelCard({
  meta,
  onOpen,
  onDelete,
}: {
  meta: NovelMeta;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="novel-card" onClick={onOpen}>
      <button
        className="icon-btn novel-card-del"
        title="删除"
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm(`删除「${meta.title}」？此操作不可恢复。`)) onDelete();
        }}
      >
        🗑️
      </button>
      <div className="novel-card-title">{meta.title}</div>
      <div className="novel-card-meta">{meta.genre && <span className="badge">{meta.genre}</span>}</div>
      <div className="novel-card-desc">{meta.description || '（暂无简介）'}</div>
      <div className="novel-card-time">更新于 {new Date(meta.updatedAt).toLocaleString()}</div>
    </div>
  );
}
