import { useRef, useCallback, useEffect, use } from 'react'
import { useEditor as useTipTapEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'


interface UseEditorOptions {
  onSave: (markdown: string) => void
}

export function useMarkdownEditor({ onSave }: UseEditorOptions) {
  const ignoreRef = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  const editor = useTipTapEditor({
    extensions: [
      StarterKit,
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none focus:outline-none min-h-[calc(100vh-7rem)] px-1 py-2 text-text-primary',
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (ignoreRef.current) return
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        const md = (ed as Editor & { storage: { markdown: { getMarkdown: () => string } } }).storage
          .markdown.getMarkdown()
        onSave(md)
      }, 400)
    },
  })

  const setContent = useCallback(
    (md: string) => {
      if (!editor) return
      ignoreRef.current = true
      editor.commands.setContent(md)
      requestAnimationFrame(() => {
        ignoreRef.current = false
      })
    },
    [editor],
  )

  return { editor, setContent }
}
