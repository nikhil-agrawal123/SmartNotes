import React from 'react'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo2,
  Redo2,
  Heading1,
  Heading2,
  Heading3,
} from 'lucide-react'
import type { Editor } from '@tiptap/react'

interface ToolbarProps {
  editor: Editor | null
}

export default function Toolbar({ editor }: ToolbarProps) {
  if (!editor) return null

  const btn = (
    label: string,
    icon: React.ReactNode,
    action: () => void,
    isActive: boolean,
  ) => (
    <button
      key={label}
      onClick={action}
      title={label}
      className={`p-1.5 rounded-md transition-colors
        ${
          isActive
            ? 'bg-surface-300 text-neon-cyan shadow-glow'
            : 'text-text-muted hover:text-text-primary hover:bg-surface-200'
        }`}
    >
      {icon}
    </button>
  )

  const s = 15

  return (
    <div className="flex items-center gap-0.5 px-4 py-1.5 border-b border-border bg-surface-50/50 overflow-x-auto">
      {btn('Heading 1', <Heading1 size={s} />, () => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive('heading', { level: 1 }))}
      {btn('Heading 2', <Heading2 size={s} />, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }))}
      {btn('Heading 3', <Heading3 size={s} />, () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive('heading', { level: 3 }))}

      <Divider />

      {btn('Bold', <Bold size={s} />, () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
      {btn('Italic', <Italic size={s} />, () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}
      {btn('Strikethrough', <Strikethrough size={s} />, () => editor.chain().focus().toggleStrike().run(), editor.isActive('strike'))}
      {btn('Inline code', <Code size={s} />, () => editor.chain().focus().toggleCode().run(), editor.isActive('code'))}

      <Divider />

      {btn('Bullet list', <List size={s} />, () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'))}
      {btn('Ordered list', <ListOrdered size={s} />, () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'))}
      {btn('Blockquote', <Quote size={s} />, () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'))}
      {btn('Divider', <Minus size={s} />, () => editor.chain().focus().setHorizontalRule().run(), false)}

      <div className="flex-1" />

      {btn('Undo', <Undo2 size={s} />, () => editor.chain().focus().undo().run(), false)}
      {btn('Redo', <Redo2 size={s} />, () => editor.chain().focus().redo().run(), false)}
    </div>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-border mx-1" />
}
