
Sukudo Enhance Audio — Backend Patch (v1)
========================================

This patch contains ONLY the new/updated backend files required to make Enhance Audio work.

Files included:
- lib/ffmpeg.ts
- app/api/enhance/route.ts
- next.config.mjs

How to apply (Windows / PowerShell)
-----------------------------------
1) Unzip this patch into the ROOT of your project, letting it **create/overwrite** the paths above.
2) Install server deps:
   npm i ffmpeg-static archiver
   # if you hit peer-deps errors:
   # npm i ffmpeg-static archiver --legacy-peer-deps
   # optional types:
   # npm i -D @types/archiver
3) Run your app:
   npm run dev
4) Open http://localhost:3000/tools/enhance-audio
5) Add files → Adjust → **Process & Export** (downloads enhanced file or a ZIP for batch).

Notes
-----
- If you already have a custom next.config.mjs, merge this line into your config:
    experimental: { serverComponentsExternalPackages: ['archiver','ffmpeg-static'] }
- No UI files are changed by this patch. If your page's "Process & Export" button still shows an alert,
  wire it to POST /api/enhance as described in the chat (processAndExport()).

