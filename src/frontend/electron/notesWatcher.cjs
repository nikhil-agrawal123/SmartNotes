const chokidar = require('chokidar')

function createNotesWatcher(notesDir, onChange) {
  let debounceTimer = null

  const watcher = chokidar.watch('**/*.md', {
    cwd: notesDir,
    ignoreInitial: true,
    ignored: /(^|[/\\])\../, // ignore dotfiles
    awaitWriteFinish: {
      stabilityThreshold: 250,
      pollInterval: 50,
    },
  })

  const emit = () => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => onChange(), 150)
  }

  watcher.on('add', emit)
  watcher.on('change', emit)
  watcher.on('unlink', emit)
  watcher.on('error', (err) => {
    console.error('Watcher error:', err)
  })

  return {
    close: async () => {
      clearTimeout(debounceTimer)
      await watcher.close()
    },
  }
}

module.exports = {
  createNotesWatcher,
}
