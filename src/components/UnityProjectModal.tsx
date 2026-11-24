import React, { useEffect, useState } from 'react';
import { Code2, Download, FileCode, Terminal, X } from 'lucide-react';

interface UnityFileEntry {
  path: string;
  size: number;
  content: string;
}

interface ReleaseItem {
  name: string;
  size: number;
  sha256: string;
  downloadUrl: string;
}

interface UnityProjectModalProps {
  onClose: () => void;
}

export const UnityProjectModal: React.FC<UnityProjectModalProps> = ({ onClose }) => {
  const [files, setFiles] = useState<UnityFileEntry[]>([]);
  const [releaseItems, setReleaseItems] = useState<ReleaseItem[]>([]);
  const [selected, setSelected] = useState<UnityFileEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/unity-project/files').then((r) => r.json()),
      fetch('/api/release/manifest').then((r) => r.json()),
    ])
      .then(
        ([fileData, relData]: [
          { files?: UnityFileEntry[] },
          { items?: ReleaseItem[] },
        ]) => {
          const list = fileData.files || [];
          setFiles(list);
          if (list.length > 0) setSelected(list[0]);
          setReleaseItems(relData.items || []);
        },
      )
      .catch(() => {
        setFiles([]);
        setReleaseItems([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const sourceZip = releaseItems.find((i) => i.name.endsWith('.zip'));
  const docItems = releaseItems.filter((i) => !i.name.endsWith('.zip'));

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-5xl h-[88vh] bg-[#0e1420] border border-white/15 rounded-lg flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Code2 className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-display font-bold text-lg text-slate-100">
                AARYA CITY — Release Package & Unity 6 Source
              </h2>
              <p className="text-xs text-slate-400">
                Package ID: <span className="font-mono-tabular text-slate-200">com.aaryadigitalworld.aaryacity</span> · ARM64 IL2CPP · URP 17.0.3 · Unity 6000.0.28f1
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Direct Download Bar */}
        <div className="px-5 py-3 bg-[#141c2c] border-b border-white/10 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-amber-300">
              <Terminal className="w-4 h-4 shrink-0" />
              <span>
                Unity Editor & Android SDK are absent in this cloud runtime—APK/AAB compilation must run locally via build-android.sh or GitHub Actions.
              </span>
            </div>
            {sourceZip ? (
              <a
                href={sourceZip.downloadUrl}
                download={sourceZip.name}
                className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs flex items-center gap-2 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  Download {sourceZip.name} ({(sourceZip.size / 1024).toFixed(1)} KB)
                </span>
              </a>
            ) : null}
          </div>

          {docItems.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {docItems.map((doc) => (
                <a
                  key={doc.name}
                  href={doc.downloadUrl}
                  download={doc.name}
                  className="px-2.5 py-1 rounded bg-[#090d16] hover:bg-slate-800 border border-white/15 text-xs text-cyan-300 flex items-center gap-1.5"
                >
                  <Download className="w-3 h-3" />
                  <span>{doc.name}</span>
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex-1 flex min-h-0">
          {/* File Tree */}
          <div className="w-72 border-r border-white/10 overflow-y-auto p-3 flex flex-col gap-1">
            {loading ? (
              <div className="text-xs text-slate-400 p-2">Loading Unity project tree...</div>
            ) : (
              files.map((f) => (
                <button
                  key={f.path}
                  onClick={() => setSelected(f)}
                  className={`text-left px-2.5 py-1.5 rounded text-xs flex items-center gap-2 transition-colors ${
                    selected?.path === f.path
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{f.path}</span>
                </button>
              ))
            )}
          </div>

          {/* Code Viewer */}
          <div className="flex-1 overflow-auto p-4 bg-[#090d16]">
            {selected ? (
              <div>
                <div className="text-xs font-mono-tabular text-cyan-300 mb-2">
                  unity-project/{selected.path} ({selected.size} bytes)
                </div>
                <pre className="text-xs font-mono-tabular text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selected.content}
                </pre>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
