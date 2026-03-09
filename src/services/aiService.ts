import { GoogleGenAI, Type } from "@google/genai";

export interface SeismicEvent {
  id: string;
  time: string;
  latitude: number;
  longitude: number;
  depth: number;
  magnitude: number;
  place: string;
  geology?: string;
}

export interface AIConfig {
  provider: 'gemini' | 'ollama' | 'vllm';
  model: string;
  baseUrl?: string;
  apiKey?: string;
}

const getAIClient = (config: AIConfig) => {
  if (config.provider === 'gemini') {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || config.apiKey || "" });
  }
  // For Ollama/vLLM, we'll use fetch directly or a generic OpenAI-compatible pattern
  return null;
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const withRetry = async <T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRateLimit = error.message?.includes('429') || error.status === 429 || error.message?.includes('RESOURCE_EXHAUSTED');
      if (isRateLimit && i < maxRetries - 1) {
        const waitTime = Math.pow(2, i) * 1000 + Math.random() * 1000;
        console.warn(`Rate limit hit, retrying in ${Math.round(waitTime)}ms... (Attempt ${i + 1}/${maxRetries})`);
        await delay(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

export const callAI = async (prompt: string, config: AIConfig, isJson: boolean = false, schema?: any) => {
  return withRetry(async () => {
    if (config.provider === 'gemini') {
      const ai = getAIClient(config);
      if (!ai) throw new Error("AI Client not initialized");
      
      const response = await ai.models.generateContent({
        model: config.model,
        contents: prompt,
        config: isJson ? {
          responseMimeType: "application/json",
          responseSchema: schema,
        } : undefined,
      });
      return isJson ? JSON.parse(response.text) : response.text;
    } else {
      // Ollama / vLLM (OpenAI compatible)
      const url = config.baseUrl || (config.provider === 'ollama' ? 'http://localhost:11434/v1' : 'http://localhost:8000/v1');
      const response = await fetch(`${url}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey || 'no-key'}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: prompt }],
          response_format: isJson ? { type: 'json_object' } : undefined
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.error?.message || `AI Request failed with status ${response.status}`);
        (error as any).status = response.status;
        throw error;
      }

      const data = await response.json();
      const text = data.choices[0].message.content;
      return isJson ? JSON.parse(text) : text;
    }
  });
};

export const analyzeSeismicRisk = async (location: string, history: SeismicEvent[], config: AIConfig) => {
  const prompt = `
    As a seismological expert agent, analyze the seismic risk and regional geology for: ${location}.
    Historical data: ${JSON.stringify(history)}
    
    Please provide:
    1. Historical activity summary.
    2. Detailed regional geological analysis (fault systems, lithology).
    3. Tectonic setting.
    4. Risk level and recommendations.
    
    Format as Markdown.
  `;
  return callAI(prompt, config);
};

export const suggestAssociationParams = async (algo: 'gamma' | 'real', networkDensity: string, noiseLevel: string, config: AIConfig) => {
  const prompt = `
    Suggest optimal parameters for the ${algo.toUpperCase()} earthquake association algorithm given:
    - Network Density: ${networkDensity}
    - Noise Level: ${noiseLevel}
    
    Return JSON:
    ${algo === 'gamma' ? 
      '{ "dbscan_eps": number, "dbscan_min_samples": number, "min_picks": number }' : 
      '{ "grid_size": number, "threshold": number, "max_dt": number }'}
  `;
  
  const schema = {
    type: Type.OBJECT,
    properties: algo === 'gamma' ? {
      dbscan_eps: { type: Type.NUMBER },
      dbscan_min_samples: { type: Type.INTEGER },
      min_picks: { type: Type.INTEGER },
    } : {
      grid_size: { type: Type.NUMBER },
      threshold: { type: Type.NUMBER },
      max_dt: { type: Type.NUMBER },
    }
  };

  return callAI(prompt, config, true, schema);
};

export const optimizeSystem = async (currentSettings: any, config: AIConfig, target: 'recall' | 'precision' | 'balanced' = 'recall') => {
  const prompt = `
    As a seismological system architect, optimize the entire detection and association pipeline.
    The PRIMARY GOAL is to optimize for: ${target.toUpperCase()}.
    ${target === 'recall' ? 'Maximize RECALL (detect as many events as possible) and minimize the MINIMUM DETECTABLE MAGNITUDE.' : ''}
    ${target === 'precision' ? 'Maximize PRECISION (minimize false positives) and ensure high confidence in every detected event.' : ''}
    ${target === 'balanced' ? 'Balance RECALL and PRECISION for a stable monitoring environment.' : ''}
    
    Current Settings: ${JSON.stringify(currentSettings)}
    
    Please suggest optimized values for:
    1. Association parameters (for ${currentSettings.associationAlgo}) - focus on ${target}.
    2. Detection threshold (0.0 to 1.0) - adjust for ${target}.
    3. Recommended detection model (e.g., PhaseNet-v2, EQTransformer).
    4. Recommended location algorithm.
    
    Return the results in JSON format with the following structure:
    {
      "associationParams": object,
      "detectionThreshold": number,
      "detectionModel": string,
      "locationAlgo": string,
      "reasoning": string,
      "estimatedImprovement": string
    }
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      associationParams: { type: Type.OBJECT },
      detectionThreshold: { type: Type.NUMBER },
      detectionModel: { type: Type.STRING },
      locationAlgo: { type: Type.STRING },
      reasoning: { type: Type.STRING },
      estimatedImprovement: { type: Type.STRING }
    },
    required: ["associationParams", "detectionThreshold", "detectionModel", "locationAlgo", "reasoning", "estimatedImprovement"]
  };

  return callAI(prompt, config, true, schema);
};

export const designModelArchitecture = async (description: string, config: AIConfig) => {
  const prompt = `
    As a deep learning expert in seismology, design a model architecture based on this description: "${description}".
    The model should be compatible with HDF5 datasets generated by the seismo-ai-tools.
    
    Provide:
    1. Layer-by-layer architecture (e.g., Transformer blocks, CNN layers).
    2. Loss functions (e.g., CrossEntropy for phases, MSE for distance).
    3. Training strategy (optimizer, scheduler).
    4. Data augmentation techniques for seismic waveforms.
    
    Return JSON:
    {
      "name": string,
      "architecture": string,
      "parameters": number,
      "trainingPlan": string
    }
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      architecture: { type: Type.STRING },
      parameters: { type: Type.NUMBER },
      trainingPlan: { type: Type.STRING }
    },
    required: ["name", "architecture", "parameters", "trainingPlan"]
  };

  return callAI(prompt, config, true, schema);
};

export const generateTrainingReport = async (logs: string, config: AIConfig) => {
  const prompt = `
    Analyze the following training logs and generate a professional training report.
    Identify any issues (overfitting, vanishing gradients, etc.) and provide debugging suggestions.
    
    Logs:
    ${logs}
    
    Format as Markdown.
  `;
  return callAI(prompt, config);
};

export const performGeologicalAnalysis = async (event: SeismicEvent, config: AIConfig) => {
  const prompt = `
    Analyze the local geology for the earthquake event:
    Location: ${event.place} (${event.latitude}, ${event.longitude})
    Magnitude: ${event.magnitude}
    
    Identify nearby active faults, soil types, and potential for secondary hazards like liquefaction or landslides.
    Format as a concise Markdown report.
  `;
  return callAI(prompt, config);
};

export const formatTrainingData = async (rawData: string, targetFormat: string, config: AIConfig) => {
  const prompt = `
    As a seismological data engineer, convert the following raw seismic phase data into the ${targetFormat} format.
    The output should be ready for fine-tuning a phase picker like PhaseNet or EQTransformer.
    
    Raw Data:
    ${rawData}
    
    Target Format: ${targetFormat}
    
    Please ensure:
    1. Timestamps are ISO8601.
    2. Phase labels (P/S) are clear.
    3. SNR or probability values are included if available.
    
    Return only the formatted data block.
  `;
  return callAI(prompt, config);
};

export interface DatasetAnalysis {
  analysis: string;
  files: {
    path: string;
    guessedRole: 'phase_report' | 'waveform' | 'station_info' | 'unknown';
    confidence: number;
    reasoning: string;
  }[];
  questions?: string[];
  indexingStrategy: string;
  hdf5Structure: string;
  estimatedSize: string;
}

export const analyzeDatasetStructure = async (directory: string, fileList: string[], description: string, config: AIConfig): Promise<DatasetAnalysis> => {
  const prompt = `
    As a seismological data expert, analyze the following files found in the directory "${directory}".
    User Description: "${description}"
    
    File List:
    ${fileList.join('\n')}
    
    Tasks:
    1. For each file, guess its role: 'phase_report', 'waveform', 'station_info', or 'unknown'.
    2. Provide a confidence score (0-1) and reasoning for each guess.
    3. If any file format is ambiguous or the structure of a phase report is unclear, generate specific questions to ask the user.
    4. Propose an HDF5 structure and indexing strategy.
    
    Return JSON:
    {
      "analysis": "Overall summary of the dataset",
      "files": [
        { "path": "string", "guessedRole": "string", "confidence": number, "reasoning": "string" }
      ],
      "questions": ["string"],
      "indexingStrategy": "string",
      "hdf5Structure": "string",
      "estimatedSize": "string"
    }
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      analysis: { type: Type.STRING },
      files: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            path: { type: Type.STRING },
            guessedRole: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
          },
          required: ["path", "guessedRole", "confidence", "reasoning"]
        }
      },
      questions: { type: Type.ARRAY, items: { type: Type.STRING } },
      indexingStrategy: { type: Type.STRING },
      hdf5Structure: { type: Type.STRING },
      estimatedSize: { type: Type.STRING }
    },
    required: ["analysis", "files", "indexingStrategy", "hdf5Structure", "estimatedSize"]
  };

  return callAI(prompt, config, true, schema);
};

export const importExternalData = async (sourceUrl: string, description: string, config: AIConfig) => {
  const prompt = `
    As a seismological data engineer, analyze the external data source: "${sourceUrl}".
    User Description: "${description}"
    
    Tasks:
    1. Determine the data type (FDSN, HTTP file, Cloud Storage).
    2. Propose a download and ingestion strategy.
    3. Outline how to integrate this into the current HDF5 pipeline.
    
    Return JSON:
    {
      "sourceType": "string",
      "ingestionPlan": "string",
      "estimatedComplexity": "string",
      "suggestedTools": ["string"]
    }
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      sourceType: { type: Type.STRING },
      ingestionPlan: { type: Type.STRING },
      estimatedComplexity: { type: Type.STRING },
      suggestedTools: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["sourceType", "ingestionPlan", "estimatedComplexity", "suggestedTools"]
  };

  return callAI(prompt, config, true, schema);
};

export const processCLICommand = async (command: string, context: any, config: AIConfig) => {
  const prompt = `
    You are a SeismoAgent CLI processor. Execute the following command: "${command}"
    Current System Context: ${JSON.stringify(context)}
    
    Available Commands:
    - /analyze [event_id]: Analyze a specific event.
    - /optimize [target]: Run system optimization (recall/precision/balanced).
    - /build [description]: Design a model architecture.
    - /import [url]: Plan an external data import.
    - /status: Show system status.
    
    If the command is recognized, return a structured response.
    If not, treat it as a general query about the system.
    
    Return JSON:
    {
      "action": "string",
      "response": "string",
      "data": any
    }
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      action: { type: Type.STRING },
      response: { type: Type.STRING },
      data: { type: Type.NULL } // data can be any object, but for schema we'll keep it simple
    },
    required: ["action", "response"]
  };

  return callAI(prompt, config, true, schema);
};

export const processDirectoryForHDF5 = async (directory: string, description: string, config: AIConfig) => {
  const prompt = `
    As a seismological data engineer, analyze the directory "${directory}" based on this description: "${description}".
    
    Tasks:
    1. Identify which files are seismic phase reports (e.g., .ctlg, .hyp, .txt) and which are raw waveform data (e.g., .mseed, .sac).
    2. Infer the structure of the phase reports (column headers, delimiters).
    3. Plan the indexing strategy using miniseedindex and Obspy.
    4. Outline the steps to consolidate everything into a unified HDF5 dataset compatible with seismo-ai-tools.
    
    Return JSON:
    {
      "analysis": string,
      "phaseFiles": string[],
      "dataFiles": string[],
      "indexingStrategy": string,
      "hdf5Structure": string,
      "estimatedSize": string
    }
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      analysis: { type: Type.STRING },
      phaseFiles: { type: Type.ARRAY, items: { type: Type.STRING } },
      dataFiles: { type: Type.ARRAY, items: { type: Type.STRING } },
      indexingStrategy: { type: Type.STRING },
      hdf5Structure: { type: Type.STRING },
      estimatedSize: { type: Type.STRING }
    },
    required: ["analysis", "phaseFiles", "dataFiles", "indexingStrategy", "hdf5Structure", "estimatedSize"]
  };

  return callAI(prompt, config, true, schema);
};
