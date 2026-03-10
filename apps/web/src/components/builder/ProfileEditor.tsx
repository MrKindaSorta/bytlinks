import { useState, useRef } from 'react';
import { Camera, ChevronDown } from 'lucide-react';
import { usePage } from '../../hooks/usePage';
import { useUpload } from '../../hooks/useUpload';
import { useDebounce } from '../../hooks/useDebounce';
import { AboutMeEditor } from './AboutMeEditor';
import { ImageCropEditor, CROP_SQUARE } from '../shared/ImageCropEditor';

export function ProfileEditor() {
  const { page, updatePage } = usePage();
  const { uploadAvatar, uploading } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);

  const [displayName, setDisplayName] = useState(page?.display_name ?? '');
  const [bio, setBio] = useState(page?.bio ?? '');
  const [aboutMe, setAboutMe] = useState(page?.about_me ?? '');
  const [aboutExpanded, setAboutExpanded] = useState(page?.about_me_expanded ?? false);
  const [aboutOpen, setAboutOpen] = useState(!!page?.about_me);

  const debouncedSave = useDebounce(async (field: string, value: string) => {
    try {
      await updatePage({ [field]: value });
    } catch {
      // toast error in future
    }
  }, 600);

  function handleNameChange(value: string) {
    setDisplayName(value);
    debouncedSave('display_name', value);
  }

  function handleBioChange(value: string) {
    setBio(value);
    debouncedSave('bio', value);
  }

  function handleAboutMeChange(value: string) {
    setAboutMe(value);
    debouncedSave('about_me', value);
  }

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setCropFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  }

  async function handleCropConfirm(croppedFile: File) {
    setCropFile(null);
    try {
      await uploadAvatar(croppedFile);
      window.location.reload();
    } catch {
      // toast error in future
    }
  }

  const avatarUrl = page?.avatar_r2_key
    ? `/api/public/avatar/${page.avatar_r2_key}`
    : null;

  return (
    <div className="space-y-6">
      {/* Avatar + Name/Bio — side-by-side on lg+ */}
      <div className="lg:flex lg:gap-5 lg:items-start">
        {/* Avatar */}
        <div className="flex items-center gap-4 lg:block lg:shrink-0 mb-6 lg:mb-0">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="relative w-20 h-20 rounded-full bg-brand-surface-alt border border-brand-border
                       overflow-hidden group transition-opacity duration-fast
                       hover:opacity-90 disabled:opacity-50"
            aria-label="Upload avatar"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Camera className="w-6 h-6 text-brand-text-muted" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center
                            opacity-0 group-hover:opacity-100 transition-opacity duration-fast">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarSelect}
            className="hidden"
          />
          <div className="lg:hidden">
            <p className="font-body text-sm font-medium text-brand-text">Profile photo</p>
            <p className="font-body text-xs text-brand-text-muted">JPG, PNG, or WebP. Max 5MB.</p>
          </div>
        </div>

        {/* Name + Bio fields */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Display Name */}
          <div>
            <label htmlFor="display-name" className="block font-body text-sm font-medium text-brand-text mb-1.5">
              Display name
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full font-body text-sm px-3 py-2.5 rounded-lg border border-brand-border
                         bg-brand-surface text-brand-text placeholder:text-brand-text-muted
                         transition-colors duration-fast
                         focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
              placeholder="Your name"
            />
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block font-body text-sm font-medium text-brand-text mb-1.5">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => handleBioChange(e.target.value)}
              rows={3}
              maxLength={300}
              className="w-full font-body text-sm px-3 py-2.5 rounded-lg border border-brand-border
                         bg-brand-surface text-brand-text placeholder:text-brand-text-muted
                         transition-colors duration-fast resize-none
                         focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
              placeholder="A short bio about yourself"
            />
            <p className="font-body text-xs text-brand-text-muted mt-1">
              {bio.length}/300
            </p>
          </div>
        </div>
      </div>

      {/* About Me — collapsible section */}
      <div className="rounded-lg border border-brand-border overflow-hidden">
        <button
          type="button"
          onClick={() => setAboutOpen(!aboutOpen)}
          className="w-full flex items-center justify-between px-3 py-2.5
                     bg-brand-surface-alt hover:bg-brand-surface-alt/80
                     transition-colors duration-fast"
        >
          <span className="font-body text-sm font-medium text-brand-text">
            About Me
            <span className="font-normal text-brand-text-muted ml-1.5">— optional</span>
          </span>
          <ChevronDown
            className={`w-4 h-4 text-brand-text-muted transition-transform duration-200 ${
              aboutOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        <div
          className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
          style={{ maxHeight: aboutOpen ? '500px' : '0px' }}
        >
          <div className="px-3 py-3 border-t border-brand-border space-y-3">
            <p className="font-body text-xs text-brand-text-muted">
              A longer section about you. Visitors can expand it on your page.
            </p>

            <AboutMeEditor
              value={aboutMe}
              onChange={handleAboutMeChange}
              maxLength={1000}
            />

            {/* Expanded on load toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <button
                type="button"
                role="switch"
                aria-checked={aboutExpanded}
                onClick={() => {
                  const next = !aboutExpanded;
                  setAboutExpanded(next);
                  updatePage({ about_me_expanded: next });
                }}
                className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${
                  aboutExpanded ? 'bg-brand-accent' : 'bg-brand-border'
                }`}
              >
                <span
                  className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white
                             transition-transform duration-200 ${aboutExpanded ? 'translate-x-[14px]' : ''}`}
                />
              </button>
              <span className="font-body text-xs text-brand-text-secondary">
                Expanded on page load
              </span>
            </label>
          </div>
        </div>
      </div>
      {cropFile && (
        <ImageCropEditor
          file={cropFile}
          presets={CROP_SQUARE}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropFile(null)}
        />
      )}
    </div>
  );
}
