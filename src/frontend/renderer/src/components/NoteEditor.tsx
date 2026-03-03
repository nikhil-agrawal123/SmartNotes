import React from 'react'
import { EditorContent, type Editor } from '@tiptap/react'

interface NoteEditorProps {
  editor: Editor | null
  activeNote: string | null
  status: string
}

export default function NoteEditor({ editor, activeNote, status }: NoteEditorProps) {
  if (!activeNote) {
    return (
      <div className="flex flex-1 items-center justify-center text-text-muted text-sm select-none">
        <div className="text-center space-y-2">
          <div className="text-3xl">📝</div>
          <div>Select or create a note to start writing</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-w-0">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border">
        <span className="flex-1 truncate text-sm text-text-secondary font-mono">
          {activeNote.replace(/\.md$/i, '')}
        </span>
        {status && (
          <span className="text-[11px] text-neon-green animate-pulse">{status}</span>
        )}
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto px-8 py-5">
        <div className="max-w-[780px] mx-auto">
          {editor && <EditorContent editor={editor} />}
        </div>
      </div>
    </div>
  )
}
