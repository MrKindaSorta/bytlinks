import { useState } from 'react';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import { useBlocks } from '../../../hooks/useBlocks';
import type { BlockEditorProps } from './blockEditorRegistry';
import type { PollData, PollOption } from '@bytlinks/shared';

export function PollEditor({ block }: BlockEditorProps) {
  const { editBlock } = useBlocks();
  const data = block.data as PollData;
  const [question, setQuestion] = useState(data.question || '');
  const [options, setOptions] = useState<PollOption[]>(data.options || []);
  const [closed, setClosed] = useState(data.closed || false);
  const [confirmReset, setConfirmReset] = useState(false);

  function save(updates: Partial<PollData>) {
    editBlock(block.id, { data: { question, options, closed, ...updates } });
  }

  function updateOption(index: number, text: string) {
    const newOptions = options.map((o, i) => i === index ? { ...o, text } : o);
    setOptions(newOptions);
  }

  function addOption() {
    const newOptions = [...options, { id: crypto.randomUUID(), text: '', votes: 0 }];
    setOptions(newOptions);
    save({ options: newOptions });
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    save({ options: newOptions });
  }

  function moveOption(fromIndex: number, direction: 'up' | 'down') {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= options.length) return;
    const newOptions = [...options];
    [newOptions[fromIndex], newOptions[toIndex]] = [newOptions[toIndex], newOptions[fromIndex]];
    setOptions(newOptions);
    save({ options: newOptions });
  }

  function resetVotes() {
    const newOptions = options.map((o) => ({ ...o, votes: 0 }));
    setOptions(newOptions);
    save({ options: newOptions });
    setConfirmReset(false);
  }

  const totalVotes = options.reduce((sum, o) => sum + (o.votes || 0), 0);

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onBlur={() => save({ question })}
        placeholder="Ask a question..."
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
      />
      {options.map((option, i) => (
        <div key={option.id} className="flex items-center gap-2">
          {options.length > 1 && (
            <div className="flex flex-col gap-0">
              <button
                onClick={() => moveOption(i, 'up')}
                disabled={i === 0}
                className="text-[10px] text-brand-text-muted hover:text-brand-text disabled:opacity-30 transition-colors duration-150"
              >
                &uarr;
              </button>
              <button
                onClick={() => moveOption(i, 'down')}
                disabled={i === options.length - 1}
                className="text-[10px] text-brand-text-muted hover:text-brand-text disabled:opacity-30 transition-colors duration-150"
              >
                &darr;
              </button>
            </div>
          )}
          <input
            type="text"
            value={option.text}
            onChange={(e) => updateOption(i, e.target.value)}
            onBlur={() => save({ options })}
            placeholder={`Option ${i + 1}`}
            className="flex-1 px-3 py-1.5 rounded-md border border-brand-border bg-brand-bg font-body text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:border-brand-accent"
          />
          <span className="font-body text-xs text-brand-text-muted w-8 text-right tabular-nums">{option.votes}</span>
          {options.length > 2 && (
            <button onClick={() => removeOption(i)} className="p-1 text-brand-text-muted hover:text-red-500 transition-colors duration-150">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
      <div className="flex items-center justify-between">
        <button
          onClick={addOption}
          className="flex items-center gap-1 font-body text-xs font-medium text-brand-accent hover:text-brand-accent-hover transition-colors duration-150"
        >
          <Plus className="w-3.5 h-3.5" /> Add option
        </button>
        <label className="flex items-center gap-1.5 font-body text-xs text-brand-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={closed}
            onChange={(e) => { setClosed(e.target.checked); save({ closed: e.target.checked }); }}
            className="rounded border-brand-border accent-brand-accent"
          />
          Closed
        </label>
      </div>
      {totalVotes > 0 && (
        <div className="flex items-center justify-between pt-1 border-t border-brand-border">
          <span className="font-body text-xs text-brand-text-muted">
            {totalVotes} total vote{totalVotes !== 1 ? 's' : ''}
          </span>
          {confirmReset ? (
            <div className="flex items-center gap-2">
              <span className="font-body text-[11px] text-red-500">Reset all votes?</span>
              <button
                onClick={resetVotes}
                className="px-2 py-0.5 rounded font-body text-[11px] font-medium bg-red-500 text-white transition-opacity duration-150 hover:opacity-80"
              >
                Yes, reset
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="font-body text-[11px] text-brand-text-muted hover:text-brand-text transition-colors duration-150"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="flex items-center gap-1 font-body text-[11px] text-brand-text-muted hover:text-red-500 transition-colors duration-150"
            >
              <RotateCcw className="w-3 h-3" /> Reset votes
            </button>
          )}
        </div>
      )}
    </div>
  );
}
