interface CardDotsProps {
  count: number;
  active: number;
  onDotClick?: (index: number) => void;
}

export function CardDots({ count, active, onDotClick }: CardDotsProps) {
  if (count <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          onClick={() => onDotClick?.(i)}
          className="rounded-full transition-all duration-200"
          style={{
            width: i === active ? 24 : 8,
            height: 8,
            background: 'var(--page-text)',
            opacity: i === active ? 0.8 : 0.25,
          }}
          aria-label={`Go to card ${i + 1}`}
        />
      ))}
    </div>
  );
}
