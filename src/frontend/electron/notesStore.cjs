const fs = require('node:fs/promises')
const path = require('node:path')

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
}

/**
 * Safely resolve a relative path inside baseDir.
 * Allows subdirectory paths like "subfolder/note.md".
 */
function safeJoin(baseDir, relPath) {
  const normalized = relPath.replace(/\\/g, '/')
  const resolved = path.resolve(baseDir, normalized)
  const resolvedBase = path.resolve(baseDir)

  if (!resolved.startsWith(resolvedBase + path.sep) && resolved !== resolvedBase) {
    throw new Error('Invalid path — escapes notes directory')
  }

  return resolved
}

// ── Flat list (legacy, still used for quick listing) ──────────────────────

async function listMarkdownFiles(notesDir) {
  await ensureDir(notesDir)
  const entries = await fs.readdir(notesDir, { withFileTypes: true })

  const notes = []
  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (!entry.name.toLowerCase().endsWith('.md')) continue

    const fullPath = path.join(notesDir, entry.name)
    const stat = await fs.stat(fullPath)
    notes.push({
      name: entry.name,
      mtimeMs: stat.mtimeMs,
    })
  }

  notes.sort((a, b) => b.mtimeMs - a.mtimeMs)
  return notes
}

// ── Recursive file tree ───────────────────────────────────────────────────

async function getFileTree(dirPath) {
  await ensureDir(dirPath)
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const tree = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue // skip hidden

    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      const children = await getFileTree(fullPath)
      tree.push({ name: entry.name, type: 'folder', children })
    } else if (entry.name.toLowerCase().endsWith('.md')) {
      const stat = await fs.stat(fullPath)
      tree.push({ name: entry.name, type: 'file', mtimeMs: stat.mtimeMs })
    }
  }

  // Folders first (alphabetical), then files (most recent first)
  tree.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    if (a.type === 'folder') return a.name.localeCompare(b.name)
    return (b.mtimeMs || 0) - (a.mtimeMs || 0)
  })

  return tree
}

// ── Read / write / create ─────────────────────────────────────────────────

async function readMarkdownFile(notesDir, name) {
  const fullPath = safeJoin(notesDir, name)
  return fs.readFile(fullPath, 'utf8')
}

async function writeFileAtomic(targetPath, content) {
  const dir = path.dirname(targetPath)
  await ensureDir(dir)
  const tmp = path.join(dir, `.${path.basename(targetPath)}.${Date.now()}.tmp`)
  await fs.writeFile(tmp, content, 'utf8')
  await fs.rename(tmp, targetPath)
}

async function writeMarkdownFile(notesDir, name, content) {
  const fullPath = safeJoin(notesDir, name)
  await writeFileAtomic(fullPath, content)
  return { name }
}

function makeNewNoteName(folder) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const base = `Untitled-${ts}.md`
  return folder ? `${folder}/${base}` : base
}

async function createNote(notesDir, folder) {
  const name = makeNewNoteName(folder)
  await writeMarkdownFile(notesDir, name, '# Untitled\n')
  return { name }
}

async function createFolder(notesDir, folderName) {
  const fullPath = safeJoin(notesDir, folderName)
  await ensureDir(fullPath)
  return { ok: true }
}

async function deleteNote(notesDir, name) {
  const fullPath = safeJoin(notesDir, name)
  await fs.unlink(fullPath)
  return { ok: true }
}

module.exports = {
  ensureDir,
  listMarkdownFiles,
  getFileTree,
  readMarkdownFile,
  writeMarkdownFile,
  createNote,
  createFolder,
  deleteNote,
}
