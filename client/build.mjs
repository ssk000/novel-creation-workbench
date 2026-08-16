// 纯 JS 构建脚本：先 Babel 预编译 src 的 TS/TSX → 纯 JS，再用 Rollup 打包（不依赖 worker 线程或原生二进制）。
import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import { transformAsync } from '@babel/core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcDir = path.join(__dirname, 'src');
const preDir = path.join(__dirname, '.prebuild');
const dist = path.join(__dirname, 'dist');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

async function transpile() {
  fs.rmSync(preDir, { recursive: true, force: true });
  const files = walk(srcDir);
  for (const file of files) {
    const rel = path.relative(srcDir, file);
    const isTS = /\.(ts|tsx)$/.test(rel);
    const outPath = path.join(preDir, isTS ? rel.replace(/\.(ts|tsx)$/, '.js') : rel);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    if (isTS) {
      const code = fs.readFileSync(file, 'utf8');
      const result = await transformAsync(code, {
        filename: file,
        babelrc: false,
        configFile: false,
        presets: [
          ['@babel/preset-react', { runtime: 'automatic', development: false }],
          '@babel/preset-typescript',
        ],
      });
      if (!result || !result.code) throw new Error(`Babel transform failed for ${file}`);
      fs.writeFileSync(outPath, result.code, 'utf8');
    } else {
      fs.copyFileSync(file, outPath);
    }
  }
  console.log(`[build] transpiled ${files.length} files ->`, preDir);
}

/* 收集 .css 内容并合并输出 */
const cssChunks = [];
function cssCollect() {
  return {
    name: 'css-collect',
    resolveId(source, importer) {
      if (source.endsWith('.css')) {
        return this.resolve(source, importer, { skipSelf: true });
      }
      return null;
    },
    load(id) {
      if (id.endsWith('.css')) {
        cssChunks.push(fs.readFileSync(id, 'utf8'));
        return 'export default "";';
      }
      return null;
    },
  };
}

async function build() {
  await transpile();

  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });

  const bundle = await rollup({
    input: path.join(preDir, 'main.js'),
    plugins: [
      cssCollect(),
      nodeResolve({
        browser: true,
        extensions: ['.js', '.mjs', '.json'],
      }),
      commonjs(),
      replace({ preventAssignment: true, 'process.env.NODE_ENV': JSON.stringify('production') }),
    ],
  });

  await bundle.write({
    format: 'es',
    dir: path.join(dist, 'assets'),
    entryFileNames: 'index.js',
    chunkFileNames: 'chunk-[hash].js',
  });

  fs.writeFileSync(path.join(dist, 'assets', 'index.css'), cssChunks.join('\n'), 'utf8');

  const xyflowCss = path.join(root, 'node_modules', '@xyflow', 'react', 'dist', 'style.css');
  fs.copyFileSync(xyflowCss, path.join(dist, 'assets', 'xyflow.css'));

  const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>小说创作工作台</title>
    <link rel="stylesheet" href="/assets/xyflow.css" />
    <link rel="stylesheet" href="/assets/index.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/index.js"></script>
  </body>
</html>
`;
  fs.writeFileSync(path.join(dist, 'index.html'), html, 'utf8');

  await bundle.close();
  console.log('[build] done ->', dist);
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
