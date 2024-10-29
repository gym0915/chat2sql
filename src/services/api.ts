import axios from 'axios';
import type { DatabaseConnection, ConnectionResponse } from '../types/database';
import cors from 'cors';

const API_URL = 'http://localhost:3001/api';

export const databaseApi = {
  connect: async (connection: DatabaseConnection): Promise<ConnectionResponse> => {
    console.log("api", `${API_URL}/connect`);
    const response = await axios.post(`${API_URL}/connect`, connection);
    return response.data;
  },

  disconnect: async (connectionId: string): Promise<void> => {
    await axios.delete(`${API_URL}/disconnect/${connectionId}`);
  }
};

export const sendDatabaseForLearning = async (dbName: string, connectionConfig: DatabaseConnection) => {
  try {
    console.log("学习请求参数:", { databaseName: dbName, ...connectionConfig });
    const response = await axios.post(`${API_URL}/learn-database`, {
      databaseName: dbName,
      server: connectionConfig.server,
      username: connectionConfig.username,
      password: connectionConfig.password,
      port: connectionConfig.port
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || '学习请求失败');
    }
    
    return response.data;
  } catch (error) {
    console.error('API错误:', error);
    throw error;
  }
};

export const parseTableStructure = (createTableStatements: string[]): {
  tables: TableStructure[];
  relations: TableRelation[];
} => {
  const tables: TableStructure[] = [];
  const relations: TableRelation[] = [];

  createTableStatements.forEach(statement => {
    const tableMatch = statement.match(/CREATE TABLE\s+`?(\w+)`?\s*\(([\s\S]+?)\)/i);
    if (tableMatch) {
      const tableName = tableMatch[1];
      const fieldsString = tableMatch[2];
      
      const fields: TableField[] = [];
      const fieldLines = fieldsString.split(',').map(line => line.trim());
      
      fieldLines.forEach(line => {
        const fieldMatch = line.match(/`?(\w+)`?\s+([\w()]+)(.+)?/i);
        if (fieldMatch) {
          const field: TableField = {
            name: fieldMatch[1],
            type: fieldMatch[2],
          };
          
          if (line.toLowerCase().includes('primary key')) {
            field.isPrimary = true;
          }
          
          const foreignKeyMatch = line.match(/FOREIGN KEY.*REFERENCES\s+`?(\w+)`?\s*\(`?(\w+)`?\)/i);
          if (foreignKeyMatch) {
            field.isForeign = true;
            field.references = {
              table: foreignKeyMatch[1],
              field: foreignKeyMatch[2]
            };
            relations.push({
              source: tableName,
              target: foreignKeyMatch[1],
              sourceField: field.name,
              targetField: foreignKeyMatch[2]
            });
          }
          
          fields.push(field);
        }
      });
      
      tables.push({
        name: tableName,
        fields: fields
      });
    }
  });

  return { tables, relations };
};

export const getLocalModels = async (): Promise<string[]> => {
  try {
    console.log("获取本地模型local-models");
    const response = await fetch('http://localhost:3001/api/local-models');
    if (!response.ok) {
      throw new Error('获取本地模型失败');
    }
    const data = await response.json();
    return data.models;
  } catch (error) {
    console.error('获取本地模型错误:', error);
    throw error;
  }
};
