import React, { useState } from 'react';
import { X } from 'lucide-react';
import { databaseApi } from '../services/api';
import type { DatabaseConnection } from '../types/database';
import type { ConnectionConfig } from '../types/connection'; // Added import for ConnectionConfig


interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (databases: string[], config: ConnectionConfig) => void;
}

export default function ConnectionModal({ isOpen, onClose, onConnect }: ConnectionModalProps) {
  const [form, setForm] = useState<ConnectionConfig>({
    host: '',
    user: '',
    password: '',
    port: '3306',
  });
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {  // 修改这里，添加事件参数
    e.preventDefault();  // 添加这行，阻止表单默认提交
    
    try {
      setIsLoading(true);
      setError('');
      
      console.log('提交的表单数据:', form);  // 添加日志
      
      const response = await databaseApi.connect({
        server: form.host,
        username: form.user,
        password: form.password,
        port: form.port
      });

      if (response.success) {
        console.log('连接成功，保存配置:', form);  // 添加日志
        onConnect(response.databases, form);  // 传递完整的表单数据
        onClose();
      }
    } catch (error) {
      console.error('连接失败:', error);
      setError(error.message || '连接失败');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Database Connection</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="host" className="block text-sm font-medium text-gray-700">
              Server Name
            </label>
            <input
              type="text"
              id="host"
              name="host"
              value={form.host}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="localhost"
              required
            />
          </div>

          <div>
            <label htmlFor="user" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              type="text"
              id="user"
              name="user"
              value={form.user}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="root"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="port" className="block text-sm font-medium text-gray-700">
              Port
            </label>
            <input
              type="text"
              id="port"
              name="port"
              value={form.port}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="3306"
              required
            />
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium 
                text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
