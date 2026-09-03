import { useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { SAMPLE_FILES } from '@/engine/sampleFiles';
import { Upload, FileUp, Sparkles, AlertCircle, FileText } from 'lucide-react';

export function UploadZone() {
  const loadFile = useAppStore((s) => s.loadFile);
  const isLoading = useAppStore((s) => s.isLoading);
  const error = useAppStore((s) => s.error);
  const loadSample = useAppStore((s) => s.loadSample);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file) return;
      const lower = file.name.toLowerCase();
      if (!lower.endsWith('.svg') && !lower.endsWith('.dxf')) {
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        loadFile(text, file.name);
      };
      reader.readAsText(file);
    },
    [loadFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-[#f5f3ee]">
      <div className="w-full max-w-2xl">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed p-12 text-center cursor-pointer transition-all
            ${isDragging
              ? 'border-[#ff4d00] bg-[#ff4d00]/5 scale-[1.02]'
              : 'border-[#1a1a1a]/15 bg-white/30 hover:border-[#1a1a1a]/25 hover:bg-white/50'
            }`}
          style={{ borderRadius: 12 }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".svg,.dxf,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />

          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-3 border-[#1a1a1a]/10 border-t-[#ff4d00] animate-spin" />
              <p className="text-[#1a1a1a]/50 text-sm font-mono">Parsing and analyzing...</p>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 mx-auto mb-4 bg-[#1a1a1a] flex items-center justify-center" style={{ borderRadius: 8 }}>
                <Upload className="w-7 h-7 text-[#f5f3ee]" />
              </div>
              <h3 className="text-lg font-semibold text-[#1a1a1a] mb-1">
                Drop your SVG or DXF file here
              </h3>
              <p className="text-sm text-[#1a1a1a]/40 mb-6">
                or click to browse — files are processed entirely in your browser
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a1a]/5 border border-[#1a1a1a]/10 text-sm text-[#1a1a1a]/70" style={{ borderRadius: 6 }}>
                <FileUp className="w-4 h-4" />
                Choose file
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#1a1a1a]/30 font-mono">
                <span className="px-2 py-0.5 bg-[#1a1a1a]/5" style={{ borderRadius: 3 }}>SVG</span>
                <span className="px-2 py-0.5 bg-[#1a1a1a]/5" style={{ borderRadius: 3 }}>DXF</span>
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-500/8 border border-red-500/15 text-sm text-red-600" style={{ borderRadius: 6 }}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#ff4d00]" />
            <span className="text-sm text-[#1a1a1a]/55 font-medium">Or try a sample file</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SAMPLE_FILES.map((sample) => (
              <button
                key={sample.name}
                onClick={() => loadSample(sample.content, sample.name, sample.format)}
                className="flex items-start gap-3 p-3 bg-white/40 border border-[#1a1a1a]/8 hover:bg-white/70 hover:border-[#ff4d00]/30 transition-all text-left"
                style={{ borderRadius: 6 }}
              >
                <FileText className="w-5 h-5 text-[#ff4d00]/60 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs font-mono text-[#1a1a1a]/75 truncate">{sample.name}</div>
                  <div className="text-xs text-[#1a1a1a]/40 mt-0.5">{sample.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
