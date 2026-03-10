/**
 * Brand-matched loading spinner shown inside analytics tiles during refresh.
 */
export function TileSpinner({ className = 'py-8' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="w-5 h-5 border-2 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
    </div>
  );
}
