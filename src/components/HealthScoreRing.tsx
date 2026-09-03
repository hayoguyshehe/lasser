import type { DiagnosticResult } from '@/types';

export function HealthScoreRing({ result }: { result: DiagnosticResult }) {
  const score = result.healthScore;
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80 ? '#0a7c3a' :
    score >= 50 ? '#d97706' :
    '#dc2626';

  const label =
    score >= 80 ? 'Healthy' :
    score >= 50 ? 'Needs attention' :
    'Critical';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="rgba(26,26,26,0.06)"
            strokeWidth="7"
          />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tracking-tight" style={{ color }}>{score}</span>
          <span className="text-[10px] text-[#1a1a1a]/35 font-mono">/ 100</span>
        </div>
      </div>
      <div className="mt-1.5 text-sm font-medium" style={{ color }}>{label}</div>
      <div className="mt-2 flex gap-3 text-[10px] text-[#1a1a1a]/35 font-mono uppercase tracking-wider">
        <span>{result.totalPaths} paths</span>
        <span>·</span>
        <span>{result.totalNodes} nodes</span>
        <span>·</span>
        <span>{result.issues.length} issues</span>
      </div>
    </div>
  );
}
