# 豆包去水印 · Shadowrocket 模块（实验）

把豆包网页版接口返回的 `image_ori`（带水印下载图）替换为 `image_ori_raw`（无水印原图）。

## 用法

在 Shadowrocket 模块里添加：

```
https://raw.githubusercontent.com/wongzeonsing/doubao-shadowrocket/main/doubao-nowatermark.sgmodule
```

## 限制

- **仅网页版** `www.doubao.com` 生效，豆包 App 内流量不走这里
- 视频去水印**不保证**：官方 `get_without_watermark` 对多数账号返回 false
- 未在真机验证，异常请关闭模块

## 原理

豆包后端本来就返回了无水印原图（`image_ori_raw`），水印只是前端 CSS 叠加。本脚本改写响应里的 `image_ori` / `image_thumb` 指向 raw 版本。

参考：Qalxry/doubao-no-watermark、minoriko/doubao-free
