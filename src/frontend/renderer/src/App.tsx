import React, { useEffect, useCallback, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import NoteEditor from '@/components/NoteEditor'
import Toolbar from '@/components/Toolbar'
import { useNotes } from '@/hooks/useNotes'
import { useMarkdownEditor } from '@/hooks/useMarkdownEditor'

export default function App() {
  const notes = useNotes()
  const [saveStatus, setSaveStatus] = useState('')

  const handleSave = useCallback(
    async (md: string) => {
      if (!notes.activeNote) return
      try {
        await notes.writeNoteContent(notes.activeNote, md)
        setSaveStatus('Saved')
        setTimeout(() => setSaveStatus(''), 800)
      } catch {
        setSaveStatus('Save failed')
      }
    },
    [notes],
  )

  const { editor, setContent } = useMarkdownEditor({ onSave: handleSave })

  // Load active note content into editor
  useEffect(() => {
    if (!notes.activeNote) {
      setContent('')
      return
    }
    notes.readNoteContent(notes.activeNote).then(setContent).catch(() => setSaveStatus('Load failed'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes.activeNote])

  // New folder prompt
  const handleNewFolder = useCallback(async () => {
    const name = window.prompt('Folder name:')
    if (name?.trim()) {
      await notes.createFolder(name.trim())
    }
  }, [notes])

  return (
    <div className="flex h-screen bg-surface text-text-primary font-sans">
      {/* Sidebar */}
      <Sidebar
        tree={notes.tree}
        activeNote={notes.activeNote}
        notesDir={notes.notesDir}
        onSelect={notes.selectNote}
        onNewNote={() => notes.createNote()}
        onNewFolder={handleNewFolder}
        onChooseFolder={notes.chooseFolder}
        onDelete={notes.deleteNote}
      />

      {/* Main pane */}
      <div className="flex flex-col flex-1 min-w-0">
        <Toolbar editor={editor} />
        <NoteEditor
          editor={editor}
          activeNote={notes.activeNote}
          status={saveStatus || notes.status}
        />
      </div>
    </div>
  )
}
