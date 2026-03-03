import React, { useEffect, useCallback, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import NoteEditor from '@/components/NoteEditor'
import Toolbar from '@/components/Toolbar'
import { useNotes } from '@/hooks/useNotes'
import { useMarkdownEditor } from '@/hooks/useMarkdownEditor'

export default function App() {
  const notes = useNotes()
  const [saveStatus, setSaveStatus] = useState('')
  const {activeNote, writeNoteContent} = notes

  const handleSave = useCallback(
    async (md: string) => {
      if (!activeNote) return
      try {
        await writeNoteContent(activeNote, md)
        setSaveStatus('Saved')
        setTimeout(() => setSaveStatus(''), 800)
      } catch (err) {
        setSaveStatus('Save failed')
      }
    },
    [activeNote, writeNoteContent],
  )

  const { editor, setContent } = useMarkdownEditor({ onSave: handleSave })

  // Load active note content into editor
  useEffect(() => {
    if (!notes.activeNote) {
      setContent('')
      return
    }
    notes.readNoteContent(notes.activeNote).then(setContent).catch(() => setSaveStatus('Load failed'))
    // Re-run only when the selected note changes; omitting notes.readNoteContent
    // and setContent avoids spurious reloads since those references change on every render.
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
