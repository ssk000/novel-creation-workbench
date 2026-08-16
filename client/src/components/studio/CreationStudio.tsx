import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store';
import { useUI } from '../../uiStore';
import { streamGenerate } from '../../api';
import { collectScenes, findScene, type SceneRef } from '../../novelUtils';
import { elementTypeMeta, type Novel } from '../../types';

const DEFAULT_SYSTEM =
  '你是一位资深小说作者，擅长刻画人物、营造氛围、推进情节。请严格依据给定的设定与剧情结构进行创作，语言流畅、富有画面感，不偏离设定，不引入设定之外的关键事实。直接输出正文，不要输出解释或说明。';

const DEFAULT_INSTRUCTION =
  '请根据以上设定与剧情结构，撰写「当前场景」的完整正文（约 800 字），注意人物动机、情绪递进与场景氛围。';

function buildContext(novel: Novel, ref: SceneRef, includeAll: boolean): string {
  const lines: string[] = [];
  lines.push(`【小说】${novel.title}`);
  if (novel.genre) lines.push(`题材：${novel.genre}`);
  if (novel.description) lines.push(`简介：${novel.description}`);
  lines.push('');

  lines.push('【情节结构】');
  for (const ch of novel.chapters) {
    lines.push(`- ${ch.title}${ch.summary ? '：' + ch.summary : ''}`);
    for (const sec of ch.sections) {
      lines.push(`  · ${sec.title}${sec.summary ? '：' + sec.summary : ''}`);
      for (const sc of sec.scenes) {
        const mark = sc.id === ref.scene.id ? ' ← 当前场景' : '';
        lines.push(`    ◦ ${sc.title}${sc.summary ? '：' + sc.summary : ''}${mark}`);
      }
    }
  }
  lines.push('');

  lines.push('【当前场景】');
  lines.push(`标题：${ref.scene.title}`);
  if (ref.scene.summary) lines.push(`概要：${ref.scene.summary}`);
  if (ref.scene.goal) lines.push(`目标：${ref.scene.goal}`);
  if (ref.scene.conflict) lines.push(`冲突：${ref.scene.conflict}`);
  if (ref.scene.pov) lines.push(`视角：${ref.scene.pov}`);
  lines.push('');

  const ids = includeAll
    ? novel.elements.map((e) => e.id)
    : ref.scene.linkedElementIds || [];
  const els = novel.elements.filter((e) => ids.includes(e.id));
  if (els.length > 0) {
    lines.push('【关联元素】');
    for (const el of els) {
      const meta = elementTypeMeta(el.type, novel.customTypes || []);
      lines.push(`• ${meta.label}「${el.name}」${el.summary ? ' —— ' + el.summary : ''}`);
      if (el.description) lines.push(`  ${el.description}`);
      for (const f of el.fields || []) if (f.key && f.value) lines.push(`  ${f.key}：${f.value}`);
    }
  }
  return lines.join('\n');
}

export default function CreationStudio() {
  const novel = useStore((s) => s.novel)!;
  const updateNovel = useStore((s) => s.updateNovel);
  const settings = useStore((s) => s.settings);
  const selectedSceneId = useUI((s) => s.selectedSceneId);
  const selectScene = useUI((s) => s.selectScene);

  const scenes = useMemo(() => collectScenes(novel), [novel]);
  const [targetId, setTargetId] = useState<string>(() => {
    const first = scenes[0]?.scene.id;
    return selectedSceneId && findScene(novel, selectedSceneId) ? selectedSceneId : first;
  });
  useEffect(() => {
    if (selectedSceneId && findScene(novel, selectedSceneId)) {
      setTargetId(selectedSceneId);
    }
  }, [selectedSceneId, novel]);

  const ref = findScene(novel, targetId) ?? scenes[0] ?? null;

  const [mode, setMode] = useState<'rewrite' | 'append'>('rewrite');
  const [includeAll, setIncludeAll] = useState(false);
  const [providerId, setProviderId] = useState<string>(settings?.defaultProviderId ?? '');
  const [model, setModel] = useState('');
  const [temperature, setTemperature] = useState(0.8);
  const [maxTokens, setMaxTokens] = useState('');
  const [instruction, setInstruction] = useState(DEFAULT_INSTRUCTION);
  const [systemPrompt, setSystemPrompt] = useState(() => {
    return localStorage.getItem('studio.system') ?? DEFAULT_SYSTEM;
  });
  useEffect(() => {
    localStorage.setItem('studio.system', systemPrompt);
  }, [systemPrompt]);

  const [generating, setGenerating] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const acRef = useRef<AbortController | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => () => acRef.current?.abort(), []);

  // 流式生成时，让预览框始终滚动到最新内容
  useEffect(() => {
    const el = previewRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [streamText]);

  const context = useMemo(
    () => (ref ? buildContext(novel, ref, includeAll) : ''),
    [novel, ref, includeAll],
  );

  const draft = ref ? ref.scene.draft || '' : '';
  const charCount = draft.replace(/\s/g, '').length;

  const provider = settings?.providers.find((p) => p.id === providerId);

  const generate = async () => {
    if (!ref || generating) return;
    setError(null);
    setStreamText('');
    const ac = new AbortController();
    acRef.current = ac;
    setGenerating(true);

    const user = `${context}\n\n【写作要求】\n${instruction}`;
    let acc = '';
    try {
      await streamGenerate(
        {
          providerId,
          model: model.trim() || undefined,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: user },
          ],
          temperature,
          maxTokens: maxTokens ? Number(maxTokens) : undefined,
        },
        (t) => {
          acc += t;
          setStreamText(acc);
        },
        ac.signal,
      );
      const final = acc;
      updateNovel((n: Novel) => {
        const r = findScene(n, ref.scene.id);
        if (!r) return;
        const base = mode === 'append' && r.scene.draft ? r.scene.draft.trimEnd() + '\n\n' : '';
        r.scene.draft = base + final;
        r.scene.updatedAt = Date.now();
      });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setGenerating(false);
      acRef.current = null;
    }
  };

  const stop = () => acRef.current?.abort();

  if (!ref) {
    return (
      <div className="studio">
        <div className="empty-state" style={{ flex: 1 }}>
          <div className="big">✍️</div>
          请先在情节板中创建章节与场景。
        </div>
      </div>
    );
  }

  return (
    <div className="studio">
      <div className="studio-left">
        <div className="panel-section">
          <label className="field-label">目标场景</label>
          <select
            className="select"
            value={targetId}
            onChange={(e) => {
              setTargetId(e.target.value);
              selectScene(e.target.value);
            }}
          >
            {scenes.map((s) => (
              <option key={s.scene.id} value={s.scene.id}>
                {s.chapter.title} / {s.section.title} / {s.scene.title}
              </option>
            ))}
          </select>
        </div>

        <div className="panel-section">
          <label className="field-label">模型</label>
          <select className="select" value={providerId} onChange={(e) => setProviderId(e.target.value)}>
            {(settings?.providers || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            className="input"
            style={{ marginTop: 6 }}
            placeholder={`模型名称（留空用「${provider?.model || '默认'}」）`}
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
        </div>

        <div className="panel-section">
          <label className="field-label">写作指令</label>
          <textarea
            className="textarea"
            rows={3}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
          />
        </div>

        <div className="panel-section">
          <label className="field-label">系统提示词（角色设定）</label>
          <textarea
            className="textarea"
            rows={4}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
          />
        </div>

        <div className="panel-section gen-controls">
          <div className="gen-row">
            <label style={{ fontSize: 12, color: 'var(--text-muted)', width: 60 }}>生成方式</label>
            <select className="select" value={mode} onChange={(e) => setMode(e.target.value as 'rewrite' | 'append')}>
              <option value="rewrite">重写（覆盖现有正文）</option>
              <option value="append">续写（追加到现有正文后）</option>
            </select>
          </div>
          <div className="gen-row">
            <label style={{ fontSize: 12, color: 'var(--text-muted)', width: 60 }}>温度</label>
            <input
              className="input"
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
            />
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>最大 token</label>
            <input
              className="input"
              type="number"
              placeholder="默认"
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
            />
          </div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={includeAll} onChange={(e) => setIncludeAll(e.target.checked)} />
            注入全部元素（而不只是关联元素）
          </label>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <button
          className="btn btn-primary"
          style={{ width: '100%', marginBottom: 8 }}
          onClick={generate}
          disabled={generating}
        >
          {generating ? '生成中…' : mode === 'append' ? '✍️ 续写正文' : '✍️ 生成正文'}
        </button>
        {generating && (
          <button className="btn" style={{ width: '100%' }} onClick={stop}>
            ⏹ 停止
          </button>
        )}

        <div className="panel-section" style={{ marginTop: 14 }}>
          <label className="field-label">注入上下文预览（发送给模型）</label>
          <div className="context-box">
            {context}
          </div>
        </div>
      </div>

      <div className="studio-right">
        <div className="studio-draft-head">
          <span style={{ fontWeight: 700 }}>✍️ 正文草稿</span>
          <span className="hint">
            {ref.scene.title} · {charCount} 字
          </span>
          <div style={{ flex: 1 }} />
          {generating && (
            <span className="stream-indicator">
              <span className="pulse" /> 正在生成…
            </span>
          )}
        </div>

        {generating && streamText.length > 0 && (
          <div
            ref={previewRef}
            className="context-box"
            style={{ margin: 12, maxHeight: 220, fontSize: 13.5, fontFamily: 'var(--font)', lineHeight: 1.7 }}
          >
            {streamText}
          </div>
        )}

        <textarea
          className="draft-editor"
          value={draft}
          placeholder="在此直接写作，或使用左侧「生成正文 / 续写正文」让模型撰写…"
          onChange={(e) =>
            updateNovel((n: Novel) => {
              const r = findScene(n, ref.scene.id);
              if (r) r.scene.draft = e.target.value;
            })
          }
        />
      </div>
    </div>
  );
}
