import { useState } from 'react';
import Modal from '../common/Modal';
import type { Element, ElementField } from '../../types';

export default function ElementEditor({
  element,
  typeLabel,
  refs,
  onSave,
  onClose,
}: {
  element: Element;
  typeLabel: string;
  refs: { chapterTitle: string; sceneTitle: string }[];
  onSave: (e: Element) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Element>(() => structuredClone(element));
  const [tagsText, setTagsText] = useState(() => (element.tags || []).join(', '));

  const set = (patch: Partial<Element>) => setDraft((d) => ({ ...d, ...patch }));
  const updateField = (i: number, patch: Partial<ElementField>) =>
    setDraft((d) => ({
      ...d,
      fields: d.fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)),
    }));
  const addField = () =>
    setDraft((d) => ({ ...d, fields: [...d.fields, { key: '', value: '' }] }));
  const removeField = (i: number) =>
    setDraft((d) => ({ ...d, fields: d.fields.filter((_, idx) => idx !== i) }));

  const save = () => {
    if (!draft.name.trim()) return;
    onSave({
      ...draft,
      name: draft.name.trim(),
      tags: tagsText
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean),
    });
  };

  return (
    <Modal
      title={`编辑元素 · ${typeLabel}`}
      onClose={onClose}
      width={640}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={save} disabled={!draft.name.trim()}>
            保存
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="form-row">
          <label className="field-label">名称 *</label>
          <input
            className="input"
            value={draft.name}
            autoFocus
            onChange={(e) => set({ name: e.target.value })}
            placeholder="角色名 / 地名 / 物品名…"
          />
        </div>
        <div className="form-row">
          <label className="field-label">标签（逗号分隔）</label>
          <input
            className="input"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="主角, 神秘"
          />
        </div>
      </div>
      <div className="form-row">
        <label className="field-label">一句话概述</label>
        <input
          className="input"
          value={draft.summary}
          onChange={(e) => set({ summary: e.target.value })}
          placeholder="用于生成时的精简上下文"
        />
      </div>
      <div className="form-row">
        <label className="field-label">详细描述</label>
        <textarea
          className="textarea"
          rows={5}
          value={draft.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </div>
      <div className="form-row">
        <label className="field-label">属性字段</label>
        <div className="field-list">
          {draft.fields.map((f, i) => (
            <div className="field-row" key={i}>
              <input
                className="input"
                value={f.key}
                placeholder="字段名"
                onChange={(e) => updateField(i, { key: e.target.value })}
              />
              <input
                className="input"
                value={f.value}
                placeholder="内容"
                onChange={(e) => updateField(i, { value: e.target.value })}
              />
              <button className="btn btn-ghost btn-sm" onClick={() => removeField(i)}>
                ✕
              </button>
            </div>
          ))}
          <button className="btn btn-sm" onClick={addField}>
            ＋ 添加字段
          </button>
        </div>
      </div>
      {refs.length > 0 && (
        <div className="form-row">
          <label className="field-label">被以下场景引用</label>
          <div className="context-box">
            {refs.map((r, i) => (
              <div key={i}>
                <span className="k">{r.chapterTitle}</span> · {r.sceneTitle}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
