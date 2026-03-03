import React, { useState, useCallback } from 'react'
import { ChevronRight, ChevronDown, Folder, FileText, Trash2 } from 'lucide-react'
import type { FolderEntry } from '@/types/global'

// ── Single tree node ──────────────────────────────────────────────────────

interface TreeNodeProps {
  entry: FolderEntry
  path: string
  depth: number
  activeNote: string | null
  onSelect: (name: string) => void
  onDelete: (name: string) => void
}

function TreeNode({ entry, path, depth, activeNote, onSelect, onDelete }: TreeNodeProps) {
  const [open, setOpen] = useState(true)
  const fullPath = path ? `${path}/${entry.name}` : entry.name
  const isActive = activeNote === fullPath

  if (entry.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => setOpen((v) => !v)}
          className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors
            hover:bg-surface-200/60 text-text-secondary hover:text-text-primary`}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          {open ? (
            <ChevronDown size={14} className="shrink-0 text-text-muted" />
          ) : (
            <ChevronRight size={14} className="shrink-0 text-text-muted" />
          )}
          <Folder size={14} className="shrink-0 text-neon-purple" />
          <span className="truncate">{entry.name}</span>
        </button>

        {open && entry.children && (
          <div>
            {entry.children.map((child) => (
              <TreeNode
                key={child.name}
                entry={child}
                path={fullPath}
                depth={depth + 1}
                activeNote={activeNote}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // File node
  return (
    <button
      onClick={() => onSelect(fullPath)}
      className={`group flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-all
        ${
          isActive
            ? 'bg-surface-200 text-neon-cyan shadow-glow'
            : 'text-text-secondary hover:bg-surface-200/60 hover:text-text-primary'
        }`}
      style={{ paddingLeft: `${depth * 14 + 8}px` }}
    >
      <FileText size={14} className={`shrink-0 ${isActive ? 'text-neon-cyan' : 'text-text-muted'}`} />
      <span className="truncate flex-1 text-left">{entry.name.replace(/\.md$/i, '')}</span>
      <Trash2
        size={13}
        className="shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-red-400 transition-opacity"
        onClick={(e) => {
          e.stopPropagation()
          onDelete(fullPath)
        }}
      />
    </button>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────

interface SidebarProps {
  tree: FolderEntry[]
  activeNote: string | null
  notesDir: string
  onSelect: (name: string) => void
  onNewNote: () => void
  onNewFolder: () => void
  onChooseFolder: () => void
  onDelete: (name: string) => void
}

export default function Sidebar({
  tree,
  activeNote,
  notesDir,
  onSelect,
  onNewNote,
  onNewFolder,
  onChooseFolder,
  onDelete,
}: SidebarProps) {
  return (
    <aside className="flex flex-col h-full w-[260px] min-w-[220px] border-r border-border bg-surface select-none">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <div className="font-semibold text-sm text-neon-cyan tracking-wide">SmartNotes</div>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 px-3 pb-2">
        <SidebarBtn label="New Note" onClick={onNewNote} />
        <SidebarBtn label="New Folder" onClick={onNewFolder} />
        <SidebarBtn label="Open" onClick={onChooseFolder} />
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto px-1.5 pb-3 scrollbar-thin">
        {tree.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-text-muted">
            No notes yet — create one to get started.
          </div>
        ) : (
          tree.map((entry) => (
            <TreeNode
              key={entry.name}
              entry={entry}
              path=""
              depth={0}
              activeNote={activeNote}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      {/* Footer — current dir */}
      <div
        className="border-t border-border px-3 py-2 text-[11px] text-text-muted truncate"
        title={notesDir}
      >
        {notesDir}
      </div>
    </aside>
  )
}

// ── Small helper button ────

function SidebarBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-md border border-border py-1 text-[11px] text-text-secondary
        transition-colors hover:border-neon-cyan/30 hover:text-neon-cyan hover:shadow-glow"
    >
      {label}
    </button>
  )
}
