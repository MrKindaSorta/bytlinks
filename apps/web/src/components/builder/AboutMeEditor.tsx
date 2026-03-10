import { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  Undo2,
  Redo2,
} from 'lucide-react';

interface AboutMeEditorProps {
  value: string;
  onChange: (html: string) => void;
  maxLength?: number;
}

/** Character count from HTML — strips tags and counts text only. */
function countChars(html: string): number {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || '').length;
}

export function AboutMeEditor({ value, onChange, maxLength = 1000 }: AboutMeEditorProps) {
  const charCount = countChars(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
        hardBreak: { keepMarks: true },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'prose-sm max-w-none font-body text-sm text-brand-text outline-none min-h-[120px] px-3 py-2.5',
      },
      handleKeyDown: (_view, event) => {
        // Enforce character limit
        if (maxLength && countChars(editor?.getHTML() ?? '') >= maxLength) {
          // Allow delete, backspace, select-all, undo, redo, arrows
          const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
          if (allowed.includes(event.key)) return false;
          if (event.metaKey || event.ctrlKey) return false;
          return true; // block
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      // Tiptap returns <p></p> for empty — normalize to empty string
      const normalized = html === '<p></p>' ? '' : html;
      onChangeRef.current(normalized);
    },
  });

  // Sync external value changes (e.g. on initial load)
  const initialSynced = useRef(false);
  useEffect(() => {
    if (!editor || initialSynced.current) return;
    initialSynced.current = true;
    if (value && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('URL', prev || 'https://');
    if (url === null) return; // cancelled
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-brand-border overflow-hidden bg-brand-surface
                    focus-within:ring-2 focus-within:ring-brand-accent focus-within:border-transparent
                    transition-colors duration-fast">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-brand-border bg-brand-surface-alt">
        <ToolbarBtn
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-brand-border mx-1" />

        <ToolbarBtn
          active={editor.isActive('link')}
          onClick={setLink}
          title="Link"
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <div className="w-px h-4 bg-brand-border mx-1" />

        <ToolbarBtn
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <List className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarBtn>

        <div className="flex-1" />

        <ToolbarBtn
          active={false}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={false}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} />

      {/* Character count */}
      <div className="px-3 py-1.5 border-t border-brand-border">
        <p className={`font-body text-xs ${charCount > maxLength ? 'text-rose-500' : 'text-brand-text-muted'}`}>
          {charCount.toLocaleString()}/{maxLength.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function ToolbarBtn({
  active,
  onClick,
  disabled,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors duration-fast
        ${active
          ? 'bg-brand-accent/15 text-brand-accent'
          : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-surface'
        }
        disabled:opacity-30 disabled:pointer-events-none`}
    >
      {children}
    </button>
  );
}
