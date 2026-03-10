import { useState } from 'react';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { MicroblogData, MicroblogPost } from '@bytlinks/shared';

export function MicroblogEditor({ block }: BlockEditorProps) {
  const { editBlock } = useBlocks();
  const data = block.data as MicroblogData;
  const [posts, setPosts] = useState<MicroblogPost[]>(data.posts || []);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  function save(newPosts: MicroblogPost[]) {
    setPosts(newPosts);
    editBlock(block.id, { data: { posts: newPosts } });
  }

  function addPost() {
    if (!draft.trim() || draft.length > 280) return;
    save([{ id: crypto.randomUUID(), text: draft.trim(), created_at: Math.floor(Date.now() / 1000) }, ...posts]);
    setDraft('');
  }

  function removePost(id: string) {
    save(posts.filter((p) => p.id !== id));
  }

  function startEdit(post: MicroblogPost) {
    setEditingId(post.id);
    setEditText(post.text);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText('');
  }

  function saveEdit() {
    if (!editText.trim() || editText.length > 280) return;
    save(posts.map((p) => p.id === editingId ? { ...p, text: editText.trim() } : p));
    setEditingId(null);
    setEditText('');
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 280))}
          placeholder="What's on your mind? (280 chars)"
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent resize-none"
        />
        <div className="flex items-center justify-between mt-1">
          <span className={`font-body text-xs ${draft.length > 260 ? 'text-red-500' : 'text-brand-text-muted'}`}>
            {draft.length}/280
          </span>
          <button
            onClick={addPost}
            disabled={!draft.trim()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md font-body text-xs font-medium bg-brand-accent text-white disabled:opacity-40 transition-opacity duration-150"
          >
            <Plus className="w-3 h-3" /> Post
          </button>
        </div>
      </div>
      {posts.map((post) => (
        <div key={post.id} className="rounded-lg border border-brand-border p-2.5">
          {editingId === post.id ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value.slice(0, 280))}
                rows={2}
                className="w-full px-3 py-1.5 rounded-md border border-brand-accent bg-brand-bg font-body text-xs text-brand-text focus:outline-none resize-none"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <span className={`font-body text-[10px] ${editText.length > 260 ? 'text-red-500' : 'text-brand-text-muted'}`}>
                  {editText.length}/280
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={cancelEdit}
                    className="p-1 rounded text-brand-text-muted hover:text-brand-text transition-colors duration-150"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={!editText.trim()}
                    className="p-1 rounded text-brand-accent hover:text-brand-accent-hover disabled:opacity-40 transition-colors duration-150"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <p className="font-body text-xs text-brand-text flex-1 whitespace-pre-wrap">{post.text}</p>
              <div className="flex gap-0.5 shrink-0">
                <button onClick={() => startEdit(post)} className="p-0.5 text-brand-text-muted hover:text-brand-accent transition-colors duration-150">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => removePost(post.id)} className="p-0.5 text-brand-text-muted hover:text-red-500 transition-colors duration-150">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
