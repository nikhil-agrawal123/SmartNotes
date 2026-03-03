/** Type definitions for the SmartNotes preload API exposed via contextBridge */

export interface NoteEntry {
  name: string
  mtimeMs: number
}

export interface FolderEntry {
  name: string
  type: 'folder' | 'file'
  children?: FolderEntry[]
  mtimeMs?: number
}

export interface SmartNotesAPI {
  getNotesDir: () => Promise<{ notesDir: string }>
  selectNotesDir: () => Promise<{ notesDir: string; canceled?: boolean }>
  listNotes: () => Promise<NoteEntry[]>
  getFileTree: () => Promise<FolderEntry[]>
  readNote: (name: string) => Promise<{ name: string; content: string }>
  writeNote: (name: string, content: string) => Promise<{ ok: boolean }>
  createNote: (folder?: string) => Promise<{ name: string }>
  createFolder: (name: string) => Promise<{ ok: boolean }>
  deleteNote: (name: string) => Promise<{ ok: boolean }>
  onNotesChanged: (callback: () => void) => () => void
}

declare global {
  interface Window {
    smartNotes: SmartNotesAPI
  }
}
