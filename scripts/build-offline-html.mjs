import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const out = join(root, 'offline-html')

mkdirSync(out, { recursive: true })

const css = readFileSync(join(dist, 'app.css'), 'utf8')
const js = readFileSync(join(dist, 'app.js'), 'utf8')

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
copyFileSync(join(dist, 'app.js'), join(out, 'app.js'))
copyFileSync(join(dist, 'app.css'), join(out, 'app.css'))

console.log('OK:', join(out, 'neuro-sema.html'))
