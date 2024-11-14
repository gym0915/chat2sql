/**
 * 模型来源枚举
 */
export enum ModelSource {
  OLLAMA = 'Ollama',
  // 预留其他模型来源
  // OPENAI = 'OpenAI',
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