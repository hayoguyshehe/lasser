import { useAppStore } from '@/store/appStore';
import { HealthScoreRing } from './HealthScoreRing';
import type { IssueCategory, IssueSeverity } from '@/types';
import {
  AlertTriangle,
  GitBranch,
  Copy,
  Split,
  Gauge,
  Microscope,
  Type,
  Image,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

const CATEGORY_ICONS: Record<IssueCategory, typeof AlertTriangle> = {
  'open-vector': GitBranch,
  'duplicate-path': Copy,
  'self-intersection': Split,
  'node-density': Gauge,
  'tiny-geometry': Microscope,
  'text-not-outlined': Type,
  'embedded-raster': Image,
};

const CATEGORY_LABELS: Record<IssueCategory, string> = {
  'open-vector': 'Open Vector',
  'duplicate-path': 'Duplicate Path',
  'self-intersection': 'Self-Intersection',
  'node-density': 'Node Density',
  'tiny-geometry': 'Tiny Geometry',
  'text-not-outlined': 'Text Not Outlined',
  'embedded-raster': 'Embedded Raster',
};

const SEVERITY_STYLES: Record<IssueSeverity, { bg: string; text: string; dot: string; border: string }> = {
  high: { bg: 'bg-red-500/8', text: 'text-red-600', dot: 'bg-red-500', border: 'border-red-500/15' },
  medium: { bg: 'bg-amber-500/8', text: 'text-amber-600', dot: 'bg-amber-500', border: 'border-amber-500/15' },
  low: { bg: 'bg-blue-500/8', text: 'text-blue-600', dot: 'bg-blue-500', border: 'border-blue-500/15' },
};

export function DiagnosticsPanel() {
  const diagnostics = useAppStore((s) => s.diagnostics);
  const selectedIssueId = useAppStore((s) => s.selectedIssueId);
  const selectIssue = useAppStore((s) => s.selectIssue);
  const issueFilter = useAppStore((s) => s.issueFilter);
  const setIssueFilter = useAppStore((s) => s.setIssueFilter);

  if (!diagnostics) return null;

  const categories = Object.keys(CATEGORY_LABELS) as IssueCategory[];
  const filteredIssues = issueFilter
    ? diagnostics.issues.filter((i) => i.category === issueFilter)
    : diagnostics.issues;

  return (
    <div className="w-80 lg:w-96 h-full flex flex-col bg-[#f5f3ee] border-l border-[#1a1a1a]/10">
      {/* Health Score */}
      <div className="p-5 border-b border-[#1a1a1a]/8">
        <div className="text-[10px] uppercase tracking-widest text-[#1a1a1a]/35 font-mono mb-3">// Health Score</div>
        <HealthScoreRing result={diagnostics} />
      </div>

      {/* Category filters */}
      <div className="px-3 py-2.5 border-b border-[#1a1a1a]/8">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setIssueFilter(null)}
            className={`px-2.5 py-1 text-xs font-medium transition-colors ${issueFilter === null ? 'bg-[#1a1a1a] text-[#f5f3ee]' : 'bg-[#1a1a1a]/5 text-[#1a1a1a]/50 hover:bg-[#1a1a1a]/10'}`}
            style={{ borderRadius: 3 }}
          >
            All ({diagnostics.issues.length})
          </button>
          {categories.map((cat) => {
            const count = diagnostics.categoryCounts[cat];
            if (count === 0) return null;
            const Icon = CATEGORY_ICONS[cat];
            return (
              <button
                key={cat}
                onClick={() => setIssueFilter(issueFilter === cat ? null : cat)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-colors ${issueFilter === cat ? 'bg-[#1a1a1a] text-[#f5f3ee]' : 'bg-[#1a1a1a]/5 text-[#1a1a1a]/50 hover:bg-[#1a1a1a]/10'}`}
                style={{ borderRadius: 3 }}
              >
                <Icon className="w-3 h-3" />
                {count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Issues list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {filteredIssues.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 bg-[#0a7c3a]/8 flex items-center justify-center mb-3" style={{ borderRadius: 6 }}>
              <CheckCircle2 className="w-6 h-6 text-[#0a7c3a]" />
            </div>
            <p className="text-sm text-[#1a1a1a]/60 font-medium">No issues found</p>
            <p className="text-xs text-[#1a1a1a]/35 mt-1">This file looks ready to cut</p>
          </div>
        ) : (
          filteredIssues.map((issue) => {
            const Icon = CATEGORY_ICONS[issue.category];
            const isSelected = issue.id === selectedIssueId;
            const sev = SEVERITY_STYLES[issue.severity];
            return (
              <button
                key={issue.id}
                onClick={() => selectIssue(isSelected ? null : issue.id)}
                className={`w-full text-left p-3 border transition-all ${isSelected ? 'bg-white border-[#1a1a1a]/20 shadow-[0_2px_8px_rgba(0,0,0,0.04)]' : 'bg-white/40 border-[#1a1a1a]/8 hover:bg-white/70'}`}
                style={{ borderRadius: 6 }}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`shrink-0 w-8 h-8 flex items-center justify-center border ${sev.bg} ${sev.border}`} style={{ borderRadius: 4 }}>
                    <Icon className={`w-4 h-4 ${sev.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                      <span className="text-[10px] text-[#1a1a1a]/40 uppercase tracking-wider font-mono">
                        {CATEGORY_LABELS[issue.category]}
                      </span>
                    </div>
                    <p className="text-sm text-[#1a1a1a]/75 leading-snug">{issue.message}</p>
                    {issue.details && (
                      <p className="text-xs text-[#1a1a1a]/35 mt-1 font-mono">{issue.details}</p>
                    )}
                  </div>
                  <ChevronRight className={`w-4 h-4 text-[#1a1a1a]/20 transition-transform shrink-0 ${isSelected ? 'rotate-90' : ''}`} />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
