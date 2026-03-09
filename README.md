# SeismicXAgent Documentation

SeismicXAgent is an advanced AI-powered seismic monitoring and analysis platform that integrates real-time data acquisition, deep learning phase detection, event association parameter tuning, and seismic risk assessment.

## Getting Started

### 1. Environment Preparation
- **Node.js**: Ensure Node.js (v18+ recommended) is installed on your system.
- **Python (Optional)**: For real data processing using `obspy` and `miniseedindex`, it is recommended to install the corresponding Python libraries in your background environment.

### 2. Install Dependencies
Run the following command in the project root directory to install frontend and backend dependencies:
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root directory and configure your Gemini API Key (or other AI provider keys):
```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```
*Note: If using local Ollama or vLLM, configure the Base URL in the app's Config page; no need to set it here.*

### 4. Start Development Server
Run the following command to start the full-stack development environment (including Express backend and Vite frontend):
```bash
npm run dev
```
After starting, you can access `http://localhost:3000` in your browser.

### 5. Production Deployment
To deploy to a production environment, follow these steps:
1. **Build Frontend Assets**:
   ```bash
   npm run build
   ```
2. **Start Production Server**:
   ```bash
   NODE_ENV=production npm start
   ```
   The system will automatically load static assets from the `dist` directory and start the API service.

---

## Core Functional Modules

### 1. Real-time Seismic Monitoring (Dashboard)
- **Global Map View**: Real-time display of global seismic activity over the past 7 days. Circle size represents magnitude, and color represents danger level (red for strong earthquakes).
- **Multi-objective System Optimization**: A new "Agent System Optimization" feature in Quick Actions allows users to select optimization targets:
  - **Recall**: Aims to detect as many small earthquakes as possible.
  - **Precision**: Aims to reduce false positives, ensuring high confidence in every detected event.
  - **Balanced**: Balances recall and precision for routine monitoring.
- **Association Algorithm Selection**: Users can choose association algorithms (e.g., GaMma or REAL) in settings, and the Agent will perform full-process parameter tuning for the selected algorithm.
- **Automatic Geological Analysis**: When a significant earthquake (M > 4.5) is clicked or detected, the system automatically triggers AI for regional geological analysis (fault systems, lithology, secondary hazards), displayed in real-time in the right panel.

### 2. AI Intelligent Assistant (Agent)
- **Multi-model and Local Access**: Supports Gemini, local Ollama, or vLLM (OpenAI compatible interface).
- **Flexible Configuration**: Customize API Provider, Base URL, and Model Name on the settings page.
- **Training Data Processing**: The Agent can automatically convert raw phase picking data (e.g., CSV, XML, or unstructured text) into training formats suitable for models like PhaseNet or EQTransformer.

### 3. Automated Model Building (Build)
- **HDF5 Dataset Integration**: Supports integration with unified HDF5 datasets built by [seismo-ai-tools](https://github.com/cangyeone/seismological-ai-tools/tree/main/hdf5-dataset-tools).
- **Natural Language Modeling**: Simply input your requirements (e.g., "Build a Transformer-based phase detection and epicentral distance estimation model"), and the Agent will automatically design the network architecture, loss functions, and training strategy.
- **Fully Automated Training Pipeline**:
  - **Auto Design**: AI generates detailed hierarchical architectures.
  - **Auto Training**: Connects to the dataset and starts the training process.
  - **Auto Reporting & Debugging**: Automatically generates professional reports containing performance analysis and debugging suggestions after training.
- **Closed-loop Optimization**: Once the model is built, you can jump directly to the Models page for hyperparameter fine-tuning and actual deployment with the Agent.

### 4. Automated Dataset Building (Data)
- **Directory Deep Analysis**: Provide a data directory and simple description, and the Agent will automatically identify phase reports (.ctlg, .hyp, etc.) and raw waveform data (.mseed, .sac, etc.).
- **Smart Structure Inference**: Automatically infers file structures and column definitions of phase reports.
- **Professional Toolchain Integration**: Uses **Obspy** to read waveforms and **miniseedindex** to create efficient indexes.
- **Unified HDF5 Output**: Automatically integrates scattered data into a unified HDF5 dataset conforming to `seismo-ai-tools` standards, directly connecting to the model building process.

### 5. Models & Algorithms (Models)
- **Association Algorithm Extension**: Supports GaMma (GMM) and REAL (Grid Search) association algorithms.
- **Manual Phase Input**: Supports inputting phase arrival times, epicentral distance, and azimuth estimates for manual association.
- **Detection Threshold Adjustment**: Real-time adjustment of PhaseNet/EQTransformer detection thresholds.
- **Model Fine-tuning**: Provides a fine-tuning interface, supporting optimization of detection models using labeled data processed by the Agent to adapt to specific regional geological features.

### 6. Risk Reports (Reports)
- **Deep Geological Reports**: Combines historical earthquake data and regional tectonic background to produce detailed risk assessment reports.

---

## Contact Information
For any inquiries or support, please contact:
**yuziye@cea-igp.ac.cn**

---
*Note: This system is a research and monitoring auxiliary tool. For earthquake early warning, please refer to official information.*
