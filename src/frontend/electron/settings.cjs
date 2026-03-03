const fs = require('node:fs/promises')
const path = require('node:path')

async function readJsonFile(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

async function writeJsonFile(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const data = JSON.stringify(value, null, 2)
  await fs.writeFile(filePath, data, 'utf8')
}

module.exports = {
  readJsonFile,
  writeJsonFile,
}
