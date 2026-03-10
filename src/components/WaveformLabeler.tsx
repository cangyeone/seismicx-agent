import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Save, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Tag, 
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  Loader2,
  ArrowUp,
  ArrowDown,
  Zap,
  Filter,
  SortAsc,
  Cpu,
  Settings,
  Database
} from 'lucide-react';
import { SeismicEvent, PhaseLabel, WaveformLabelData, EventLabelMetadata, preLabelWaveforms } from '../services/aiService';

interface WaveformLabelerProps {
  event: SeismicEvent;
  config: LabelConfig;
  onSave: (metadata: EventLabelMetadata, waveforms: WaveformLabelData[]) => void;
  onNext: () => void;
  hasNext: boolean;
}

interface LabelConfig {
  eventTypes: { id: string; label: string }[];
  phaseTypes: string[];
  polarityTypes: { id: string; label: string }[];
  qualityTypes: string[];
  modelMapping: Record<number, string>;
  savePath: string;
}

const INITIAL_CONFIG: LabelConfig = {
  eventTypes: [
    { id: 'eq', label: '天然地震 (eq)' },
    { id: 'ep', label: '爆破 (ep)' },
    { id: 'ss', label: '塌陷 (ss)' }
  ],
  phaseTypes: ['Pg', 'Sg', 'Pn', 'Sn', 'P', 'S'],
  polarityTypes: [
    { id: 'U', label: '向上 (U)' },
    { id: 'D', label: '向下 (D)' }
  ],
  qualityTypes: ['E', 'I', 'M'],
  modelMapping: {
    0: 'Pg',
    1: 'Sg',
    2: 'Pn',
    3: 'Sn'
  },
  savePath: '/data/labels'
};

const WaveformLabeler: React.FC<WaveformLabelerProps> = ({ event, config, onSave, onNext, hasNext }) => {
  const [metadata, setMetadata] = useState<EventLabelMetadata>({
    type: 'eq',
    magnitude: event.magnitude,
    comments: ''
  });

  const [waveforms, setWaveforms] = useState<WaveformLabelData[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<string>('Pg');
  const [selectedPolarity, setSelectedPolarity] = useState<'U' | 'D' | undefined>(undefined);
  const [selectedQuality, setSelectedQuality] = useState<'E' | 'I' | 'M'>('M');
  const [sortBy, setSortBy] = useState<'distance' | 'arrival'>('distance');
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isPreLabeling, setIsPreLabeling] = useState(false);
  const [localPath, setLocalPath] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastX, setLastX] = useState(0);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update selected phase if config changes
  useEffect(() => {
    if (!config.phaseTypes.includes(selectedPhase)) {
      setSelectedPhase(config.phaseTypes[0]);
    }
    if (!config.eventTypes.find(t => t.id === metadata.type)) {
      setMetadata(prev => ({ ...prev, type: config.eventTypes[0].id }));
    }
  }, [config]);

  // Mock data generation for stations
  useEffect(() => {
    const mockStations = [
      { id: 'STA01', dist: 12.5 },
      { id: 'STA02', dist: 45.2 },
      { id: 'STA03', dist: 88.7 },
      { id: 'STA04', dist: 120.1 },
      { id: 'STA05', dist: 210.5 },
    ];

    const generated = mockStations.map(st => {
      const dataPoints = 1000;
      // Generate 3 components
      const components = Array.from({ length: 3 }, (_, c) => {
        return Array.from({ length: dataPoints }, (_, i) => {
          const base = Math.sin(i * 0.05 + c) * 0.05;
          const noise = (Math.random() - 0.5) * 0.1;
          
          const pArrival = 100 + st.dist * 2;
          const pWave = i > pArrival && i < pArrival + 50 ? Math.sin((i - pArrival) * 0.5) * (0.4 / (c + 1)) : 0;
          
          const sArrival = pArrival + st.dist * 1.5;
          const sWave = i > sArrival && i < sArrival + 100 ? Math.sin((i - sArrival) * 0.3) * (0.7 / (c + 1)) : 0;
          
          return base + noise + pWave + sWave;
        });
      });

      return {
        stationId: st.id,
        distance: st.dist,
        data: components,
        phases: []
      };
    });

    setWaveforms(generated);
  }, [event]);

  const sortedWaveforms = useMemo(() => {
    const copy = [...waveforms];
    if (sortBy === 'distance') {
      return copy.sort((a, b) => a.distance - b.distance);
    } else {
      return copy.sort((a, b) => {
        const firstA = a.phases.length > 0 ? Math.min(...a.phases.map(p => p.time)) : Infinity;
        const firstB = b.phases.length > 0 ? Math.min(...b.phases.map(p => p.time)) : Infinity;
        return firstA - firstB;
      });
    }
  }, [waveforms, sortBy]);

  const handleAddPick = (stationId: string, time: number) => {
    setWaveforms(prev => prev.map(w => {
      if (w.stationId === stationId) {
        // Allow multiple phases of same type if they are far apart, 
        // or just allow multiple as requested. 
        // We'll check if there's a pick of the same phase within 5 samples.
        const exists = w.phases.some(p => p.phase === selectedPhase && Math.abs(p.time - time) < 5);
        if (exists) return w;

        return {
          ...w,
          phases: [...w.phases, { 
            phase: selectedPhase, 
            time, 
            confidence: 1.0,
            polarity: selectedPolarity,
            quality: selectedPolarity ? selectedQuality : undefined
          }]
        };
      }
      return w;
    }));
  };

  const handleUpdatePick = (stationId: string, phase: string, oldTime: number, newTime: number) => {
    setWaveforms(prev => prev.map(w => {
      if (w.stationId === stationId) {
        return {
          ...w,
          phases: w.phases.map(p => 
            (p.phase === phase && p.time === oldTime) ? { ...p, time: newTime } : p
          )
        };
      }
      return w;
    }));
  };

  const handleRemovePick = (stationId: string, phase: string, time: number) => {
    setWaveforms(prev => prev.map(w => {
      if (w.stationId === stationId) {
        return {
          ...w,
          phases: w.phases.filter(p => !(p.phase === phase && p.time === time))
        };
      }
      return w;
    }));
  };

  const handlePreLabel = async () => {
    setIsPreLabeling(true);
    try {
      const modelUrl = "https://github.com/cangyeone/pnsn/blob/main/pickers/pnsn.v1.diff.jit";
      const results = await preLabelWaveforms(waveforms, modelUrl, config.modelMapping);
      setWaveforms(results);
    } catch (error) {
      console.error("Pre-labeling failed", error);
    } finally {
      setIsPreLabeling(false);
    }
  };

  const handleExport = (format: 'json' | 'jsonl') => {
    const data = {
      metadata,
      waveforms: waveforms.map(w => ({
        stationId: w.stationId,
        distance: w.distance,
        phases: w.phases
      }))
    };

    let content = '';
    let filename = `seismic_labels_${event.id}_${new Date().getTime()}`;

    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      filename += '.json';
    } else {
      // JSONL format: each station is a line, plus metadata as first line
      content = JSON.stringify({ type: 'metadata', ...metadata }) + '\n';
      data.waveforms.forEach(w => {
        content += JSON.stringify({ type: 'waveform', ...w }) + '\n';
      });
      filename += '.jsonl';
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportLocal = async () => {
    if (!localPath) return;
    setIsImporting(true);
    try {
      const response = await fetch('/api/import/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: localPath })
      });
      const result = await response.json();
      if (result.success) {
        setWaveforms(result.stations);
        alert(`Successfully imported ${result.stations.length} stations from local path.`);
      } else {
        alert(`Import failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Import failed", error);
      alert("Import failed. Make sure the backend is running and ObsPy is installed.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Zooming is now handled per-waveform row as requested
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Panning is now handled per-waveform row as requested
  };

  const handleMouseMoveGlobal = (e: React.MouseEvent) => {
    // Panning is now handled per-waveform row as requested
  };

  const handleMouseUp = () => {
    // Panning is now handled per-waveform row as requested
  };

  const resetZoom = () => {
    // Reset zoom is now handled per-waveform row or we can broadcast it
    // For now, let's keep a broadcast reset if needed, but the user asked for individual zoom
  };

  const handleSave = async (isAuto = false) => {
    if (!isAuto) setIsSaving(true);
    else setIsAutoSaving(true);
    try {
      const data = {
        metadata,
        waveforms: waveforms.map(w => ({
          stationId: w.stationId,
          distance: w.distance,
          phases: w.phases
        }))
      };

      // Check if there are any phases at all to consider it "labeled"
      const hasLabels = waveforms.some(w => w.phases.length > 0);

      // Save to server
      const response = await fetch('/api/save-labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          data,
          format: 'json', // Default to json for auto-save
          savePath: config.savePath
        })
      });
      const result = await response.json();
      
      if (result.success) {
        if (hasLabels) {
          onSave(metadata, waveforms);
        }
      } else {
        if (!isAuto) throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("Save failed", error);
      if (!isAuto) alert(`Save failed: ${error.message}`);
    } finally {
      if (!isAuto) setIsSaving(false);
      else {
        setTimeout(() => setIsAutoSaving(false), 1000);
      }
    }
  };

  // Auto-save logic
  useEffect(() => {
    if (waveforms.length === 0) return;
    
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      handleSave(true);
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [waveforms, metadata]);

  const handleNext = async () => {
    setIsSaving(true);
    try {
      await handleSave();
      onNext();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex gap-6 h-full w-full relative overflow-hidden">
      {/* Left Panel: Metadata & Controls */}
      <div className="w-80 shrink-0 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Tag className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="font-medium">Event Metadata</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest">Event Type</label>
              <select 
                value={metadata.type}
                onChange={(e) => setMetadata(prev => ({ ...prev, type: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 appearance-none"
              >
                {config.eventTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest">Magnitude (M{metadata.magnitude})</label>
              <input 
                type="range" 
                min="0" 
                max="9" 
                step="0.1"
                value={metadata.magnitude}
                onChange={(e) => setMetadata(prev => ({ ...prev, magnitude: parseFloat(e.target.value) }))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest">Comments</label>
              <textarea 
                value={metadata.comments}
                onChange={(e) => setMetadata(prev => ({ ...prev, comments: e.target.value }))}
                placeholder="Additional observations..."
                className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-emerald-500/50 resize-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Database className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="font-medium">Local Data Import</h3>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest">Local File Path (SAC/MSEED)</label>
              <input 
                type="text" 
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                placeholder="/path/to/data.mseed"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <button 
              onClick={handleImportLocal}
              disabled={isImporting || !localPath}
              className="w-full py-3 bg-white/5 text-gray-400 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              Import via ObsPy
            </button>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Zap className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="font-medium">Pick Settings</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest">Phase Type</label>
              <div className="grid grid-cols-3 gap-2">
                {config.phaseTypes.map(p => (
                  <button
                    key={p}
                    onClick={() => setSelectedPhase(p)}
                    className={`px-2 py-1.5 rounded-lg text-[10px] border transition-all ${
                      selectedPhase === p 
                        ? 'bg-blue-500 border-blue-500 text-white font-bold' 
                        : 'border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest">Polarity (First Motion)</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedPolarity(selectedPolarity === 'U' ? undefined : 'U')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border transition-all ${
                    selectedPolarity === 'U' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'border-white/10 text-gray-500'
                  }`}
                >
                  <ArrowUp className="w-3 h-3" /> <span className="text-[10px]">Up (U)</span>
                </button>
                <button
                  onClick={() => setSelectedPolarity(selectedPolarity === 'D' ? undefined : 'D')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border transition-all ${
                    selectedPolarity === 'D' ? 'bg-red-500/20 border-red-500 text-red-500' : 'border-white/10 text-gray-500'
                  }`}
                >
                  <ArrowDown className="w-3 h-3" /> <span className="text-[10px]">Down (D)</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest">Quality {!selectedPolarity && <span className="text-amber-500/50 lowercase">(requires polarity)</span>}</label>
              <div className="flex gap-2">
                {config.qualityTypes.map(q => (
                  <button
                    key={q}
                    disabled={!selectedPolarity}
                    onClick={() => setSelectedQuality(q as any)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] border transition-all ${
                      selectedQuality === q 
                        ? 'bg-purple-500 border-purple-500 text-white font-bold' 
                        : 'border-white/10 text-gray-400 hover:border-white/20'
                    } ${!selectedPolarity ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 uppercase tracking-widest">Sorting</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortBy('distance')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border transition-all ${
                    sortBy === 'distance' ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-gray-500'
                  }`}
                >
                  <SortAsc className="w-3 h-3" /> <span className="text-[10px]">Distance</span>
                </button>
                <button
                  onClick={() => setSortBy('arrival')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border transition-all ${
                    sortBy === 'arrival' ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-gray-500'
                  }`}
                >
                  <Clock className="w-3 h-3" /> <span className="text-[10px]">Arrival</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 space-y-3">
            <button 
              onClick={handlePreLabel}
              disabled={isPreLabeling}
              className="w-full py-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              {isPreLabeling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
              AI Pre-label (PNSN JIT)
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => handleExport('json')}
                className="py-2 bg-white/5 text-gray-400 border border-white/10 rounded-xl text-[10px] font-bold hover:bg-white/10 transition-all"
              >
                Export JSON
              </button>
              <button 
                onClick={() => handleExport('jsonl')}
                className="py-2 bg-white/5 text-gray-400 border border-white/10 rounded-xl text-[10px] font-bold hover:bg-white/10 transition-all"
              >
                Export JSONL
              </button>
            </div>

            <button 
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="w-full py-4 bg-emerald-500 text-black rounded-xl font-bold hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Labeling
            </button>

            {hasNext && (
              <button 
                onClick={handleNext}
                disabled={isSaving}
                className="w-full py-4 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-all flex items-center justify-center gap-2"
              >
                Next Event & Save
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel: Waveforms */}
      <div className="flex-1 min-w-0 flex flex-col bg-white/5 border border-white/5 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            <h3 className="font-medium">Waveform Trace View</h3>
            <span className="text-xs text-gray-500 ml-2">
              (Sorted by {sortBy === 'distance' ? 'Epicentral Distance' : 'First Arrival'})
            </span>
            <span className="text-[10px] text-gray-500 ml-4 border-l border-white/10 pl-4">
              Ctrl+Wheel to Zoom • Shift+Drag to Pan
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={resetZoom}
              className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] text-gray-400 hover:bg-white/10 transition-all"
            >
              Reset Zoom
            </button>
            <div className="flex items-center gap-4 text-[10px] text-gray-500">
              {isAutoSaving && (
                <div className="flex items-center gap-1.5 text-emerald-500 animate-pulse">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Auto-saved</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div> P-Phases
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div> S-Phases
              </div>
            </div>
          </div>
        </div>

          <div 
            ref={containerRef}
            className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar"
          >
          {sortedWaveforms.map((w) => (
            <WaveformRow 
              key={w.stationId} 
              waveform={w} 
              onAddPick={handleAddPick}
              onUpdatePick={handleUpdatePick}
              onRemovePick={handleRemovePick}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const WaveformRow: React.FC<{
  waveform: WaveformLabelData;
  onAddPick: (stationId: string, time: number) => void;
  onUpdatePick: (stationId: string, phase: string, oldTime: number, newTime: number) => void;
  onRemovePick: (stationId: string, phase: string, time: number) => void;
}> = ({ waveform, onAddPick, onUpdatePick, onRemovePick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [activeComponent, setActiveComponent] = useState(0);
  const [xDomain, setXDomain] = useState<[number, number]>([0, waveform.data[0].length - 1]);
  const [isPanning, setIsPanning] = useState(false);
  const [lastX, setLastX] = useState(0);
  const [draggingPick, setDraggingPick] = useState<{ phase: string, time: number } | null>(null);

  useEffect(() => {
    setXDomain([0, waveform.data[0].length - 1]);
  }, [waveform.stationId]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = 140;
    const margin = { top: 10, right: 10, bottom: 20, left: 10 };

    const data = waveform.data[activeComponent];

    const x = d3.scaleLinear()
      .domain(xDomain)
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain([d3.min(data) || -1, d3.max(data) || 1])
      .range([height - margin.bottom, margin.top]);

    const line = d3.line<number>()
      .x((_, i) => x(i))
      .y(d => y(d));

    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "rgba(255, 255, 255, 0.4)")
      .attr("stroke-width", 1)
      .attr("d", line);

    // Grid lines
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(10).tickSize(-height + margin.top + margin.bottom).tickFormat(() => ""))
      .attr("class", "text-white/5")
      .selectAll("line")
      .attr("stroke", "currentColor");

    // Phase lines
    waveform.phases.forEach(p => {
      const isP = p.phase.startsWith('P');
      const color = isP ? '#3b82f6' : '#ef4444';
      
      const g = svg.append("g")
        .attr("class", "pick-group cursor-move")
        .on("mousedown", (e) => {
          e.stopPropagation();
          setDraggingPick({ phase: p.phase, time: p.time });
        });
      
      g.append("line")
        .attr("x1", x(p.time))
        .attr("x2", x(p.time))
        .attr("y1", margin.top)
        .attr("y2", height - margin.bottom)
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4,2");

      // Phase Label + Polarity + Quality
      const labelText = `${p.phase}${p.polarity ? `(${p.polarity})` : ''} ${p.quality || ''}`;
      
      g.append("text")
        .attr("x", x(p.time) + 5)
        .attr("y", margin.top + 15)
        .attr("fill", color)
        .attr("font-size", "9px")
        .attr("font-weight", "bold")
        .text(labelText);
        
        // Delete button for pick
        g.append("circle")
          .attr("cx", x(p.time))
          .attr("cy", height - margin.bottom)
          .attr("r", 6)
          .attr("fill", color)
          .attr("class", "cursor-pointer hover:scale-125 transition-transform")
          .on("click", (e) => {
            e.stopPropagation();
            onRemovePick(waveform.stationId, p.phase, p.time);
          });
        
        g.append("text")
          .attr("x", x(p.time))
          .attr("y", height - margin.bottom + 3)
          .attr("text-anchor", "middle")
          .attr("fill", "white")
          .attr("font-size", "8px")
          .attr("font-weight", "bold")
          .attr("class", "pointer-events-none")
          .text("×");
    });

  }, [waveform, svgRef, activeComponent, xDomain]);

  const handleWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return; 
    e.preventDefault();

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const xPos = e.clientX - rect.left;
    const margin = 10;
    const effectiveWidth = rect.width - 2 * margin;
    const relativeX = (xPos - margin) / effectiveWidth;

    const [min, max] = xDomain;
    const range = max - min;
    const mouseDataX = min + relativeX * range;

    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.8; 
    let newRange = range * zoomFactor;
    if (newRange < 10) newRange = 10;
    
    const newMin = mouseDataX - relativeX * newRange;
    const newMax = newMin + newRange;

    setXDomain([newMin, newMax]);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      setLastX(e.clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPos = e.clientX - rect.left;
    setHoverX(xPos);

    if (isPanning) {
      const dx = e.clientX - lastX;
      setLastX(e.clientX);
      const range = xDomain[1] - xDomain[0];
      const dataDx = (dx / (rect.width - 20)) * range;
      setXDomain([xDomain[0] - dataDx, xDomain[1] - dataDx]);
    }

    if (draggingPick) {
      const width = rect.width;
      const margin = { left: 10, right: 10 };
      const x = d3.scaleLinear()
        .domain(xDomain)
        .range([margin.left, width - margin.right]);
      const newTime = Math.round(x.invert(xPos));
      onUpdatePick(waveform.stationId, draggingPick.phase, draggingPick.time, newTime);
      setDraggingPick({ ...draggingPick, time: newTime });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingPick(null);
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning || draggingPick) return;
    if (!svgRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPos = e.clientX - rect.left;
    
    const width = svgRef.current.clientWidth;
    const margin = { left: 10, right: 10 };
    const x = d3.scaleLinear()
      .domain(xDomain)
      .range([margin.left, width - margin.right]);
      
    const time = Math.round(x.invert(xPos));
    onAddPick(waveform.stationId, time);
  };

  return (
    <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden group hover:border-white/10 transition-all">
      <div className="px-4 py-2 bg-white/5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-bold text-gray-300">{waveform.stationId}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-[10px] text-gray-500">{waveform.distance.toFixed(1)} km</span>
          </div>
          <div className="flex gap-1 ml-4">
            {['Z', 'N', 'E'].map((c, i) => (
              <button
                key={c}
                onClick={() => setActiveComponent(i)}
                className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all ${
                  activeComponent === i ? 'bg-emerald-500 text-black' : 'bg-white/5 text-gray-500 hover:bg-white/10'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {waveform.phases.map((p, idx) => (
            <div key={`${p.phase}-${p.time}-${idx}`} className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold flex items-center gap-1.5 ${
              p.phase.startsWith('P') ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
            }`}>
              <span>{p.phase} {p.polarity === 'U' ? <ArrowUp className="w-2 h-2 inline" /> : p.polarity === 'D' ? <ArrowDown className="w-2 h-2 inline" /> : null} {p.quality}</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onRemovePick(waveform.stationId, p.phase, p.time);
                }}
                className="hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="relative h-[140px]">
        <svg 
          ref={svgRef} 
          className={`w-full h-full ${isPanning || draggingPick ? 'cursor-grabbing' : 'cursor-crosshair'}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
        />
        {hoverX !== null && (
          <div 
            className="absolute top-0 bottom-0 w-px bg-white/20 pointer-events-none"
            style={{ left: hoverX }}
          >
            <div className="absolute top-0 left-2 bg-black/80 text-[8px] px-1 py-0.5 rounded border border-white/10 text-white whitespace-nowrap">
              Click to pick phase
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaveformLabeler;
