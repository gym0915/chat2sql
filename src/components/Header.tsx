import React, { useEffect } from 'react';
import { Database } from 'lucide-react';
import { useModal } from '../hooks/useModal';
import ConnectionModal from './ConnectionModal';
import type { ConnectionConfig } from '../types/connection';

interface HeaderProps {
  onDatabasesLoad: (databases: string[], config: ConnectionConfig) => void;
}

export default function Header({ onDatabasesLoad }: HeaderProps) {
  const { isOpen, openModal, closeModal } = useModal();

  // 简化为直接打开弹窗
  useEffect(() => {
    openModal();
  }, []); // 空依赖数组确保只在组件挂载时执行一次

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="w-full px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-gray-900">Chat2SQL</h1>
          </div>
          <button
            onClick={openModal}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Database connection"
          >
            <Database className="h-6 w-6 text-gray-900" />
          </button>
        </div>
      </div>
      <ConnectionModal 
        isOpen={isOpen} 
        onClose={closeModal}
        onConnect={(databases, config) => {
          onDatabasesLoad(databases, config);
          closeModal();
        }}
      />
    </header>
  );
}
