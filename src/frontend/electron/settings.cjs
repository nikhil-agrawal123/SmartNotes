const fs = require('node:fs/promises')
const path = require('node:path')

async function readJsonFile(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    return JSON.parse(raw)
  } catch {
    if (error.code === 'ENOENT') {
        console.warn(`Settings file not found at ${filePath}, using fallback.`)
  }
    return fallback
  }
}

async function writeJsonFile(filePath, value) {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    const data = JSON.stringify(value, null, 2)
    try {
        await fs.writeFile(filePath, data, 'utf8')
    } catch (err) {
        throw err
  }
}

module.exports = {
  readJsonFile,
  writeJsonFile,
}
