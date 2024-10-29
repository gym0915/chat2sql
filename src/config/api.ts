export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const API_ENDPOINTS = {
  DATABASE_CONNECT: `${API_BASE_URL}/connect`,  // 修改为实际的路径
};

// 添加日志工具
export const logAPI = {
  request: (endpoint: string, data: any) => {
    console.log(`[API Request] ${endpoint}:`, data);
  },
  response: (endpoint: string, data: any) => {
    console.log(`[API Response] ${endpoint}:`, data);
  },
  error: (endpoint: string, error: any) => {
    console.error(`[API Error] ${endpoint}:`, error);
  }
};
