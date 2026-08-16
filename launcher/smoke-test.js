'use strict';
/**
 * 冒烟测试：不依赖 Electron，仅验证 harness 核心逻辑。
 * 用法：node smoke-test.js [port]
 * 会真实启动一次后端服务，解析 URL 后自动停止。
 */
const harness = require('./harness');

const projectDir = harness.defaultProjectDir();
const port = Number(process.argv[2] || 3999);

console.log('项目目录:', projectDir);
console.log('是否为项目目录:', harness.isProjectDir(projectDir));
console.log('构建命令:', JSON.stringify(harness.buildCommand({ projectDir, port })));

if (!harness.isProjectDir(projectDir)) {
  console.error('❌ 未找到项目目录（缺少 server/src/index.js）');
  process.exit(1);
}

const c = harness.createController();
let urlSeen = false;
const timeout = setTimeout(() => {
  console.error('❌ 超时：未在日志中解析到 URL');
  c.killNow();
  process.exit(1);
}, 15000);

c.onChange((s, change) => {
  if (change === 'url' && s.url) {
    urlSeen = true;
    console.log('✅ 解析到 URL:', s.url);
  }
  if (change === 'exit') {
    clearTimeout(timeout);
    console.log('✅ 进程已退出');
    console.log(urlSeen ? '✅ 冒烟测试通过' : '❌ 未解析到 URL');
    process.exit(urlSeen ? 0 : 1);
  }
});

const r = c.start({ projectDir, port, autoOpen: false });
if (!r.ok) {
  console.error('❌ 启动失败:', r.error);
  process.exit(1);
}
console.log('✅ 已启动 pid=', r.pid, '，等待服务就绪…');

setTimeout(() => {
  if (urlSeen) {
    console.log('停止服务…');
    c.stop().then(() => {});
  }
}, 2500);
