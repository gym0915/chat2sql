/**
 * 模型来源枚举
 */
export enum ModelSource {
  OLLAMA = 'Ollama',
  HUGGINGFACE = 'HuggingFace'
}

/**
 * 模型配置接口
 */
export interface ModelConfig {
  source: ModelSource;
  endpoint: string;
  models?: string[]; // Ollama 可以动态获取模型列表
  defaultModel?: string;
}

/**
 * 模型配置
 */
export const modelConfigs: ModelConfig[] = [
  {
    source: ModelSource.OLLAMA,
    endpoint: 'http://localhost:11434/api',
  },
  {
    source: ModelSource.HUGGINGFACE, 
    endpoint: 'https://huggingface.co/api',
    models: ['gpt2', 'bloom', 'opt'], // 可以预设一些模型
    defaultModel: 'gpt2'
  }
]; 