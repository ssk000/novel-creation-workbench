import { useMemo, useState } from 'react';
import { useStore } from '../../store';
import {
  BUILTIN_ELEMENT_TYPES,
  elementTypeMeta,
  type Element,
  type Novel,
} from '../../types';
import ElementEditor from './ElementEditor';
import CustomTypeManager from './CustomTypeManager';

const uid = () => crypto.randomUUID();

export default function ElementLibrary() {
  const novel = useStore((s) => s.novel)!;
  const updateNovel = useStore((s) => s.updateNovel);

  const [filter, setFilter] = useState<string>('all');
  const [editing, setEditing] = useState<{ element: Element; isNew: boolean } | null>(null);
  const [managingTypes, setManagingTypes] = useState(false);

  const customTypes = novel.customTypes || [];
  const elements = novel.elements || [];

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: elements.length };
    for (const e of elements) c[e.type] = (c[e.type] || 0) + 1;
    return c;
  }, [elements]);

  const filtered = useMemo(
    () => (filter === 'all' ? elements : elements.filter((e) => e.type === filter)),
    [filter, elements],
  );

  const refs = useMemo(() => {
    const map: Record<string, { chapterTitle: string; sceneTitle: string }[]> = {};
    for (const el of elements) map[el.id] = [];
    for (const ch of novel.chapters) {
      for (const sec of ch.sections) {
        for (const sc of sec.scenes) {
          for (const id of sc.linkedElementIds || []) {
            (map[id] ||= []).push({ chapterTitle: ch.title, sceneTitle: sc.title });
          }
        }
      }
    }
    return map;
  }, [elements, novel.chapters]);

  const startCreate = () => {
    const type = filter === 'all' ? 'character' : filter;
    const ct = customTypes.find((t) => t.id === type);
    const el: Element = {
      id: uid(),
      type,
      name: '',
      summary: '',
      description: '',
      fields: ct ? ct.fieldDefs.map((fd) => ({ key: fd.label, value: '' })) : [],
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setEditing({ element: el, isNew: true });
  };

  const saveElement = (el: Element) => {
    updateNovel((n: Novel) => {
      const idx = n.elements.findIndex((e) => e.id === el.id);
      if (idx >= 0) n.elements[idx] = { ...el, updatedAt: Date.now() };
      else n.elements.push({ ...el, updatedAt: Date.now() });
    });
    setEditing(null);
  };

  const deleteElement = (id: string) => {
    if (!window.confirm('删除该元素？相关场景的引用会一并清除。')) return;
    updateNovel((n: Novel) => {
      n.elements = n.elements.filter((e) => e.id !== id);
      for (const ch of n.chapters)
        for (const sec of ch.sections)
          for (const sc of sec.scenes)
            sc.linkedElementIds = (sc.linkedElementIds || []).filter((x) => x !== id);
    });
  };

  const typeItems = [
    { id: 'all', label: '全部', icon: '📚' },
    ...BUILTIN_ELEMENT_TYPES.map((t) => ({ id: t.type, label: t.label, icon: t.icon })),
    ...customTypes.map((t) => ({ id: t.id, label: t.name, icon: t.icon || '🏷️' })),
  ];

  const currentMeta =
    filter === 'all' ? { label: '全部元素', icon: '📚' } : elementTypeMeta(filter, customTypes);

  return (
    <div className="elib">
      <div className="elib-sidebar">
        {typeItems.map((t) => (
          <div
            key={t.id}
            className={`elib-type ${filter === t.id ? 'active' : ''}`}
            onClick={() => setFilter(t.id)}
          >
            <span>{t.icon}</span> {t.label}
            <span className="count">{counts[t.id] || 0}</span>
          </div>
        ))}
        <div className="elib-sidebar-foot">
          <button className="btn btn-sm" style={{ width: '100%' }} onClick={() => setManagingTypes(true)}>
            ＋ 管理自定义类型
          </button>
        </div>
      </div>

      <div className="elib-main">
        <div className="elib-main-head">
          <div className="elib-main-title">
            {currentMeta.icon} {currentMeta.label}
          </div>
          <button className="btn btn-primary" onClick={startCreate}>
            ＋ 新建元素
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="big">{currentMeta.icon}</div>
            还没有元素，点击「新建元素」创建。
          </div>
        ) : (
          <div className="elib-grid">
            {filtered.map((el) => {
              const meta = elementTypeMeta(el.type, customTypes);
              return (
                <div
                  key={el.id}
                  className="element-card"
                  onClick={() => setEditing({ element: el, isNew: false })}
                >
                  <div className="element-card-top">
                    <span className="element-card-icon">{meta.icon}</span>
                    <span className="element-card-name">{el.name || '（未命名）'}</span>
                  </div>
                  <div className="element-card-summary">{el.summary || '（暂无概述）'}</div>
                  {el.tags && el.tags.length > 0 && (
                    <div className="element-card-tags">
                      {el.tags.map((t) => (
                        <span key={t} className="tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="hint">{(refs[el.id] || []).length} 个场景引用</span>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteElement(el.id);
                      }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing && (
        <ElementEditor
          element={editing.element}
          typeLabel={elementTypeMeta(editing.element.type, customTypes).label}
          refs={refs[editing.element.id] || []}
          onSave={saveElement}
          onClose={() => setEditing(null)}
        />
      )}
      {managingTypes && <CustomTypeManager onClose={() => setManagingTypes(false)} />}
    </div>
  );
}
