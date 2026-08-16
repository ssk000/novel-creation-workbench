'use strict';
/**
 * 生成多尺寸 ICO 图标：把源 PNG 用 sharp 缩放成多档，再拼成 ICO。
 * 用法：node make-icon.js [源图片路径]
 * 产物：build/icon.ico、build/icon-256.png（预览）
 */
const fs = require('fs');
const path = require('path');

function loadSharp() {
  try { return require('sharp'); } catch (_) { /* 继续尝试其它位置 */ }
  try { return require('C:/Users/Kun/.dsh/profiles/node_modules/sharp'); } catch (_) { /* 继续 */ }
  throw new Error('未找到 sharp，请先 `npm install sharp`，或在脚本里指定 sharp 的路径');
}
const sharp = loadSharp();

// 源图片：优先取命令行参数，否则回退到默认位置
const SRC = process.argv[2] || 'C:/Users/Kun/Downloads/写作专项课.png';
const OUT = path.join(__dirname, 'build', 'icon.ico');
const PREVIEW = path.join(__dirname, 'build', 'icon-256.png');
const SIZES = [256, 128, 64, 48, 32, 16];

function buildIco(pngs) {
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(count, 4);

  const entries = [];
  const blobs = [];
  let offset = 6 + count * 16;
  for (const { size, buffer } of pngs) {
    const e = Buffer.alloc(16);
    const dim = size >= 256 ? 0 : size; // 0 表示 256
    e.writeUInt8(dim, 0); // width
    e.writeUInt8(dim, 1); // height
    e.writeUInt8(0, 2); // color count
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bit count
    e.writeUInt32LE(buffer.length, 8); // bytes in resource
    e.writeUInt32LE(offset, 12); // offset
    entries.push(e);
    blobs.push(buffer);
    offset += buffer.length;
  }
  return Buffer.concat([header, ...entries, ...blobs]);
}

(async () => {
  fs.mkdirSync(path.join(__dirname, 'build'), { recursive: true });

  const pngs = [];
  let preview = null;
  for (const size of SIZES) {
    const buffer = await sharp(SRC)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    pngs.push({ size, buffer });
    if (size === 256) preview = buffer;
    console.log(`  ${size}x${size} -> ${buffer.length} bytes`);
  }

  fs.writeFileSync(OUT, buildIco(pngs));
  fs.writeFileSync(PREVIEW, preview);
  console.log('written', OUT, fs.statSync(OUT).size, 'bytes');
  console.log('written', PREVIEW);
})();
