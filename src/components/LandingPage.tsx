import { useAppStore } from '@/store/appStore';
import { SAMPLE_FILES } from '@/engine/sampleFiles';
import {
  Upload,
  ShieldCheck,
  Crosshair,
  Gauge,
  Layers,
  FileCheck,
  ArrowRight,
  Cpu,
  Eye,
  Play,
  GitBranch,
  Copy,
  Split,
  Microscope,
  Type,
  Image as ImageIcon,
  Zap,
  Lock,
} from 'lucide-react';

const ISSUE_TYPES = [
  { icon: GitBranch, label: 'Open Vector', severity: 'High' },
  { icon: Copy, label: 'Duplicate Path', severity: 'High' },
  { icon: Split, label: 'Self-Intersection', severity: 'Med' },
  { icon: Gauge, label: 'Node Density', severity: 'Med' },
  { icon: Microscope, label: 'Tiny Geometry', severity: 'Low' },
  { icon: Type, label: 'Text Not Outlined', severity: 'Med' },
  { icon: ImageIcon, label: 'Embedded Raster', severity: 'Med' },
];

export function LandingPage() {
  const setView = useAppStore((s) => s.setView);
  const loadSample = useAppStore((s) => s.loadSample);

  const handleSample = (content: string, name: string, format: 'svg' | 'dxf') => {
    loadSample(content, name, format);
    setView('workspace');
  };

  return (
    <div className="min-h-screen bg-[#f5f3ee] text-[#1a1a1a]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-[#1a1a1a]/8 bg-[#f5f3ee]/85 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#1a1a1a] flex items-center justify-center" style={{ borderRadius: 2 }}>
              <Crosshair className="w-4 h-4 text-[#f5f3ee]" />
            </div>
            <span className="text-base font-semibold tracking-tight">LaserPrep</span>
            <span className="hidden sm:inline text-[10px] text-[#1a1a1a]/40 font-mono uppercase tracking-widest ml-1">v2.0</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-[#1a1a1a]/60">
            <a href="#features" className="hover:text-[#1a1a1a] transition-colors">Features</a>
            <a href="#checks" className="hover:text-[#1a1a1a] transition-colors">Checks</a>
            <a href="#how" className="hover:text-[#1a1a1a] transition-colors">How it works</a>
            <a href="#samples" className="hover:text-[#1a1a1a] transition-colors">Samples</a>
          </div>
          <button
            onClick={() => setView('workspace')}
            className="px-3.5 py-1.5 bg-[#1a1a1a] text-[#f5f3ee] text-sm font-medium hover:bg-[#333] transition-colors"
            style={{ borderRadius: 4 }}
          >
            Open Workspace
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-5 sm:px-6 pt-16 pb-20 overflow-hidden">
        {/* Technical grid background */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(#1a1a1a 1px, transparent 1px), linear-gradient(90deg, #1a1a1a 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative mx-auto max-w-4xl">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#1a1a1a]/15 bg-white/50 text-xs text-[#1a1a1a]/60 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0a7c3a] animate-pulse" />
              100% client-side — zero file upload
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-center text-5xl sm:text-6xl md:text-7xl font-bold tracking-[-0.03em] leading-[0.95] mb-6">
            Validate laser files
            <br />
            <span className="relative inline-block">
              <span className="relative z-10">before you burn.</span>
              <span className="absolute bottom-1 left-0 right-0 h-3 bg-[#ff4d00]/20 -z-0" />
            </span>
          </h1>

          <p className="text-center text-lg text-[#1a1a1a]/55 max-w-2xl mx-auto mb-10 leading-relaxed">
            Drop in an SVG or DXF. Get an instant health score, pinpoint every geometry issue,
            and stop wasting material on files that fail at the machine.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <button
              onClick={() => setView('workspace')}
              className="group px-5 py-3 bg-[#1a1a1a] text-[#f5f3ee] font-medium flex items-center gap-2 hover:bg-[#333] transition-colors"
              style={{ borderRadius: 6 }}
            >
              <Upload className="w-4 h-4" />
              Upload SVG or DXF
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => handleSample(SAMPLE_FILES[1].content, SAMPLE_FILES[1].name, SAMPLE_FILES[1].format)}
              className="px-5 py-3 border border-[#1a1a1a]/20 bg-white/40 text-[#1a1a1a] font-medium hover:bg-white/70 transition-colors"
              style={{ borderRadius: 6 }}
            >
              Try with sample file
            </button>
          </div>

          {/* Format badges */}
          <div className="flex items-center justify-center gap-3 text-xs font-mono text-[#1a1a1a]/40">
            <span className="px-2.5 py-1 bg-[#1a1a1a]/5 border border-[#1a1a1a]/10" style={{ borderRadius: 3 }}>SVG</span>
            <span className="px-2.5 py-1 bg-[#1a1a1a]/5 border border-[#1a1a1a]/10" style={{ borderRadius: 3 }}>DXF</span>
            <span className="px-2.5 py-1 bg-[#1a1a1a]/5 border border-[#1a1a1a]/10" style={{ borderRadius: 3 }}>R12–R2018</span>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-[#1a1a1a]/8 bg-[#1a1a1a] text-[#f5f3ee]">
        <div className="mx-auto max-w-5xl px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: '< 2s', label: 'Parse time', icon: Zap },
            { value: 'Client', label: 'Processing', icon: Cpu },
            { value: '100%', label: 'File privacy', icon: Lock },
            { value: '7', label: 'Issue checks', icon: FileCheck },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <stat.icon className="w-4 h-4 text-[#ff4d00]" />
              <div>
                <div className="text-xl font-bold tracking-tight">{stat.value}</div>
                <div className="text-[10px] text-[#f5f3ee]/40 uppercase tracking-widest font-mono">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-5 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14">
            <div className="text-xs font-mono uppercase tracking-widest text-[#ff4d00] mb-3">// Features</div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight max-w-2xl">
              Built for operators and designers who can't afford a failed cut.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#1a1a1a]/8 border border-[#1a1a1a]/8" style={{ borderRadius: 8 }}>
            {[
              {
                icon: Gauge,
                title: 'Health Score',
                desc: 'Weighted 0–100 score. Open vectors and duplicates weigh heaviest — they cause the most material waste.',
              },
              {
                icon: Crosshair,
                title: '7-Point Diagnostics',
                desc: 'Open vectors, duplicates, self-intersections, node density, tiny geometry, unconverted text, embedded raster.',
              },
              {
                icon: Eye,
                title: 'Interactive Canvas',
                desc: 'Pan, zoom, toggle layers. Click any issue to jump straight to its location on the canvas.',
              },
              {
                icon: Layers,
                title: 'Layer Awareness',
                desc: 'Paths grouped by layer and color — matches how LightBurn and RDWorks organize cut operations.',
              },
              {
                icon: ShieldCheck,
                title: 'Safe by Design',
                desc: 'SVGs are sanitized to strip scripts and event handlers before processing. Your designs never touch a server.',
              },
              {
                icon: Play,
                title: 'Laser Simulator',
                desc: 'Playback mode animates the laser head along the cut path, showing rapid-travel vs cutting moves.',
              },
            ].map((feat) => (
              <div
                key={feat.title}
                className="group p-6 bg-[#f5f3ee] hover:bg-white transition-colors"
              >
                <div className="w-10 h-10 bg-[#1a1a1a] flex items-center justify-center mb-4 group-hover:bg-[#ff4d00] transition-colors" style={{ borderRadius: 4 }}>
                  <feat.icon className="w-5 h-5 text-[#f5f3ee]" />
                </div>
                <h3 className="text-base font-semibold mb-1.5">{feat.title}</h3>
                <p className="text-sm text-[#1a1a1a]/55 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Checks detail */}
      <section id="checks" className="py-20 px-5 sm:px-6 bg-[#1a1a1a] text-[#f5f3ee]">
        <div className="mx-auto max-w-4xl">
          <div className="mb-14">
            <div className="text-xs font-mono uppercase tracking-widest text-[#ff4d00] mb-3">// Checks</div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Seven checks. Every common failure mode.
            </h2>
            <p className="text-[#f5f3ee]/50 mt-4 max-w-xl">
              Each check targets a real problem that causes wasted material, failed cuts, and marketplace refunds.
            </p>
          </div>

          <div className="space-y-px">
            {ISSUE_TYPES.map((item, i) => (
              <div
                key={item.label}
                className="flex items-center gap-5 py-4 border-t border-[#f5f3ee]/8 last:border-b group hover:bg-[#f5f3ee]/[0.03] transition-colors px-2 -mx-2"
              >
                <span className="text-xs font-mono text-[#f5f3ee]/30 w-6">{String(i + 1).padStart(2, '0')}</span>
                <div className="w-9 h-9 bg-[#f5f3ee]/5 border border-[#f5f3ee]/10 flex items-center justify-center shrink-0" style={{ borderRadius: 4 }}>
                  <item.icon className="w-4 h-4 text-[#ff4d00]" />
                </div>
                <div className="flex-1">
                  <span className="text-base font-medium">{item.label}</span>
                </div>
                <span className={`text-xs font-mono px-2 py-0.5 ${
                  item.severity === 'High'
                    ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                    : item.severity === 'Med'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                    : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                }`} style={{ borderRadius: 3 }}>
                  {item.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 px-5 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-14">
            <div className="text-xs font-mono uppercase tracking-widest text-[#ff4d00] mb-3">// How it works</div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Three steps to a clean file.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-px bg-[#1a1a1a]/8 border border-[#1a1a1a]/8" style={{ borderRadius: 8 }}>
            {[
              { num: '01', title: 'Upload', desc: 'Drag and drop SVG or DXF. Everything is parsed in your browser — no upload to any server.' },
              { num: '02', title: 'Review', desc: 'See your health score and a categorized list of every issue found, with locations marked on the canvas.' },
              { num: '03', title: 'Fix & Export', desc: 'Use one-click auto-heal to close gaps, deduplicate lines, and optimize cut paths. Export a clean file.' },
            ].map((step) => (
              <div key={step.num} className="p-6 bg-[#f5f3ee]">
                <div className="text-3xl font-bold text-[#1a1a1a]/15 font-mono mb-3">{step.num}</div>
                <h3 className="text-base font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-[#1a1a1a]/55 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample files */}
      <section id="samples" className="py-20 px-5 sm:px-6 bg-[#1a1a1a]/[0.02] border-t border-[#1a1a1a]/8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10">
            <div className="text-xs font-mono uppercase tracking-widest text-[#ff4d00] mb-3">// Samples</div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Try it instantly.</h2>
            <p className="text-[#1a1a1a]/50 max-w-lg">
              No file? Load one of these samples to see the diagnostics in action.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {SAMPLE_FILES.map((sample) => (
              <button
                key={sample.name}
                onClick={() => handleSample(sample.content, sample.name, sample.format)}
                className="group flex items-center gap-4 p-4 bg-white border border-[#1a1a1a]/10 hover:border-[#ff4d00]/40 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all text-left"
                style={{ borderRadius: 6 }}
              >
                <div className="w-10 h-10 bg-[#1a1a1a]/5 flex items-center justify-center shrink-0 group-hover:bg-[#ff4d00]/10 transition-colors" style={{ borderRadius: 4 }}>
                  <FileCheck className="w-5 h-5 text-[#1a1a1a]/40 group-hover:text-[#ff4d00] transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm text-[#1a1a1a] truncate">{sample.name}</div>
                  <div className="text-xs text-[#1a1a1a]/45 mt-0.5">{sample.description}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#1a1a1a]/20 group-hover:text-[#ff4d00] group-hover:translate-x-1 transition-all shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-5 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Stop guessing. Start cutting.
          </h2>
          <p className="text-[#1a1a1a]/50 mb-8 max-w-md mx-auto">
            Every failed cut costs material and time. Check your files first.
          </p>
          <button
            onClick={() => setView('workspace')}
            className="group inline-flex items-center gap-2 px-6 py-3 bg-[#1a1a1a] text-[#f5f3ee] font-medium hover:bg-[#333] transition-colors"
            style={{ borderRadius: 6 }}
          >
            Open Workspace
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a]/8 py-10 px-5 sm:px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#1a1a1a] flex items-center justify-center" style={{ borderRadius: 2 }}>
              <Crosshair className="w-3.5 h-3.5 text-[#f5f3ee]" />
            </div>
            <span className="text-sm text-[#1a1a1a]/50">LaserPrep</span>
          </div>
          <div className="text-xs text-[#1a1a1a]/35 font-mono">
            All processing in-browser · No file upload · No tracking
          </div>
        </div>
      </footer>
    </div>
  );
}
