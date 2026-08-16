// LLM 提供方驱动：OpenAI 兼容（Ollama / DeepSeek / OpenAI 等）与 Anthropic，均以异步生成器流式输出 token。

async function* streamOpenAI({ baseURL, apiKey, model, messages, temperature, maxTokens }) {
  const url = `${String(baseURL || '').replace(/\/+$/, '')}/chat/completions`;
  const body = {
    model,
    messages,
    stream: true,
  };
  if (temperature != null && temperature !== '') body.temperature = Number(temperature);
  if (maxTokens) body.max_tokens = Number(maxTokens);

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(
      `无法连接到模型服务 ${url}（请确认地址正确且服务已启动）。详情：${err.message}`,
    );
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`模型请求失败 (${res.status})：${text.slice(0, 600)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const data = t.slice(5).trim();
      if (data === '[DONE]') return;
      try {
        const json = JSON.parse(data);
        const delta =
          json.choices?.[0]?.delta?.content ??
          json.choices?.[0]?.message?.content;
        if (delta) yield delta;
      } catch {
        /* 忽略无法解析的行 */
      }
    }
  }
}

async function* streamAnthropic({ baseURL, apiKey, model, messages, temperature, maxTokens }) {
  if (!apiKey) throw new Error('Claude 需要填写 API Key。');
  const url = `${String(baseURL || '').replace(/\/+$/, '')}/messages`;
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const msgs = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));

  const body = {
    model,
    max_tokens: maxTokens ? Number(maxTokens) : 4096,
    messages: msgs,
    stream: true,
  };
  if (system) body.system = system;
  if (temperature != null && temperature !== '') body.temperature = Number(temperature);

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(
      `无法连接到模型服务 ${url}（请确认地址正确且服务已启动）。详情：${err.message}`,
    );
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`模型请求失败 (${res.status})：${text.slice(0, 600)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const data = t.slice(5).trim();
      try {
        const json = JSON.parse(data);
        if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
          yield json.delta.text;
        }
      } catch {
        /* 忽略 */
      }
    }
  }
}

export function streamProvider(kind, opts) {
  return kind === 'anthropic' ? streamAnthropic(opts) : streamOpenAI(opts);
}
