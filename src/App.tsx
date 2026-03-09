import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Map as MapIcon, 
  Settings, 
  FileText, 
  Database, 
  Cpu, 
  Brain, 
  Zap,
  Layers,
  ChevronRight,
  Search,
  AlertTriangle,
  Info,
  Send,
  Loader2,
  HelpCircle,
  Terminal,
  Download,
  Globe,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SeismicMap from './components/SeismicMap';
import WaveformDisplay from './components/WaveformDisplay';
import { fetchUSGSEvents } from './services/seismoService';
import { SeismicEvent, analyzeSeismicRisk, suggestAssociationParams, performGeologicalAnalysis, formatTrainingData, optimizeSystem, designModelArchitecture, generateTrainingReport, processDirectoryForHDF5, analyzeDatasetStructure, DatasetAnalysis, importExternalData, processCLICommand, AIConfig, AIProvider } from './services/aiService';
import Markdown from 'react-markdown';

const providerOptions: {
  value: AIProvider;
  label: string;
  model: string;
  baseUrl: string;
  apiKeyPlaceholder: string;
}[] = [
  {
    value: 'gemini',
    label: 'Gemini',
    model: 'gemini-3.1-pro-preview',
    baseUrl: '',
    apiKeyPlaceholder: 'Gemini API Key',
  },
  {
    value: 'openai',
    label: 'OpenAI',
    model: '',
    baseUrl: '',
    apiKeyPlaceholder: 'OpenAI API Key',
  },
  {
    value: 'claude',
    label: 'Claude',
    model: '',
    baseUrl: '',
    apiKeyPlaceholder: 'Anthropic API Key',
  },
  {
    value: 'ollama',
    label: 'Ollama',
    model: '',
    baseUrl: '',
    apiKeyPlaceholder: 'Optional API Key',
  },
  {
    value: 'vllm',
    label: 'vLLM',
    model: '',
    baseUrl: '',
    apiKeyPlaceholder: 'Optional API Key',
  },
];

const providerBaseUrlHints: Record<AIProvider, { placeholder: string; help: string }> = {
  gemini: { placeholder: '', help: '' },
  openai: {
    placeholder: 'https://api.openai.com/v1',
    help: 'Use the root OpenAI endpoint only (no /chat/completions). Leave blank to use the default.',
  },
  claude: {
    placeholder: 'https://api.anthropic.com',
    help: 'Anthropic endpoints expect the base domain only. Do not append /v1/messages; the app will handle the path.',
  },
  ollama: {
    placeholder: 'http://localhost:11434/v1',
    help: 'Point to your local Ollama server root. Keep custom routes out of the URL.',
  },
  vllm: {
    placeholder: 'http://localhost:8000/v1',
    help: 'Provide the OpenAI-compatible root endpoint exposed by vLLM.',
  },
};

const getProviderOption = (provider: AIProvider) => {
  return providerOptions.find(option => option.value === provider) ?? providerOptions[0];
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: 'gemini',
    model: 'gemini-3.1-pro-preview',
    baseUrl: '',
    apiKey: ''
  });

  const currentProviderOption = getProviderOption(aiConfig.provider);
  const [events, setEvents] = useState<SeismicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mockWaveform, setMockWaveform] = useState<number[]>([]);
  const [associationParams, setAssociationParams] = useState<any>(null);
  const [riskReport, setRiskReport] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<SeismicEvent | null>(null);
  const [eventGeology, setEventGeology] = useState<Record<string, string>>({});
  
  // New Settings
  const [detectionThreshold, setDetectionThreshold] = useState(0.7);
  const [detectionModel, setDetectionModel] = useState('PhaseNet-v2');
  const [associationAlgo, setAssociationAlgo] = useState<'gamma' | 'real'>('gamma');
  const [locationAlgo, setLocationAlgo] = useState('HypoInverse');
  const [isFineTuning, setIsFineTuning] = useState(false);
  const [manualPhaseData, setManualPhaseData] = useState('');
  const [trainingData, setTrainingData] = useState('');
  const [formattedData, setFormattedData] = useState('');
  const [isProcessingData, setIsProcessingData] = useState(false);
  const [optimizationTarget, setOptimizationTarget] = useState<'recall' | 'precision' | 'balanced'>('recall');

  // Model Builder State
  const [modelDescription, setModelDescription] = useState('A Transformer-based model for phase detection and epicentral distance estimation.');
  const [hdf5Path, setHdf5Path] = useState('/data/seismic_dataset.h5');
  const [trainingStatus, setTrainingStatus] = useState<'idle' | 'designing' | 'training' | 'completed'>('idle');
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);
  const [modelDesign, setModelDesign] = useState<any>(null);
  const [trainingReport, setTrainingReport] = useState<string | null>(null);

  // Dataset Builder State
  const [datasetDirectory, setDatasetDirectory] = useState('/data/raw_seismic_project_2024');
  const [datasetDescription, setDatasetDescription] = useState('A directory containing MiniSEED files and a phase report in .ctlg format.');
  const [datasetProcessingStatus, setDatasetProcessingStatus] = useState<'idle' | 'analyzing' | 'clarifying' | 'indexing' | 'consolidating' | 'completed'>('idle');
  const [datasetLogs, setDatasetLogs] = useState<string[]>([]);
  const [hdf5OutputPath, setHdf5OutputPath] = useState<string | null>(null);
  const [datasetAnalysis, setDatasetAnalysis] = useState<DatasetAnalysis | null>(null);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({});

  // External Import State
  const [importUrl, setImportUrl] = useState('https://fdsn.example.com/query?starttime=2024-01-01');
  const [importDescription, setImportDescription] = useState('FDSN query for regional events in the Cascadia zone.');
  const [importResult, setImportResult] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importPlan, setImportPlan] = useState<any>(null);

  // CLI State
  const [cliCommand, setCliCommand] = useState('');
  const [cliHistory, setCliHistory] = useState<{cmd: string, resp: string}[]>([]);
  const [isCliProcessing, setIsCliProcessing] = useState(false);
  const [cliOutput, setCliOutput] = useState<string[]>(['Welcome to SeismoAgent CLI. Type /help for available commands.']);

  const scrollRef = useRef<HTMLDivElement>(null);
  const cliScrollRef = useRef<HTMLDivElement>(null);
  const cliEndRef = useRef<HTMLDivElement>(null);

  const handleProviderChange = (provider: AIProvider) => {
    const option = getProviderOption(provider);
    setAiConfig(prev => ({
      ...prev,
      provider,
      model: option.model,
      baseUrl: option.baseUrl,
    }));
  };

  useEffect(() => {
    loadData();
    generateMockWaveform();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const loadData = async () => {
    try {
      const now = new Date();
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const data = await fetchUSGSEvents(past.toISOString(), now.toISOString());
      setEvents(data);
      
      // Auto-analyze the most recent significant event
      if (data.length > 0 && data[0].magnitude > 4.5) {
        handleEventClick(data[0]);
      }
    } catch (error) {
      console.error("Failed to load events", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = async (event: SeismicEvent) => {
    setSelectedEvent(event);
    if (!eventGeology[event.id] || eventGeology[event.id].startsWith('⚠️')) {
      try {
        const analysis = await performGeologicalAnalysis(event, aiConfig);
        setEventGeology(prev => ({ ...prev, [event.id]: analysis }));
      } catch (error: any) {
        console.error("Geology analysis failed", error);
        const isQuotaError = error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED');
        const errorMsg = isQuotaError 
          ? "⚠️ AI Quota Exceeded. Click here to retry." 
          : "⚠️ Analysis failed. Click here to retry.";
        setEventGeology(prev => ({ ...prev, [event.id]: errorMsg }));
      }
    }
  };

  const generateMockWaveform = () => {
    const data = Array.from({ length: 500 }, (_, i) => {
      const base = Math.sin(i * 0.1) * 0.1;
      const noise = (Math.random() - 0.5) * 0.05;
      const pWave = i > 200 && i < 250 ? Math.sin((i - 200) * 0.5) * 0.5 : 0;
      const sWave = i > 300 && i < 450 ? Math.sin((i - 300) * 0.3) * 0.8 : 0;
      return base + noise + pWave + sWave;
    });
    setMockWaveform(data);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    const userMsg = userInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setUserInput('');
    setIsTyping(true);

    try {
      const { callAI } = await import('./services/aiService');
      const content = await callAI(userMsg, aiConfig);
      setChatMessages(prev => [...prev, { role: 'assistant', content: content }]);
    } catch (error) {
      console.error("Chat error", error);
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please check your AI configuration." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const runRiskAnalysis = async () => {
    if (events.length === 0) return;
    setLoading(true);
    try {
      const report = await analyzeSeismicRisk("Pacific Northwest / Cascadia", events.slice(0, 10), aiConfig);
      setRiskReport(report || "No report generated.");
      setActiveTab('analysis');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const tuneAssociation = async () => {
    setLoading(true);
    try {
      const params = await suggestAssociationParams(associationAlgo, "High", "Moderate", aiConfig);
      setAssociationParams(params);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const startFineTuning = () => {
    setIsFineTuning(true);
    setTimeout(() => {
      setIsFineTuning(false);
      alert("Fine-tuning complete! Model weights updated.");
    }, 5000);
  };

  const handleManualAssociation = async () => {
    setLoading(true);
    // Mocking manual association logic
    setTimeout(() => {
      alert("Manual association complete. Estimated 1 event found at [45.5, -122.6]");
      setLoading(false);
    }, 2000);
  };

  const handleFullOptimization = async () => {
    setLoading(true);
    try {
      const currentSettings = {
        associationAlgo,
        detectionModel,
        detectionThreshold,
        locationAlgo
      };
      const result = await optimizeSystem(currentSettings, aiConfig, optimizationTarget);
      
      // Apply optimizations automatically
      setAssociationParams(result.associationParams);
      setDetectionThreshold(result.detectionThreshold);
      setDetectionModel(result.detectionModel);
      setLocationAlgo(result.locationAlgo);
      
      alert(`System Optimized by Agent!\n\nImprovement: ${result.estimatedImprovement}\n\nReasoning: ${result.reasoning}`);
    } catch (error) {
      console.error("Optimization error", error);
      alert("Failed to perform system optimization.");
    } finally {
      setLoading(false);
    }
  };

  const processTrainingData = async () => {
    if (!trainingData.trim()) return;
    setIsProcessingData(true);
    try {
      const result = await formatTrainingData(trainingData, detectionModel, aiConfig);
      setFormattedData(result);
    } catch (error) {
      console.error("Data processing error", error);
      alert("Failed to process training data.");
    } finally {
      setIsProcessingData(false);
    }
  };

  const handleBuildModel = async () => {
    setTrainingStatus('designing');
    setTrainingLogs(['[AGENT] Initializing model design phase...', `[AGENT] Connecting to HDF5 dataset: ${hdf5Path}`]);
    
    try {
      const design = await designModelArchitecture(modelDescription, aiConfig);
      setModelDesign(design);
      setTrainingLogs(prev => [...prev, `[AGENT] Architecture designed: ${design.name}`, `[AGENT] Parameters: ${design.parameters.toLocaleString()}`, '[AGENT] Starting training pipeline...']);
      
      setTrainingStatus('training');
      // Simulate training logs
      const epochs = 5;
      for (let i = 1; i <= epochs; i++) {
        await new Promise(r => setTimeout(r, 1500));
        setTrainingLogs(prev => [...prev, `[TRAIN] Epoch ${i}/${epochs} - loss: ${(0.5 / i).toFixed(4)} - val_loss: ${(0.6 / i).toFixed(4)}`]);
      }
      
      setTrainingLogs(prev => [...prev, '[AGENT] Training completed. Generating report...']);
      const report = await generateTrainingReport(trainingLogs.join('\n'), aiConfig);
      setTrainingReport(report);
      setTrainingStatus('completed');
      
      alert("Model training and evaluation complete!");
    } catch (error) {
      console.error("Build error", error);
      setTrainingStatus('idle');
      alert("Failed to build model.");
    }
  };

  const handleProcessDirectory = async () => {
    setDatasetProcessingStatus('analyzing');
    setDatasetLogs(['[AGENT] Analyzing directory structure...', `[AGENT] Path: ${datasetDirectory}`, `[AGENT] Context: ${datasetDescription}`]);
    
    try {
      // Mocked file list for simulation
      const mockFileList = [
        '2024_project_phases.ctlg',
        'station_metadata.xml',
        'waveforms/STA01.HHZ.2024.001.mseed',
        'waveforms/STA02.HHZ.2024.001.mseed',
        'unknown_data_format.dat'
      ];
      
      const analysis = await analyzeDatasetStructure(datasetDirectory, mockFileList, datasetDescription, aiConfig);
      setDatasetAnalysis(analysis);
      
      setDatasetLogs(prev => [
        ...prev, 
        `[AGENT] Analysis complete.`,
        `[AGENT] Identified ${analysis.files.length} files.`,
        `[AGENT] Summary: ${analysis.analysis}`
      ]);

      if (analysis.questions && analysis.questions.length > 0) {
        setDatasetProcessingStatus('clarifying');
        setDatasetLogs(prev => [...prev, '[AGENT] I have some questions about the data format. Please provide clarification.']);
      } else {
        await proceedWithBuilding();
      }
    } catch (error) {
      console.error("Dataset build error", error);
      setDatasetProcessingStatus('idle');
      alert("Failed to analyze dataset.");
    }
  };

  const proceedWithBuilding = async () => {
    setDatasetProcessingStatus('indexing');
    setDatasetLogs(prev => [...prev, '[AGENT] Proceeding with indexing...', '[AGENT] Running miniseedindex...', '[AGENT] Indexing MiniSEED files via Obspy...']);

    await new Promise(r => setTimeout(r, 2000));
    setDatasetProcessingStatus('consolidating');
    setDatasetLogs(prev => [...prev, '[AGENT] Consolidating into HDF5...', `[AGENT] Estimated Size: ${datasetAnalysis?.estimatedSize || 'Unknown'}`]);

    await new Promise(r => setTimeout(r, 2000));
    const finalPath = `${datasetDirectory}/unified_dataset.h5`;
    setHdf5OutputPath(finalPath);
    setHdf5Path(finalPath); 
    setDatasetProcessingStatus('completed');
    alert("HDF5 Dataset built successfully!");
  };

  const handleClarificationSubmit = async () => {
    const answersStr = Object.entries(clarificationAnswers).map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n');
    setDatasetLogs(prev => [...prev, '[USER] Clarification provided.', answersStr]);
    setDatasetDescription(prev => `${prev}\n\nClarification provided:\n${answersStr}`);
    await proceedWithBuilding();
  };

  const handleExternalImport = async () => {
    if (!importUrl.trim()) return;
    setIsImporting(true);
    try {
      const result = await importExternalData(importUrl, importDescription, aiConfig);
      setImportResult(result);
      alert(`Import Plan Generated!\n\nSource Type: ${result.sourceType}\n\nPlan: ${result.ingestionPlan}`);
    } catch (error) {
      console.error("Import error", error);
      alert("Failed to generate import plan.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleCliSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliCommand.trim()) return;

    const cmd = cliCommand;
    setCliCommand('');
    setIsCliProcessing(true);

    try {
      const context = {
        activeTab,
        selectedEventId: selectedEvent?.id,
        eventsCount: events.length,
        optimizationTarget
      };
      const result = await processCLICommand(cmd, context, aiConfig);
      setCliHistory(prev => [...prev, { cmd, resp: result.response }]);
      
      // Auto-scroll CLI
      setTimeout(() => {
        if (cliScrollRef.current) {
          cliScrollRef.current.scrollTop = cliScrollRef.current.scrollHeight;
        }
      }, 100);
    } catch (error) {
      console.error("CLI error", error);
      setCliHistory(prev => [...prev, { cmd, resp: "Error processing command." }]);
    } finally {
      setIsCliProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans selection:bg-emerald-500/30">
      {/* Sidebar */}
      <nav className="fixed left-0 top-0 h-full w-20 flex flex-col items-center py-8 bg-black/40 border-r border-white/5 z-50">
        <div className="mb-12 p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
          <Activity className="w-8 h-8 text-emerald-500" />
        </div>
        
        <div className="flex flex-col gap-8">
          <NavItem icon={<MapIcon />} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} label="Map" />
          <NavItem icon={<Brain />} active={activeTab === 'agent'} onClick={() => setActiveTab('agent')} label="Agent" />
          <NavItem icon={<Layers />} active={activeTab === 'build'} onClick={() => setActiveTab('build')} label="Build" />
          <NavItem icon={<Cpu />} active={activeTab === 'models'} onClick={() => setActiveTab('models')} label="Models" />
          <NavItem icon={<FileText />} active={activeTab === 'analysis'} onClick={() => setActiveTab('analysis')} label="Reports" />
          <NavItem icon={<Database />} active={activeTab === 'knowledge'} onClick={() => setActiveTab('knowledge')} label="Data" />
          <NavItem icon={<Terminal />} active={activeTab === 'cli'} onClick={() => setActiveTab('cli')} label="CLI" />
          <NavItem icon={<Settings />} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label="Config" />
        </div>
      </nav>

      {/* Main Content */}
      <main className="pl-20 min-h-screen">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-medium tracking-tight">SeismicXAgent <span className="text-emerald-500 text-xs font-mono ml-2 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 uppercase tracking-widest">v3.0 Elite</span></h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              LIVE MONITORING ACTIVE
            </div>
            <button className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
              Export Data
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-12 gap-6"
              >
                {/* Map Section */}
                <div className="col-span-12 lg:col-span-8 h-[600px] relative">
                  <SeismicMap events={events} />
                  <div className="absolute bottom-6 left-6 right-6 flex gap-4 pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-xl p-4 rounded-xl border border-white/10 flex-1 pointer-events-auto overflow-hidden flex flex-col">
                      <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Recent Significant Events</div>
                      <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2">
                        {events.slice(0, 10).map(e => (
                          <button 
                            key={e.id} 
                            onClick={() => handleEventClick(e)}
                            className={`w-full flex items-center justify-between text-xs py-2 px-2 border-b border-white/5 last:border-0 rounded-lg transition-colors text-left ${selectedEvent?.id === e.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                          >
                            <span className={`${e.magnitude > 5 ? 'text-red-400' : 'text-emerald-400'} font-mono w-8`}>M{e.magnitude}</span>
                            <span className="truncate flex-1 px-2">{e.place}</span>
                            <span className="text-gray-500 text-[10px]">{new Date(e.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-black/60 backdrop-blur-xl p-4 rounded-xl border border-white/10 w-48 pointer-events-auto flex flex-col justify-center items-center">
                      <div className="text-3xl font-light text-emerald-500">{events.length}</div>
                      <div className="text-[10px] uppercase tracking-widest text-gray-500">Events (7d)</div>
                    </div>
                  </div>
                </div>

                {/* Sidebar Stats */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                    <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      Quick Actions
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      <ActionButton 
                        icon={<Brain className="w-4 h-4" />} 
                        label="Analyze Local Risk" 
                        onClick={runRiskAnalysis}
                      />
                      <ActionButton 
                        icon={<Zap className="w-4 h-4" />} 
                        label="Agent System Optimization" 
                        onClick={handleFullOptimization}
                      />
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-3">
                        <div className="text-[10px] text-emerald-500 uppercase tracking-widest font-mono flex items-center gap-2">
                          <Activity className="w-3 h-3" />
                          Optimization Target
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {(['recall', 'precision', 'balanced'] as const).map(t => (
                            <button
                              key={t}
                              onClick={() => setOptimizationTarget(t)}
                              className={`py-2 rounded-lg text-[9px] font-mono uppercase transition-all border ${
                                optimizationTarget === t 
                                  ? 'bg-emerald-500 text-black border-emerald-500' 
                                  : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <ActionButton 
                        icon={<FileText className="w-4 h-4" />} 
                        label="Generate Report" 
                        onClick={() => setActiveTab('analysis')}
                      />
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                    <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-500" />
                      Geological Context
                    </h3>
                    {selectedEvent ? (
                      <div className="space-y-4">
                        <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                          <div className="text-[10px] text-gray-500 uppercase mb-1">Selected Event</div>
                          <div className="text-sm font-medium">M{selectedEvent.magnitude} - {selectedEvent.place}</div>
                        </div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar text-xs text-gray-400 leading-relaxed prose prose-invert prose-xs">
                          {eventGeology[selectedEvent.id] ? (
                            <div 
                              onClick={() => eventGeology[selectedEvent.id].startsWith('⚠️') && handleEventClick(selectedEvent)}
                              className={eventGeology[selectedEvent.id].startsWith('⚠️') ? 'cursor-pointer hover:text-white transition-colors p-2 bg-red-500/10 border border-red-500/20 rounded-lg' : ''}
                            >
                              <Markdown>{eventGeology[selectedEvent.id]}</Markdown>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 py-4">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Analyzing local geology...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                          <div className="text-[10px] text-emerald-500 uppercase tracking-widest mb-2 font-mono">Global Tectonic Overview</div>
                          <p className="text-[10px] text-gray-400 leading-relaxed">
                            Current global activity is concentrated along the Pacific Ring of Fire and the Alpide belt. 
                            Subduction zones in the Western Pacific and the Cascadia region remain high-priority monitoring areas.
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-white/5 rounded-lg border border-white/5 text-center">
                            <div className="text-[8px] text-gray-500 uppercase">Active Faults</div>
                            <div className="text-xs font-mono text-gray-300">1,240+</div>
                          </div>
                          <div className="p-2 bg-white/5 rounded-lg border border-white/5 text-center">
                            <div className="text-[8px] text-gray-500 uppercase">Plate Boundary</div>
                            <div className="text-xs font-mono text-gray-300">Convergent</div>
                          </div>
                        </div>
                        <div className="py-4 text-center text-[10px] text-gray-500 border-t border-white/5">
                          Select an event on the map to see localized geological analysis.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'agent' && (
              <motion.div 
                key="agent"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-4xl mx-auto h-[calc(100vh-160px)] flex flex-col bg-white/5 rounded-3xl border border-white/5 overflow-hidden"
              >
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                      <Brain className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">SeismoAgent AI</div>
                      <div className="text-[10px] text-emerald-500 font-mono">ONLINE • READY TO ANALYZE</div>
                    </div>
                  </div>
                  <button className="text-xs text-gray-500 hover:text-white transition-colors">Clear History</button>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {chatMessages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                      <Brain className="w-16 h-16" />
                      <div className="max-w-xs">
                        <p className="text-sm">Ask me about seismic data, model tuning, or local risk analysis.</p>
                      </div>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-4 rounded-2xl ${
                        msg.role === 'user' 
                          ? 'bg-emerald-600 text-white rounded-tr-none' 
                          : 'bg-white/10 text-gray-200 rounded-tl-none border border-white/5'
                      }`}>
                        <div className="prose prose-invert prose-sm max-w-none">
                          <Markdown>{msg.content}</Markdown>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white/10 p-4 rounded-2xl rounded-tl-none border border-white/5 flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 bg-black/40 border-t border-white/5">
                  <div className="relative">
                    <input 
                      type="text" 
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Ask SeismoAgent..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-6 pr-14 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                    <button 
                      onClick={handleSendMessage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'build' && (
              <motion.div 
                key="build"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-5xl mx-auto space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-light">Auto-Model Builder</h2>
                    <p className="text-xs text-gray-500 mt-1">Design and train deep learning models from natural language descriptions.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-mono rounded-full border border-blue-500/20 uppercase">HDF5 INTEGRATED</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Configuration */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest">Dataset Path (HDF5)</label>
                        <input 
                          type="text" 
                          value={hdf5Path}
                          onChange={(e) => setHdf5Path(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest">Model Description</label>
                        <textarea 
                          value={modelDescription}
                          onChange={(e) => setModelDescription(e.target.value)}
                          className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-xs focus:outline-none leading-relaxed"
                          placeholder="Describe the model architecture and goals..."
                        />
                      </div>
                      <button 
                        onClick={handleBuildModel}
                        disabled={trainingStatus !== 'idle' && trainingStatus !== 'completed'}
                        className="w-full py-4 bg-emerald-500 text-black rounded-xl text-sm font-medium hover:bg-emerald-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {trainingStatus === 'designing' || trainingStatus === 'training' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        {trainingStatus === 'idle' ? 'Start Build Pipeline' : trainingStatus === 'completed' ? 'Rebuild Model' : 'Processing...'}
                      </button>
                    </div>

                    {modelDesign && (
                      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-6 space-y-4">
                        <h4 className="text-sm font-medium text-emerald-500 flex items-center gap-2">
                          <Cpu className="w-4 h-4" />
                          Architecture Summary
                        </h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-gray-500">Model Name</span>
                            <span className="text-gray-300">{modelDesign.name}</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-gray-500">Parameters</span>
                            <span className="text-gray-300">{modelDesign.parameters.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-[10px] text-gray-400 font-mono max-h-32 overflow-y-auto custom-scrollbar">
                          {modelDesign.architecture}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Training Logs & Report */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-black/40 border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[500px]">
                      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                        <h4 className="text-xs font-medium uppercase tracking-widest text-gray-400">Training Console</h4>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${trainingStatus === 'training' ? 'bg-amber-500 animate-pulse' : 'bg-gray-600'}`} />
                          <span className="text-[10px] text-gray-500 uppercase">{trainingStatus}</span>
                        </div>
                      </div>
                      <div className="flex-1 p-6 font-mono text-[10px] space-y-1 overflow-y-auto custom-scrollbar bg-black/20">
                        {trainingLogs.map((log, i) => (
                          <div key={i} className={log.startsWith('[AGENT]') ? 'text-emerald-500/80' : 'text-gray-400'}>
                            <span className="text-gray-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                            {log}
                          </div>
                        ))}
                        {trainingStatus === 'training' && (
                          <div className="text-amber-500 animate-pulse">_</div>
                        )}
                      </div>
                    </div>

                    {trainingReport && (
                      <div className="bg-white/5 border border-white/5 rounded-3xl p-8 space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <FileText className="w-5 h-5 text-blue-500" />
                          </div>
                          <h4 className="font-medium">Training & Debug Report</h4>
                        </div>
                        <div className="prose prose-invert prose-sm max-w-none">
                          <Markdown>{trainingReport}</Markdown>
                        </div>
                        <button 
                          onClick={() => setActiveTab('models')}
                          className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-xs hover:bg-white/10 transition-colors"
                        >
                          Proceed to Hyperparameter Tuning
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'analysis' && (
              <motion.div 
                key="analysis"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-light">Seismic Risk & Analysis Reports</h2>
                  <button 
                    onClick={runRiskAnalysis}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-black rounded-xl font-medium hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Brain className="w-5 h-5" />}
                    Generate New Analysis
                  </button>
                </div>

                {riskReport ? (
                  <div className="bg-white/5 border border-white/5 rounded-3xl p-10 prose prose-invert max-w-none shadow-2xl">
                    <Markdown>{riskReport}</Markdown>
                  </div>
                ) : (
                  <div className="h-[400px] flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-white/5 rounded-3xl">
                    <FileText className="w-12 h-12 mb-4 opacity-20" />
                    <p>No reports generated yet. Click the button above to start.</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'models' && (
              <motion.div 
                key="models"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
              >
                {/* Association Section */}
                <div className="bg-white/5 border border-white/5 rounded-3xl p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                        <Cpu className="w-6 h-6 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="font-medium">Event Association</h3>
                        <select 
                          value={associationAlgo} 
                          onChange={(e) => setAssociationAlgo(e.target.value as any)}
                          className="bg-transparent text-xs text-gray-500 focus:outline-none"
                        >
                          <option value="gamma">GaMma (GMM)</option>
                          <option value="real">REAL (Grid Search)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {associationAlgo === 'gamma' ? (
                        <>
                          <ParamCard label="DBSCAN EPS" value={associationParams?.dbscan_eps || 0.3} />
                          <ParamCard label="Min Samples" value={associationParams?.dbscan_min_samples || 3} />
                        </>
                      ) : (
                        <>
                          <ParamCard label="Grid Size" value={associationParams?.grid_size || 0.1} />
                          <ParamCard label="Threshold" value={associationParams?.threshold || 4} />
                        </>
                      )}
                    </div>
                    
                    <div className="p-4 bg-black/20 rounded-xl border border-white/5 space-y-3">
                      <div className="text-xs font-medium text-gray-400">Manual Phase Input</div>
                      <textarea 
                        value={manualPhaseData}
                        onChange={(e) => setManualPhaseData(e.target.value)}
                        placeholder="STA NET P/S TIME MAG..."
                        className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-xs font-mono focus:outline-none"
                      />
                      <button 
                        onClick={handleManualAssociation}
                        className="w-full py-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg text-xs hover:bg-amber-500/20 transition-all"
                      >
                        Run Association with Manual Data
                      </button>
                    </div>

                    <button 
                      onClick={tuneAssociation}
                      className="w-full py-4 bg-white/5 border border-white/10 rounded-xl text-sm hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                      Auto-Tune with AI
                    </button>
                  </div>
                </div>

                {/* Detection & Fine-tuning */}
                <div className="bg-white/5 border border-white/5 rounded-3xl p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Activity className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-medium">Phase Detection</h3>
                        <select 
                          value={detectionModel} 
                          onChange={(e) => setDetectionModel(e.target.value)}
                          className="bg-transparent text-xs text-gray-500 focus:outline-none"
                        >
                          <option value="PhaseNet-v2">PhaseNet v2</option>
                          <option value="EQTransformer">EQTransformer</option>
                          <option value="STA/LTA">STA/LTA (Classic)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-black/20 rounded-xl border border-white/5">
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-gray-500 uppercase tracking-widest">Detection Threshold</span>
                        <span className="text-blue-400 font-mono">{detectionThreshold}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.1" 
                        max="0.95" 
                        step="0.05" 
                        value={detectionThreshold}
                        onChange={(e) => setDetectionThreshold(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>

                    <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-500" />
                        <h4 className="text-sm font-medium">Model Fine-tuning & Data Processing</h4>
                      </div>
                      <p className="text-xs text-gray-500">Use the Agent to format raw picks into training data for {detectionModel}.</p>
                      
                      <div className="space-y-3">
                        <textarea 
                          value={trainingData}
                          onChange={(e) => setTrainingData(e.target.value)}
                          placeholder="Paste raw phase picks here (e.g. CSV, XML, or unstructured text)..."
                          className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-mono focus:outline-none"
                        />
                        <button 
                          onClick={processTrainingData}
                          disabled={isProcessingData || !trainingData}
                          className="w-full py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-xs hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                        >
                          {isProcessingData ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                          Format for Fine-tuning
                        </button>
                      </div>

                      {formattedData && (
                        <div className="space-y-2">
                          <div className="text-[10px] text-gray-500 uppercase">Formatted Output</div>
                          <pre className="p-3 bg-black/40 rounded-xl border border-white/5 text-[10px] font-mono overflow-x-auto max-h-40 custom-scrollbar">
                            {formattedData}
                          </pre>
                          <button 
                            onClick={startFineTuning}
                            disabled={isFineTuning}
                            className="w-full py-3 bg-blue-500 text-white rounded-xl text-sm hover:bg-blue-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {isFineTuning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                            {isFineTuning ? 'Fine-tuning...' : `Fine-tune ${detectionModel}`}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'knowledge' && (
              <motion.div 
                key="knowledge"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-12 gap-8"
              >
                <div className="col-span-12 lg:col-span-5 space-y-6">
                  <div className="bg-white/5 border border-white/5 rounded-3xl p-8 space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <Database className="w-6 h-6 text-emerald-500" />
                      </div>
                      <div>
                        <h3 className="font-medium">Flexible Dataset Builder</h3>
                        <p className="text-xs text-gray-500">Auto-analyze directory & build HDF5</p>
                      </div>
                    </div>

                    {datasetProcessingStatus === 'clarifying' && datasetAnalysis?.questions ? (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-4 p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl"
                      >
                        <div className="flex items-center gap-2 text-amber-500 mb-2">
                          <HelpCircle className="w-4 h-4" />
                          <h4 className="text-sm font-medium">Clarification Needed</h4>
                        </div>
                        {datasetAnalysis.questions.map((q, i) => (
                          <div key={i} className="space-y-2">
                            <label className="text-[10px] text-gray-400 font-mono">{q}</label>
                            <input 
                              type="text"
                              value={clarificationAnswers[q] || ''}
                              onChange={(e) => setClarificationAnswers(prev => ({ ...prev, [q]: e.target.value }))}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-500/50"
                              placeholder="Your answer..."
                            />
                          </div>
                        ))}
                        <button 
                          onClick={handleClarificationSubmit}
                          className="w-full py-3 bg-amber-500 text-black rounded-xl font-medium hover:bg-amber-400 transition-all"
                        >
                          Submit Clarification
                        </button>
                      </motion.div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] text-gray-500 uppercase tracking-widest">Directory Path</label>
                          <input 
                            type="text" 
                            value={datasetDirectory}
                            onChange={(e) => setDatasetDirectory(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none font-mono"
                            placeholder="/path/to/your/data"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] text-gray-500 uppercase tracking-widest">Description & Instructions</label>
                          <textarea 
                            value={datasetDescription}
                            onChange={(e) => setDatasetDescription(e.target.value)}
                            className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none"
                            placeholder="Describe the directory structure, file naming conventions, or specific phase report formats..."
                          />
                        </div>
                        <button 
                          onClick={handleProcessDirectory}
                          disabled={datasetProcessingStatus !== 'idle' && datasetProcessingStatus !== 'completed'}
                          className="w-full py-4 bg-emerald-500 text-black rounded-xl font-medium hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                        >
                          {datasetProcessingStatus === 'idle' || datasetProcessingStatus === 'completed' ? (
                            <>
                              <Zap className="w-4 h-4" />
                              Start Pipeline
                            </>
                          ) : (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Processing...
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {datasetAnalysis && (
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4">
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Guessed File Roles</div>
                      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                        {datasetAnalysis.files.map((file, i) => (
                          <div key={i} className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-gray-300 truncate max-w-[150px]">{file.path}</span>
                              <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase font-mono ${
                                file.guessedRole === 'phase_report' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                file.guessedRole === 'waveform' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                file.guessedRole === 'station_info' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                              }`}>
                                {file.guessedRole}
                              </span>
                            </div>
                            <div className="text-[9px] text-gray-500 italic">{file.reasoning}</div>
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${file.confidence > 0.8 ? 'bg-emerald-500' : file.confidence > 0.5 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${file.confidence * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {hdf5OutputPath && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-500">
                        <AlertTriangle className="w-4 h-4" />
                        <h4 className="text-sm font-medium">Dataset Ready</h4>
                      </div>
                      <div className="p-3 bg-black/40 rounded-xl border border-white/5 font-mono text-[10px] break-all">
                        {hdf5OutputPath}
                      </div>
                      <button 
                        onClick={() => setActiveTab('build')}
                        className="w-full py-2 bg-emerald-500 text-black rounded-lg text-xs font-medium hover:bg-emerald-400 transition-colors"
                      >
                        Use in Model Builder
                      </button>
                    </div>
                  )}

                  <div className="bg-white/5 border border-white/5 rounded-3xl p-8 space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Download className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-medium">External Data Import</h3>
                        <p className="text-xs text-gray-500">Import from FDSN or Cloud Storage</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest">Source URL</label>
                        <input 
                          type="text" 
                          value={importUrl}
                          onChange={(e) => setImportUrl(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none font-mono"
                          placeholder="https://fdsn.example.com/query..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest">Import Context</label>
                        <textarea 
                          value={importDescription}
                          onChange={(e) => setImportDescription(e.target.value)}
                          className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none"
                          placeholder="Describe the data source and what you want to extract..."
                        />
                      </div>
                      <button 
                        onClick={handleExternalImport}
                        disabled={isImporting}
                        className="w-full py-4 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-400 transition-all flex items-center justify-center gap-2"
                      >
                        {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                        Plan External Import
                      </button>
                    </div>
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-7">
                  <div className="bg-black/40 border border-white/5 rounded-3xl h-[600px] flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                      <div className="text-[10px] uppercase tracking-widest text-gray-500 font-mono">Processing Logs</div>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500/50" />
                        <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                        <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                      </div>
                    </div>
                    <div className="flex-1 p-6 font-mono text-xs overflow-y-auto custom-scrollbar space-y-2">
                      {datasetLogs.length === 0 && (
                        <div className="h-full flex items-center justify-center text-gray-600 italic">
                          Waiting for pipeline to start...
                        </div>
                      )}
                      {datasetLogs.map((log, i) => (
                        <div key={i} className={`${log.startsWith('[AGENT]') ? 'text-emerald-400' : 'text-gray-400'}`}>
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'cli' && (
              <motion.div 
                key="cli"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-4xl mx-auto h-[calc(100vh-160px)] flex flex-col bg-black rounded-3xl border border-white/10 overflow-hidden font-mono"
              >
                <div className="p-4 border-b border-white/10 flex items-center gap-2 bg-white/5">
                  <Terminal className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-gray-400">SeismoAgent CLI v1.0.0</span>
                </div>
                
                <div ref={cliScrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-black/50">
                  <div className="text-emerald-500/60 text-xs">
                    Welcome to SeismoAgent CLI. Type /help for available commands.
                  </div>
                  {cliHistory.map((item, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-500">$</span>
                        <span className="text-white text-sm">{item.cmd}</span>
                      </div>
                      <div className="pl-4 border-l border-white/10 text-gray-400 text-xs leading-relaxed">
                        <Markdown>{item.resp}</Markdown>
                      </div>
                    </div>
                  ))}
                  {isCliProcessing && (
                    <div className="flex items-center gap-2 text-emerald-500/50 text-xs">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Processing command...
                    </div>
                  )}
                </div>

                <form onSubmit={handleCliSubmit} className="p-4 bg-white/5 border-t border-white/10 flex items-center gap-3">
                  <span className="text-emerald-500 font-bold">$</span>
                  <input 
                    type="text"
                    value={cliCommand}
                    onChange={(e) => setCliCommand(e.target.value)}
                    className="flex-1 bg-transparent border-none focus:outline-none text-emerald-400 text-sm placeholder:text-emerald-900"
                    placeholder="Enter command..."
                    autoFocus
                  />
                </form>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-3xl mx-auto space-y-8"
              >
                {/* AI Provider Config */}
                <div className="bg-white/5 border border-white/5 rounded-3xl p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                      <Brain className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="font-medium">AI Provider Configuration</h3>
                      <p className="text-xs text-gray-500">Connect to Gemini, OpenAI, Claude, Ollama, or vLLM</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {providerOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => handleProviderChange(option.value)}
                        className={`py-3 rounded-xl border text-xs font-medium transition-all uppercase ${
                          aiConfig.provider === option.value 
                            ? 'bg-emerald-500 text-black border-emerald-500' 
                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 uppercase tracking-widest">Model Name</label>
                      <input 
                        type="text" 
                        value={aiConfig.model}
                        onChange={(e) => setAiConfig({...aiConfig, model: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none"
                        placeholder={currentProviderOption.model ? `e.g. ${currentProviderOption.model}` : 'Enter model name'}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 uppercase tracking-widest">API Key</label>
                      <input
                        type="password"
                        value={aiConfig.apiKey || ''}
                        onChange={(e) => setAiConfig({...aiConfig, apiKey: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none"
                        placeholder={currentProviderOption.apiKeyPlaceholder}
                      />
                    </div>
                    {aiConfig.provider !== 'gemini' && (
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest">Base URL</label>
                        <input 
                          type="text" 
                          value={aiConfig.baseUrl}
                          onChange={(e) => setAiConfig({...aiConfig, baseUrl: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none"
                          placeholder={providerBaseUrlHints[aiConfig.provider].placeholder || 'Enter base URL'}
                        />
                        <p className="text-[11px] text-gray-500">{providerBaseUrlHints[aiConfig.provider].help}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Algorithm Settings */}
                <div className="bg-white/5 border border-white/5 rounded-3xl p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                      <Settings className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-medium">Algorithm Preferences</h3>
                      <p className="text-xs text-gray-500">Configure location and detection defaults</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 uppercase tracking-widest">Location Algorithm</label>
                      <select 
                        value={locationAlgo}
                        onChange={(e) => setLocationAlgo(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none"
                      >
                        <option value="HypoInverse">HypoInverse</option>
                        <option value="Hypo71">Hypo71</option>
                        <option value="NonLinLoc">NonLinLoc</option>
                        <option value="BayesLoc">BayesLoc</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 uppercase tracking-widest">Association Algorithm</label>
                      <select 
                        value={associationAlgo}
                        onChange={(e) => setAssociationAlgo(e.target.value as any)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none"
                      >
                        <option value="gamma">GaMma (GMM)</option>
                        <option value="real">REAL (Grid Search)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 uppercase tracking-widest">Geological Analysis</label>
                      <div className="flex items-center gap-2 py-3">
                        <input type="checkbox" defaultChecked className="w-4 h-4 accent-emerald-500" />
                        <span className="text-xs text-gray-400">Auto-analyze on detection</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, active, onClick, label }: { icon: React.ReactNode, active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`group relative p-3 rounded-xl transition-all duration-300 ${
        active 
          ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
          : 'text-gray-500 hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      <span className="absolute left-full ml-4 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10">
        {label}
      </span>
    </button>
  );
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className="w-full flex items-center gap-3 p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 hover:border-white/10 transition-all text-left group cursor-pointer active:scale-[0.98]"
    >
      <div className="p-2 bg-black/20 rounded-lg text-gray-400 group-hover:text-emerald-500 transition-colors pointer-events-none">
        {icon}
      </div>
      <span className="text-sm font-medium pointer-events-none">{label}</span>
      <ChevronRight className="w-4 h-4 ml-auto text-gray-600 group-hover:text-white transition-colors pointer-events-none" />
    </button>
  );
}

function ParamCard({ label, value }: { label: string, value: any }) {
  return (
    <div className="p-4 bg-black/20 rounded-xl border border-white/5">
      <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-lg font-mono text-amber-500">{value}</div>
    </div>
  );
}
