interface SlideCounterProps {
  current: number;
  total: number;
  className?: string;
}

export default function SlideCounter({ current, total, className = "" }: SlideCounterProps) {
  return (
    <span className={`font-mono text-xs tracking-wider opacity-50 ${className}`}>
      {String(current).padStart(2, "0")} / {String(total).padStart(2, "0")}
    </span>
  );
}
