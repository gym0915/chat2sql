/**
 * 模型来源枚举
 */
export enum ModelSource {
  OLLAMA = 'Ollama',
  HUGGINGFACE = 'HuggingFace'
}

/**
 * 模型选项接口
 */
export interface ModelOption {
  source: ModelSource;
  models: string[];
}

/**
 * 选中模型接口
 */
export interface SelectedModel {
  source: ModelSource;
  model: string;
} 