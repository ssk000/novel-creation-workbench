import { useState } from 'react';
import { useStore } from '../../store';
import { api } from '../../api';
import Modal from '../common/Modal';
import type { Provider, Settings } from '../../types';

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const settings = useStore((s) => s.settings);
  const saveSettings = useStore((s) => s.saveSettings);
  const [draft, setDraft] = useState<Settings>(() => structuredClone(settings!));
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({});

  const updateProvider = (id: string, patch: Partial<Provider>) => {
    setDraft((d) => ({
      ...d,
      providers: d.providers.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  const test = async (p: Provider) => {
    setTesting(p.id);
    setTestResult((r) => ({ ...r, [p.id]: undefined as never }));
    try {
      const res = await api.testProvider(p.id, p.model);
      setTestResult((r) => ({
        ...r,
        [p.id]: { ok: true, msg: res.sample ? `连通，模型回复：${res.sample}` : '连通成功' },
      }));
    } catch (e) {
      setTestResult((r) => ({
        ...r,
        [p.id]: { ok: false, msg: e instanceof Error ? e.message : String(e) },
      }));
    } finally {
      setTesting(null);
    }
  };

  return (
    <Modal
      title="⚙️ 模型设置"
      onClose={onClose}
      width={780}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={async () => {
              await saveSettings(draft);
              onClose();
            }}
          >
            保存
          </button>
        </>
      }
    >
      <div className="form-row">
        <label className="field-label">默认模型（创作台生成时优先使用）</label>
        <select
          className="select"
          value={draft.defaultProviderId}
          onChange={(e) => setDraft((d) => ({ ...d, defaultProviderId: e.target.value }))}
        >
          {draft.providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="settings-grid">
        {draft.providers.map((p) => {
          const r = testResult[p.id];
          return (
            <div className="provider-card" key={p.id}>
              <div className="provider-head">
                <input
                  className="input"
                  style={{ maxWidth: 220, fontWeight: 700 }}
                  value={p.name}
                  onChange={(e) => updateProvider(p.id, { name: e.target.value })}
                />
                <span className="provider-kind">{p.kind === 'anthropic' ? 'Anthropic' : 'OpenAI 兼容'}</span>
                <div style={{ flex: 1 }} />
                <button
                  className="btn btn-sm"
                  disabled={testing === p.id}
                  onClick={() => test(p)}
                >
                  {testing === p.id ? '测试中…' : '测试连接'}
                </button>
              </div>
              <div className="provider-fields">
                <label className="full">
                  <span className="field-label">接口地址 baseURL</span>
                  <input
                    className="input"
                    value={p.baseURL}
                    onChange={(e) => updateProvider(p.id, { baseURL: e.target.value })}
                  />
                </label>
                <label className="full">
                  <span className="field-label">API Key（本地 Ollama 可留空）</span>
                  <input
                    className="input"
                    type="password"
                    value={p.apiKey}
                    placeholder={p.kind === 'openai' ? 'sk-…' : 'sk-ant-…'}
                    onChange={(e) => updateProvider(p.id, { apiKey: e.target.value })}
                  />
                </label>
                <label>
                  <span className="field-label">模型名称</span>
                  <input
                    className="input"
                    value={p.model}
                    onChange={(e) => updateProvider(p.id, { model: e.target.value })}
                  />
                </label>
                <label>
                  <span className="field-label">协议类型</span>
                  <select
                    className="select"
                    value={p.kind}
                    onChange={(e) => updateProvider(p.id, { kind: e.target.value as Provider['kind'] })}
                  >
                    <option value="openai">OpenAI 兼容</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </label>
              </div>
              {r && (
                <div className={`error-banner`} style={r.ok ? { background: 'rgba(62,207,142,0.1)', border: '1px solid rgba(62,207,142,0.3)', color: '#7ee6b5' } : undefined}>
                  {r.msg}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="hint" style={{ marginTop: 14 }}>
        提示：Ollama 本地默认地址为 http://localhost:11434/v1（需已运行 Ollama 并拉取模型）；DeepSeek / OpenAI / 中转站等使用 OpenAI
        兼容协议，填对应 baseURL 与 Key 即可；Claude 使用 Anthropic 协议。
      </p>
    </Modal>
  );
}
