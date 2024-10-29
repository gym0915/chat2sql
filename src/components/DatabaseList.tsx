import React from 'react';
import { sendDatabaseForLearning } from '../services/api';
import type { DatabaseConnection } from '../types/database';

interface DatabaseListProps {
  databases: string[];
  connectionConfig: DatabaseConnection;
}

function DatabaseList({ databases, connectionConfig }: DatabaseListProps) {
  const handleLearnClick = async (dbName: string) => {
    try {
      await sendDatabaseForLearning(dbName, connectionConfig);
      console.log(`开始学习数据库: ${dbName}`);
    } catch (error) {
      console.error('学习请求失败:', error);
    }
  };

  return (
    <div>
      {databases.map((db) => (
        <div key={db}>
          <span>{db}</span>
          <button 
            onClick={() => handleLearnClick(db)}
            className="learn-button"
          >
            学习
          </button>
        </div>
      ))}
    </div>
  );
}

export default DatabaseList;
