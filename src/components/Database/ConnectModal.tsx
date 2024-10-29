import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS, logAPI } from '@/config/api';  // 导入API配置

// 添加 props 类型定义
interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect?: (data: { connectionId: string; databases: string[] }) => void;
}

// 定义存储在 localStorage 中的数据类型
interface SavedConnection {
  host: string;
  user: string;
  password: string;
  port: string;
}

export const ConnectModal = ({ isOpen, onClose, onConnect }: ConnectModalProps) => {
  // 添加记住密码的状态
  const [rememberConnection, setRememberConnection] = useState(false);
  
  const [formData, setFormData] = useState({
    host: 'localhost',     // 改为 host
    user: 'root',         // 改为 user
    password: '',
    port: '3306'
  });

  // 组件加载时，尝试从 localStorage 读取保存的连接信息
  useEffect(() => {
    const savedConnection = localStorage.getItem('savedDatabaseConnection');
    if (savedConnection) {
      try {
        const parsed = JSON.parse(savedConnection) as SavedConnection;
        setFormData(parsed);
        setRememberConnection(true);
      } catch (error) {
        console.error('Failed to parse saved connection:', error);
      }
    }
  }, []);

  const handleConnect = async () => {
    try {
      // 如果选择记住连接信息，则保存到 localStorage
      if (rememberConnection) {
        localStorage.setItem('savedDatabaseConnection', JSON.stringify(formData));
      } else {
        // 如果取消记住，则删除保存的信息
        localStorage.removeItem('savedDatabaseConnection');
      }

      logAPI.request('DATABASE_CONNECT', {
        host: formData.host,
        user: formData.user,
        port: formData.port
      });
      
      console.log('Request body:', formData);  // 记录请求体
      
      const response = await axios.post(API_ENDPOINTS.DATABASE_CONNECT, formData);
      
      logAPI.response('DATABASE_CONNECT', response.data);
      
      if (response.data.success) {
        console.log('[SUCCESS] Database connected:', response.data);
        
        // 确保返回的数据包含必要的字段
        if (!response.data.databases || !Array.isArray(response.data.databases)) {
          throw new Error('Invalid response format: missing databases array');
        }
        
        // 调用回调函数，传递数据
        onConnect?.({
          connectionId: response.data.connectionId,
          databases: response.data.databases
        });
        
        alert('数据库连接成功！');
        onClose();
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      // 更详细的错误日志
      console.error('Full error object:', error);
      console.error('Error response:', error.response?.data);
      
      logAPI.error('DATABASE_CONNECT', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        stack: error.stack
      });

      // 显示更具体的错误信息
      alert(
        error.response?.data?.message || 
        error.message || 
        '连接失败，请检查数据库配置和日志'
      );
    }
  };

  // 清除保存的连接信息
  const handleClearSaved = () => {
    localStorage.removeItem('savedDatabaseConnection');
    setFormData({
      host: 'localhost',
      user: 'root',
      password: '',
      port: '3306'
    });
    setRememberConnection(false);
  };

  return (
    <div className={`modal fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 ${isOpen ? 'block' : 'hidden'}`}>
      <div className="modal-content bg-white rounded-lg shadow-lg w-[500px] max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold mb-6">连接数据库</h2>
        
        <div className="space-y-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">服务器地址:</label>
            <input 
              type="text"
              value={formData.host}
              onChange={(e) => setFormData({...formData, host: e.target.value})}
              className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
              placeholder="localhost 或 127.0.0.1"
            />
            <small className="text-gray-500 mt-1 block">
              本地数据库请使用 localhost 或 127.0.0.1
            </small>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名:</label>
            <input 
              type="text"
              value={formData.user}
              onChange={(e) => setFormData({...formData, user: e.target.value})}
              className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">密码:</label>
            <input 
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">端口:</label>
            <input 
              type="text"
              value={formData.port}
              onChange={(e) => setFormData({...formData, port: e.target.value})}
              className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 记住连接信息选项 */}
          <div className="flex items-center justify-between py-3 border-t border-gray-200">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember-connection"
                checked={rememberConnection}
                onChange={(e) => setRememberConnection(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="remember-connection" className="ml-2 text-sm text-gray-700">
                记住连接信息
              </label>
            </div>
            
            {rememberConnection && (
              <button
                onClick={handleClearSaved}
                className="text-sm text-red-500 hover:text-red-700 focus:outline-none"
                type="button"
              >
                清除保存的信息
              </button>
            )}
          </div>

          {/* 按钮组 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none transition-colors"
              type="button"
            >
              取消
            </button>
            <button 
              onClick={handleConnect}
              className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 focus:outline-none transition-colors"
              type="button"
            >
              连接
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
