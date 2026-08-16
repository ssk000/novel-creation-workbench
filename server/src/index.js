import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as store from './store.js';
import { streamProvider } from './llm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

/* ---------------- health ---------------- */
app.get('/api/health', (_req, res) => res.json({ ok: true }));

/* ---------------- novels ---------------- */
app.get('/api/novels', async (_req, res) => {
  res.json(await store.listNovels());
});

app.post('/api/novels', async (req, res) => {
  const novel = await store.createNovel(req.body || {});
  res.json(novel);
});

app.post('/api/novels/sample', async (_req, res) => {
  const novel = await store.createSampleNovel();
  res.json(novel);
});

app.get('/api/novels/:id', async (req, res) => {
  const novel = await store.getNovel(req.params.id);
  if (!novel) return res.status(404).json({ error: '小说不存在' });
  res.json(novel);
});

app.put('/api/novels/:id', async (req, res) => {
  const body = req.body || {};
  const novel = await store.getNovel(req.params.id);
  if (!novel) return res.status(404).json({ error: '小说不存在' });
  const merged = {
    ...novel,
    ...body,
    id: req.params.id,
    createdAt: novel.createdAt,
  };
  await store.saveNovel(merged);
  res.json(merged);
});

app.delete('/api/novels/:id', async (req, res) => {
  await store.deleteNovel(req.params.id);
  res.json({ ok: true });
});

/* ---------------- settings ---------------- */
app.get('/api/settings', async (_req, res) => {
  res.json(await store.getSettings());
});

app.put('/api/settings', async (req, res) => {
  res.json(await store.saveSettings(req.body || {}));
});

/* ---------------- LLM generation (SSE) ---------------- */
function sseInit(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
}

app.post('/api/generate', async (req, res) => {
  const { providerId, model, messages, temperature, maxTokens } = req.body || {};
  let clientGone = false;
  // 注意：不能监听 req 的 close（请求体读完后就会触发）；要监听 res 的 close，
  // 并区分“客户端中途断开”与“我们正常 end”。
  res.on('close', () => {
    if (!res.writableEnded) clientGone = true;
  });

  try {
    const settings = await store.getSettings();
    const provider = (settings.providers || []).find(
      (p) => p.id === (providerId || settings.defaultProviderId),
    );
    if (!provider) throw new Error('未找到模型配置，请先在「设置」中配置模型。');
    if (provider.kind !== 'openai' && !provider.apiKey) {
      throw new Error(`模型「${provider.name}」需要填写 API Key。`);
    }

    const opts = {
      baseURL: provider.baseURL,
      apiKey: provider.apiKey,
      model: model || provider.model,
      messages: Array.isArray(messages) ? messages : [],
      temperature,
      maxTokens,
    };

    sseInit(res);
    const write = (obj) => {
      if (!clientGone) res.write(`data: ${JSON.stringify(obj)}\n\n`);
    };

    for await (const token of streamProvider(provider.kind, opts)) {
      if (clientGone) break;
      write({ token });
    }
    write({ done: true });
    res.end();
  } catch (err) {
    if (res.headersSent) {
      if (!clientGone) res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    } else {
      res.status(400).json({ error: err.message });
    }
  }
});

/* ---------------- test connection ---------------- */
app.post('/api/test', async (req, res) => {
  const { providerId, model } = req.body || {};
  try {
    const settings = await store.getSettings();
    const provider = (settings.providers || []).find(
      (p) => p.id === (providerId || settings.defaultProviderId),
    );
    if (!provider) throw new Error('未找到模型配置');
    const opts = {
      baseURL: provider.baseURL,
      apiKey: provider.apiKey,
      model: model || provider.model,
      messages: [{ role: 'user', content: '请只回复两个字：正常' }],
      temperature: 0,
      maxTokens: 32,
    };
    let out = '';
    for await (const token of streamProvider(provider.kind, opts)) {
      out += token;
      if (out.length > 300) break;
    }
    res.json({ ok: true, sample: out.trim().slice(0, 120) });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

/* ---------------- static (production build) ---------------- */
const distDir = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[novel-workbench server] http://localhost:${PORT}`);
});
