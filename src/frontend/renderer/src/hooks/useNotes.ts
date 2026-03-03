import { useState, useEffect, useCallback, useRef } from 'react'
import type { FolderEntry } from '@/types/global'

const api = window.smartNotes

export interface UseNotesReturn {
  notesDir: string
  tree: FolderEntry[]
  activeNote: string | null
  status: string
  selectNote: (name: string) => void
  createNote: (folder?: string) => Promise<void>
  createFolder: (name: string) => Promise<void>
  deleteNote: (name: string) => Promise<void>
  chooseFolder: () => Promise<void>
  readNoteContent: (name: string) => Promise<string>
  writeNoteContent: (name: string, content: string) => Promise<void>
}

export function useNotes(): UseNotesReturn {
  const [notesDir, setNotesDir] = useState('')
  const [tree, setTree] = useState<FolderEntry[]>([])
  const [activeNote, setActiveNote] = useState<string | null>(null)
  const [status, setStatus] = useState('')

  const activeRef = useRef(activeNote)
  activeRef.current = activeNote

  const flash = useCallback((msg: string, ms = 1200) => {
    setStatus(msg)
    setTimeout(() => setStatus(''), ms)
  }, [])

  const refreshTree = useCallback(async () => {
    try {
      const data = await api.getFileTree()
      setTree(data)
    } catch {
      flash('Failed to load file tree')
    }
  }, [flash])

  const selectNote = useCallback((name: string) => {
    setActiveNote(name)
  }, [])

  const createNote = useCallback(
    async (folder?: string) => {
      try {
        const note = await api.createNote(folder)
        await refreshTree()
        setActiveNote(note.name)
        flash('Note created')
      } catch {
        flash('Failed to create note')
      }
    },
    [refreshTree, flash],
  )

  const createFolder = useCallback(
    async (name: string) => {
      try {
        await api.createFolder(name)
        await refreshTree()
        flash('Folder created')
      } catch {
        flash('Failed to create folder')
      }
    },
    [refreshTree, flash],
  )

  const deleteNote = useCallback(
    async (name: string) => {
      try {
        await api.deleteNote(name)
        if (activeRef.current === name) setActiveNote(null)
        await refreshTree()
        flash('Note deleted')
      } catch {
        flash('Failed to delete')
      }
    },
    [refreshTree, flash],
  )

  const chooseFolder = useCallback(async () => {
    try {
      const result = await api.selectNotesDir()
      if (result?.notesDir) {
        setNotesDir(result.notesDir)
        setActiveNote(null)
        await refreshTree()
      }
    } catch {
      flash('Failed to select folder')
    }
  }, [refreshTree, flash])

  const readNoteContent = useCallback(async (name: string) => {
    const { content } = await api.readNote(name)
    return content
  }, [])

  const writeNoteContent = useCallback(async (name: string, content: string) => {
    await api.writeNote(name, content)
  }, [])

  // Boot
  useEffect(() => {
    let unsub: (() => void) | null = null

    const boot = async () => {
      const dir = await api.getNotesDir()
      setNotesDir(dir.notesDir)
      await refreshTree()
      unsub = api.onNotesChanged(() => refreshTree())
    }

    boot().catch(() => flash('Init failed'))
    return () => { unsub?.() }
  }, [refreshTree, flash])

  return {
    notesDir,
    tree,
    activeNote,
    status,
    selectNote,
    createNote,
    createFolder,
    deleteNote,
    chooseFolder,
    readNoteContent,
    writeNoteContent,
  }
}
