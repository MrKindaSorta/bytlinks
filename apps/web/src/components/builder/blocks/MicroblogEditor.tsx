import { useState, useRef } from 'react';
import { Plus, Trash2, Pencil, Check, X, Image, Link2 } from 'lucide-react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { MicroblogData, MicroblogPost } from '@bytlinks/shared';

const CHAR_LIMIT = 500;

const POST_TYPES = [
  { key: 'update', label: 'Update' },
  { key: 'announcement', label: 'Announcement' },
  { key: 'milestone', label: 'Milestone' },
] as const;

export function MicroblogEditor({ block }: BlockEditorProps) {
  const { editBlock, uploadFile } = useBlocks();
  const data = block.data as MicroblogData;
  const [posts, setPosts] = useState<MicroblogPost[]>(data.posts || []);
  const [draft, setDraft] = useState('');
  const [draftType, setDraftType] = useState<MicroblogPost['post_type']>('update');
  const [draftImage, setDraftImage] = useState<{ file: File; preview: string } | null>(null);
  const [draftLinkUrl, setDraftLinkUrl] = useState('');
  const [draftLinkTitle, setDraftLinkTitle] = useState('');
  const [showLinkField, setShowLinkField] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function save(newPosts: MicroblogPost[]) {
    setPosts(newPosts);
    editBlock(block.id, { data: { posts: newPosts } });
  }

  async function addPost() {
    if (!draft.trim() || draft.length > CHAR_LIMIT) return;

    setUploading(true);
    try {
      let image_r2_key: string | undefined;
      if (draftImage) {
        const result = await uploadFile(draftImage.file);
        image_r2_key = result.r2_key;
      }

      const newPost: MicroblogPost = {
        id: crypto.randomUUID(),
        text: draft.trim(),
        created_at: Math.floor(Date.now() / 1000),
        post_type: draftType || 'update',
        ...(image_r2_key && { image_r2_key }),
        ...(draftLinkUrl.trim() && { link_url: draftLinkUrl.trim() }),
        ...(draftLinkUrl.trim() && draftLinkTitle.trim() && { link_title: draftLinkTitle.trim() }),
      };

      save([newPost, ...posts]);
      resetDraft();
    } catch {
      // upload failed silently
    } finally {
      setUploading(false);
    }
  }

  function resetDraft() {
    setDraft('');
    setDraftType('update');
    setDraftImage(null);
    setDraftLinkUrl('');
    setDraftLinkTitle('');
    setShowLinkField(false);
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
    if (!editText.trim() || editText.length > CHAR_LIMIT) return;
    save(posts.map((p) => p.id === editingId ? { ...p, text: editText.trim() } : p));
    setEditingId(null);
    setEditText('');
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    e.target.value = '';
    const preview = URL.createObjectURL(file);
    setDraftImage({ file, preview });
  }

  function charCountColor(len: number): string {
    if (len >= 480) return 'text-red-500';
    if (len >= 400) return 'text-amber-500';
    return 'text-brand-text-muted';
  }

  return (
    <div className="space-y-3">
      {/* Composer */}
      <div className="rounded-xl border border-brand-border bg-brand-bg p-3 space-y-2.5">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, CHAR_LIMIT))}
          placeholder="Share an update..."
          rows={3}
          className="w-full px-0 py-0 bg-transparent font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none resize-none"
        />

        {/* Image preview */}
        {draftImage && (
          <div className="relative inline-block">
            <img
              src={draftImage.preview}
              alt="Upload preview"
              className="h-20 w-auto rounded-lg object-cover"
            />
            <button
              onClick={() => { URL.revokeObjectURL(draftImage.preview); setDraftImage(null); }}
              className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-brand-surface border border-brand-border text-brand-text-muted hover:text-red-500 transition-colors duration-150"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Link fields */}
        {showLinkField && (
          <div className="space-y-1.5">
            <input
              type="url"
              value={draftLinkUrl}
              onChange={(e) => setDraftLinkUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-2.5 py-1.5 rounded-md border border-brand-border bg-brand-surface font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
            />
            {draftLinkUrl.trim() && (
              <input
                type="text"
                value={draftLinkTitle}
                onChange={(e) => setDraftLinkTitle(e.target.value)}
                placeholder="Link title (optional)"
                className="w-full px-2.5 py-1.5 rounded-md border border-brand-border bg-brand-surface font-body text-xs text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
              />
            )}
          </div>
        )}

        {/* Post type pills */}
        <div className="flex gap-1">
          {POST_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setDraftType(t.key)}
              className={`px-2 py-0.5 rounded-full font-body text-[11px] font-medium transition-colors duration-150
                ${draftType === t.key
                  ? 'bg-brand-accent text-white'
                  : 'bg-brand-surface-alt text-brand-text-secondary hover:text-brand-text'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-between pt-1 border-t border-brand-border/50">
          <div className="flex items-center gap-1">
            <button
              onClick={() => fileRef.current?.click()}
              className="p-1.5 rounded-md text-brand-text-muted hover:text-brand-accent hover:bg-brand-surface-alt transition-colors duration-150"
              title="Add image"
            >
              <Image className="w-3.5 h-3.5" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            <button
              onClick={() => setShowLinkField(!showLinkField)}
              className={`p-1.5 rounded-md transition-colors duration-150 ${
                showLinkField ? 'text-brand-accent bg-brand-surface-alt' : 'text-brand-text-muted hover:text-brand-accent hover:bg-brand-surface-alt'
              }`}
              title="Add a link"
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-body text-[11px] tabular-nums ${charCountColor(draft.length)}`}>
              {draft.length}/{CHAR_LIMIT}
            </span>
            <button
              onClick={addPost}
              disabled={!draft.trim() || uploading}
              className="flex items-center gap-1 px-3 py-1 rounded-lg font-body text-xs font-medium bg-brand-accent text-white disabled:opacity-40 transition-opacity duration-150"
            >
              {uploading ? (
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus className="w-3 h-3" />
              )}
              Post
            </button>
          </div>
        </div>
      </div>

      {/* Posts list */}
      {posts.map((post) => (
        <div key={post.id} className="rounded-lg border border-brand-border p-2.5">
          {editingId === post.id ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value.slice(0, CHAR_LIMIT))}
                rows={2}
                className="w-full px-3 py-1.5 rounded-md border border-brand-accent bg-brand-bg font-body text-xs text-brand-text focus:outline-none resize-none"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <span className={`font-body text-[10px] ${charCountColor(editText.length)}`}>
                  {editText.length}/{CHAR_LIMIT}
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
            <div>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  {post.post_type && post.post_type !== 'update' && (
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mb-1 ${
                      post.post_type === 'announcement'
                        ? 'bg-teal-500/10 text-teal-600'
                        : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      {post.post_type === 'announcement' ? 'Announcement' : 'Milestone'}
                    </span>
                  )}
                  <p className="font-body text-xs text-brand-text whitespace-pre-wrap">{post.text}</p>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <button onClick={() => startEdit(post)} className="p-0.5 text-brand-text-muted hover:text-brand-accent transition-colors duration-150">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={() => removePost(post.id)} className="p-0.5 text-brand-text-muted hover:text-red-500 transition-colors duration-150">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {post.image_r2_key && (
                <img src={`/api/public/file/${post.image_r2_key}`} alt="" className="mt-1.5 h-14 w-auto rounded-md object-cover" />
              )}
              {post.link_url && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-brand-text-muted">
                  <Link2 className="w-2.5 h-2.5" />
                  <span className="truncate">{post.link_title || post.link_url}</span>
                </div>
              )}
              <p className="font-body text-[10px] text-brand-text-muted mt-1">
                {new Date(post.created_at * 1000).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      ))}

      {posts.length === 0 && (
        <p className="font-body text-xs text-brand-text-muted text-center py-4">
          No updates yet. Share your first one above.
        </p>
      )}
    </div>
  );
}
