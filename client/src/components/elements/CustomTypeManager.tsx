import { useState } from 'react';
import Modal from '../common/Modal';
import { useStore } from '../../store';
import type { CustomType, Novel } from '../../types';

const uid = () => crypto.randomUUID();

export default function CustomTypeManager({ onClose }: { onClose: () => void }) {
  const novel = useStore((s) => s.novel)!;
  const updateNovel = useStore((s) => s.updateNovel);
  const [draft, setDraft] = useState<CustomType[]>(() =>
    structuredClone(novel.customTypes || []),
  );

  const update = (id: string, patch: Partial<CustomType>) =>
    setDraft((d) => d.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const add = () =>
    setDraft((d) => [...d, { id: uid(), name: '新类型', icon: '🏷️', fieldDefs: [] }]);

  const remove = (id: string) => {
    const count = novel.elements.filter((e) => e.type === id).length;
    if (count > 0) {
      window.alert(`该类型下还有 ${count} 个元素，请先删除这些元素或把它们改到其它类型。`);
      return;
    }
    setDraft((d) => d.filter((t) => t.id !== id));
  };

  const updateField = (id: string, i: number, label: string) =>
    setDraft((d) =>
      d.map((t) =>
        t.id === id
          ? { ...t, fieldDefs: t.fieldDefs.map((fd, idx) => (idx === i ? { ...fd, label } : fd)) }
          : t,
      ),
    );
  const addField = (id: string) =>
    setDraft((d) =>
      d.map((t) =>
        t.id === id
          ? { ...t, fieldDefs: [...t.fieldDefs, { key: uid(), label: '' }] }
          : t,
      ),
    );
  const removeField = (id: string, i: number) =>
    setDraft((d) =>
      d.map((t) =>
        t.id === id ? { ...t, fieldDefs: t.fieldDefs.filter((_, idx) => idx !== i) } : t,
      ),
    );

  const save = () => {
    updateNovel((n: Novel) => {
      n.customTypes = draft;
    });
    onClose();
  };

  return (
    <Modal
      title="管理自定义类型"
      onClose={onClose}
      width={640}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={save}>
            保存
          </button>
        </>
      }
    >
      <div className="settings-grid">
        {draft.map((t) => (
          <div className="provider-card" key={t.id}>
            <div className="provider-head">
              <input
                className="input"
                style={{ width: 54, textAlign: 'center' }}
                value={t.icon || ''}
                onChange={(e) => update(t.id, { icon: e.target.value })}
                placeholder="🏷️"
              />
              <input
                className="input"
                style={{ maxWidth: 220, fontWeight: 700 }}
                value={t.name}
                onChange={(e) => update(t.id, { name: e.target.value })}
              />
              <div style={{ flex: 1 }} />
              <button className="btn btn-danger btn-sm" onClick={() => remove(t.id)}>
                删除
              </button>
            </div>
            <label className="field-label">字段定义（该类型元素的属性名）</label>
            <div className="field-list">
              {t.fieldDefs.map((fd, i) => (
                <div className="field-row" key={fd.key}>
                  <input
                    className="input"
                    value={fd.label}
                    placeholder="字段名"
                    onChange={(e) => updateField(t.id, i, e.target.value)}
                  />
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeField(t.id, i)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button className="btn btn-sm" onClick={() => addField(t.id)}>
                ＋ 添加字段
              </button>
            </div>
          </div>
        ))}
        <button className="btn" onClick={add}>
          ＋ 新增类型
        </button>
      </div>
    </Modal>
  );
}
