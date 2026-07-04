import { readFileSync, writeFileSync, copyFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const out = join(root, 'offline-html')

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

mkdirSync(out, { recursive: true })

function inlineAssetUrls(js, assetsDir) {
  let result = js

  for (const fileName of readdirSync(assetsDir)) {
    const mime = MIME_BY_EXT[extname(fileName).toLowerCase()]
    if (!mime) {
      continue
    }

    const dataUrl = `data:${mime};base64,${readFileSync(join(assetsDir, fileName)).toString('base64')}`
    const pattern = new RegExp(
      `""\\+new URL\\("${fileName.replace('.', '\\.')}",[\\s\\S]*?\\)\\.href`,
      'g',
    )
    result = result.replace(pattern, JSON.stringify(dataUrl))
  }

  return result
}

const css = readFileSync(join(dist, 'app.css'), 'utf8')
const js = inlineAssetUrls(readFileSync(join(dist, 'app.js'), 'utf8'), dist)

const indexHtml = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Нейро-Сёма</title>
  <link rel="stylesheet" href="./app.css" />
</head>
<body>
  <div id="root"></div>
  <script src="./app.js"></script>
</body>
</html>
`

const standaloneHtml = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Нейро-Сёма</title>
  <style>
${css}
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
${js}
  </script>
</body>
</html>
`

writeFileSync(join(out, 'index.html'), indexHtml, 'utf8')
writeFileSync(join(out, 'neuro-sema.html'), standaloneHtml, 'utf8')
writeFileSync(join(out, 'app.js'), js, 'utf8')
copyFileSync(join(dist, 'app.css'), join(out, 'app.css'))

console.log('OK:', join(out, 'neuro-sema.html'))
