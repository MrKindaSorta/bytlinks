interface CardDotsProps {
  count: number;
  active: number;
  onDotClick?: (index: number) => void;
}

export function CardDots({ count, active, onDotClick }: CardDotsProps) {
  if (count <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-4" role="tablist" aria-label="Card navigation">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          role="tab"
          aria-selected={i === active}
          tabIndex={i === active ? 0 : -1}
          onClick={() => onDotClick?.(i)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') onDotClick?.(Math.min(count - 1, i + 1));
            if (e.key === 'ArrowLeft') onDotClick?.(Math.max(0, i - 1));
          }}
          className="rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
          style={{
            width: i === active ? 24 : 8,
            height: 8,
            background: 'var(--page-text)',
            opacity: i === active ? 0.8 : 0.25,
          }}
          aria-label={`Card ${i + 1} of ${count}`}
        />
      ))}
    </div>
  );
}
