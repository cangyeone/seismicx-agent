# SeismicXAgent 使用说明文档

SeismicXAgent 是一款基于 AI 的高级地震监测与分析平台，集成了实时数据采集、深度学习震相检测、事件关联调参以及地震风险评估功能。

## 如何启动运行 (Getting Started)

### 1. 环境准备
- **Node.js**: 确保您的系统中安装了 Node.js (建议 v18+)。
- **Python (可选)**: 若要使用 `obspy` 和 `miniseedindex` 进行真实的数据处理，建议在后台环境中安装相应的 Python 库。

### 2. 安装依赖
在项目根目录下运行以下命令安装前端与后端的依赖包：
```bash
npm install
```

### 3. 配置环境变量
在项目根目录下创建一个 `.env` 文件，并配置您的 Gemini API Key（或其他 AI 提供商的 Key）：
```env
GEMINI_API_KEY=您的_GEMINI_API_密钥
```
*注意：若使用本地 Ollama 或 vLLM，请在应用的 Config 页面中配置 Base URL，无需在此设置。*

### 4. 启动开发服务器
运行以下命令启动全栈开发环境（包含 Express 后端和 Vite 前端）：
```bash
npm run dev
```
启动后，您可以在浏览器中访问 `http://localhost:3000`。

### 5. 生产环境部署
若要部署到生产环境，请执行以下步骤：
1. **构建前端资源**：
   ```bash
   npm run build
   ```
2. **启动生产服务器**：
   ```bash
   NODE_ENV=production npm start
   ```
   系统将自动加载 `dist` 目录下的静态资源，并启动 API 服务。

---

## 核心功能模块

### 1. 实时地震监测 (Dashboard)
- **全球地图视图**：实时展示过去 7 天内的全球地震活动。圆圈大小代表震级，颜色代表危险程度（红色为强震）。
- **多目标全系统优化**：在 Quick Actions 中，新增了“Agent System Optimization”。用户可以根据需求选择优化目标：
  - **Recall (查全率)**：旨在尽可能多地检测到微小地震。
  - **Precision (查准率)**：旨在减少误报，确保每个检测到的事件都有极高可信度。
  - **Balanced (平衡)**：在查全率与查准率之间取得平衡，适用于常规监测。
- **关联算法选择**：用户可以在设置中自由选择关联算法（如 GaMma 或 REAL），Agent 会针对所选算法进行全流程参数调优。
- **自动地质分析**：当点击或检测到显著地震（M > 4.5）时，系统会自动触发 AI 进行区域地质分析（断层系统、岩性、次生灾害），并在右侧面板实时展示。

### 2. AI 智能助手 (Agent)
- **多模型与本地接入**：支持接入 Gemini、本地 Ollama 或 vLLM (OpenAI 兼容接口)。
- **灵活配置**：在设置页面可自定义 API Provider、Base URL 和模型名称。
- **训练数据处理**：Agent 可以将原始的震相拾取数据（如 CSV、XML 或非结构化文本）自动转换为适用于 PhaseNet 或 EQTransformer 等模型的训练格式。

### 3. 自动化模型构建 (Build)
- **HDF5 数据集对接**：支持对接由 [seismo-ai-tools](https://github.com/cangyeone/seismological-ai-tools/tree/main/hdf5-dataset-tools) 构建的统一 HDF5 数据集。
- **自然语言建模**：只需输入您的需求（例如：“构建一个基于 Transformer 的震相检测和震中距估计模型”），Agent 会自动设计网络架构、损失函数和训练策略。
- **全自动训练流水线**：
  - **自动设计**：AI 生成详细的层级架构。
  - **自动训练**：对接数据集并开始训练过程。
  - **自动报告与 DEBUG**：训练结束后自动生成包含性能分析和调试建议的专业报告。
- **闭环优化**：模型构建完成后，可直接跳转至 Models 页面，结合 Agent 进行超参数微调和实际部署。

### 4. 自动化数据集构建 (Data)
- **目录深度分析**：只需提供数据目录和简单说明，Agent 即可自动识别震相报告（.ctlg, .hyp 等）与原始波形数据（.mseed, .sac 等）。
- **智能结构推断**：自动推断震相报告的文件结构和列定义。
- **专业工具链集成**：利用 **Obspy** 读取波形，并使用 **miniseedindex** 制作高效索引。
- **统一 HDF5 输出**：将分散的数据自动整合为符合 `seismo-ai-tools` 标准的统一 HDF5 数据集，直接对接模型构建流程。

### 5. 模型与算法 (Models)
- **关联算法扩展**：支持 GaMma (GMM) 和 REAL (Grid Search) 关联算法。
- **手动震相输入**：支持输入震相到时、震中距方位角估计等数据进行手动关联。
- **检测阈值调节**：实时调节 PhaseNet/EQTransformer 的检测阈值。
- **模型微调 (Fine-tuning)**：提供模型微调界面，支持通过 Agent 处理后的标注数据优化检测模型，以适应特定区域的地质特征。

### 4. 风险报告 (Reports)
- **深度地质报告**：结合历史地震数据和区域构造背景，产出详细的风险评估报告。

## 如何设置 AI 模型与本地接入

SeismoAgent 支持灵活的 AI 接入方式：

1. 点击左侧导航栏底部的 **Config (设置)** 图标。
2. **AI Provider Configuration**：
   - **Gemini**：使用 Google Gemini API。
   - **Ollama / vLLM**：支持本地部署的模型。需填写 **Base URL** (例如 `http://localhost:11434/v1`) 和 **Model Name** (例如 `llama3`)。
3. **算法偏好**：
   - 可选择定位算法（HypoInverse, NonLinLoc, BayesLoc 等）。
   - 开启“自动地质分析”功能。

## 技术架构说明
- **数据源**：实时接入 USGS FDSN Web Service。
- **后端**：使用 Node.js (Express) + SQLite 存储本地知识库。
- **AI 引擎**：基于 Google Gemini 系列模型。

---

## 联系方式 (Contact Information)
如有任何疑问或支持需求，请联系：
**yuziye@cea-igp.ac.cn**

---
*注意：本系统为科研与监测辅助工具，地震预警请以官方发布信息为准。*
