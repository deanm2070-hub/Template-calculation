#!/usr/bin/env python3
"""Build the single-file app.

  python3 build.py            -> index.html (GitHub Pages / standalone, installable to home screen)
  python3 build.py artifact   -> dist/artifact.html (body-only page for the Claude artifact viewer)
"""
import base64, os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
rd = lambda p, mode='r': open(os.path.join(ROOT, p), mode).read()

def build(target):
    s = rd('src/app.html')
    s = s.replace("const ents=await entGet(d.id);\n  const box=$('#cadbox');",
                  "let ents=await entGet(d.id);\n  if(!ents&&p.sample){ents=parseDXF(new TextEncoder().encode(sampleDXF()).buffer);entPut(d.id,ents)}\n  const box=$('#cadbox');")
    s = s.replace('__LOGO__', base64.b64encode(rd('assets/logo.webp', 'rb')).decode())
    glue = rd('vendor/libredwg-web/libredwg-web.js')
    assert 'export default createModule;' in glue
    glue = glue.replace('import.meta.url', 'document.baseURI').replace('export default createModule;', 'window.createModule=createModule;')
    umd = rd('vendor/libredwg-web/libredwg-web.umd.cjs')
    wasm = base64.b64encode(rd('vendor/libredwg-web/libredwg-web.wasm.gz', 'rb')).decode()
    s += ('\n<!-- LibreDWG (GPL-3.0) via @mlightcad/libredwg-web 0.7.17 -->\n<script>' + glue + '</script>\n<script>' + umd +
          '</script>\n<script type="application/octet-stream" id="lwasm">' + wasm + '</script>\n')
    if target == 'artifact':
        out = os.path.join(ROOT, 'dist/artifact.html')
        os.makedirs(os.path.dirname(out), exist_ok=True)
    else:
        head = ('<!doctype html>\n<html lang="zh-Hant">\n<head>\n<meta charset="utf-8">\n'
                '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
                '<link rel="manifest" href="manifest.webmanifest">\n'
                '<link rel="apple-touch-icon" href="assets/icon-180.png">\n'
                '<link rel="icon" href="assets/icon-192.png">\n'
                '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}</style>\n')
        s = head + s + '</html>\n'
        out = os.path.join(ROOT, 'index.html')
    open(out, 'w').write(s)
    print(out, len(s))

build(sys.argv[1] if len(sys.argv) > 1 else 'pages')
