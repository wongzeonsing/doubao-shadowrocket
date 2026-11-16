/**
 * 豆包去水印 · Shadowrocket http-response 脚本
 *
 * 原理：豆包后端同时返回 image_ori（带水印下载图）与 image_ori_raw（无水印原图），
 * 前端展示时叠加水印。本脚本把响应里的 image_ori / image_thumb 指向 raw 版本，
 * 让「下载」拿到的是干净原图。
 *
 * 参考实现：Qalxry/doubao-no-watermark、minoriko/doubao-free
 *
 * 安全策略：
 *  - 只处理 JSON 响应；解析失败原样放行
 *  - 只在同一对象里同时存在 image_ori_raw 时才改写，缺字段不动
 *  - 不碰流式 SSE（/chat/completion），避免打断生成
 *  - 任何异常都返回原 body
 */

var RAW_KEYS = ['image_ori_raw', 'image_thumb_ori', 'image_raw'];
var TARGET_KEYS = ['image_ori', 'image_thumb', 'downloadImage', 'download_img'];

function pickUrl(v) {
  if (!v) return null;
  if (typeof v === 'string') return /^https?:\/\//.test(v) ? v : null;
  if (typeof v === 'object' && typeof v.url === 'string' && /^https?:\/\//.test(v.url)) return v.url;
  return null;
}

// 只认明确不带 watermark 字样的地址
function isClean(url) {
  return !!url && !/watermark/i.test(url);
}

function walk(node, stats) {
  if (!node || typeof node !== 'object') return node;
  if (Array.isArray(node)) {
    for (var i = 0; i < node.length; i++) walk(node[i], stats);
    return node;
  }

  var rawUrl = null;
  for (var r = 0; r < RAW_KEYS.length && !rawUrl; r++) {
    var cand = pickUrl(node[RAW_KEYS[r]]);
    if (isClean(cand)) rawUrl = cand;
  }

  if (rawUrl) {
    for (var t = 0; t < TARGET_KEYS.length; t++) {
      var key = TARGET_KEYS[t];
      if (!node[key]) continue;
      var oldUrl = pickUrl(node[key]);
      if (oldUrl === rawUrl) continue;
      if (typeof node[key] === 'string') {
        node[key] = rawUrl;
      } else if (typeof node[key] === 'object') {
        node[key].url = rawUrl;
      }
      stats.rewritten++;
    }
  }

  for (var k in node) {
    if (!Object.prototype.hasOwnProperty.call(node, k)) continue;
    if (RAW_KEYS.indexOf(k) !== -1 || TARGET_KEYS.indexOf(k) !== -1) continue;
    if (node[k] && typeof node[k] === 'object') walk(node[k], stats);
  }
  return node;
}

function main() {
  var stats = { rewritten: 0 };
  try {
    var body = typeof $response !== 'undefined' && $response.body ? $response.body : null;
    if (!body) return $done({});
    // 流式响应（SSE）直接放行，改写会打断生成
    if (/^\s*(data:|event:)/.test(body)) return $done({});

    var json = JSON.parse(body);
    walk(json, stats);
    if (!stats.rewritten) return $done({});
    console.log('[doubao-nomark] rewritten=' + stats.rewritten);
    return $done({ body: JSON.stringify(json) });
  } catch (e) {
    console.log('[doubao-nomark] skip: ' + e);
    return $done({});
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { walk: walk, pickUrl: pickUrl, isClean: isClean };
} else {
  main();
}
