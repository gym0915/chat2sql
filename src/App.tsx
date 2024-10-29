import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import SchemaVisualizer from './components/Database/SchemaVisualizer';
import ChatInterface from './components/ChatInterface';
import { parseTableStructure, getLocalModels } from './services/api';
import type { TableStructure, TableRelation } from './types/database';
import { Loader2, Network } from 'lucide-react';

interface ConnectionConfig {
  host: string;
  user: string;
  password: string;
  port: string | number;
}

function App() {
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDb, setSelectedDb] = useState<string>('');
  const [leftWidth, setLeftWidth] = useState<number>(50); // 修改初始宽度为50%，使两个面板相等
  const [isLearning, setIsLearning] = useState(false);
  const [connectionConfig, setConnectionConfig] = useState<ConnectionConfig>({
    host: '',
    user: '',
    password: '',
    port: ''
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const [tableStructures, setTableStructures] = useState<any[]>([]); // 临时使用 any
  const [tables, setTables] = useState<TableStructure[]>([]);
  const [relations, setRelations] = useState<TableRelation[]>([]);
  const [isSchemaReady, setIsSchemaReady] = useState(false); // 新增状态
  const [localModels, setLocalModels] = useState<string[]>([]); // 新增状态

  // 清空所有储数据的函数
  const clearAllStorageData = () => {
    console.log("清空所有存储数据");
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('db_') || key === 'createTableStatements') {//|| key === 'dbConnectionConfig' 
        localStorage.removeItem(key);
      }
    });
    // 重置状态
    setTableStructures([]);
    setTables([]);
    setRelations([]);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const mouseX = e.clientX - containerRect.left;
    const newLeftWidth = (mouseX / containerWidth) * 100;
    
    // 限制最小宽度为33.33%
    if (newLeftWidth >= 33.33) {
      setLeftWidth(newLeftWidth);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // 页面刷新时清空数据
  useEffect(() => {
    const handleBeforeUnload = () => {
      clearAllStorageData();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // 修改 handleDatabasesLoad 函数
  const handleDatabasesLoad = (databases: string[], config: ConnectionConfig) => {
    console.log('App 接收到数据库列表:', databases);
    console.log('App 接收到配置:', config);
    
    // 先清空所有存储的数据
    clearAllStorageData();
    
    // 然后保存新的数据
    setDatabases(databases);
    setConnectionConfig(config);
    localStorage.setItem('dbConnectionConfig', JSON.stringify(config));
  };

  const handleLearn = async () => {
    if (!selectedDb || isLearning) return;
    
    try {
      setIsLearning(true);
      
      // 先清除所有存储建表数据
      clearAllStorageData();
      
      const config = connectionConfig;
      console.log('学习请求使用的配:', config);
      
      const requestBody = {
        databaseName: selectedDb,
        server: config.host,
        username: config.user,
        password: config.password,
        port: config.port
      };
      
      console.log('发送学习请求，数据：', requestBody);
      
      const response = await fetch('http://localhost:3001/api/learn-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('数据库名称:', data.database);
        console.log('表列表:', data.tables);
        console.log('表结构详情:', data.tableStructures);

        // 解析 data.tableStructures 并拼装 createSQL 和示例数据
        const allCreateSQL = data.tableStructures.map((table: any) => {
          return `${table.createSQL}\n\n-- 示例查询:\n${table.sampleQuery}\n-- 示例数据:\n${
            JSON.stringify(table.sampleData, null, 2)
          }\n`;
        }).join('\n\n');

        // const allCreateSQL = data.tableStructures.map((table: any) => {
        //   return `${table.createSQL}\n\n
        //   }\n`;
        // }).join('\n\n');
        
        // 保存到浏览器的 localStorage 中
        localStorage.setItem('allCreateSQL', allCreateSQL);
        
        console.log('所有建表语句和示例数据已存到 localStorage');
        
        // 解析表结构
        const parsedTables: TableStructure[] = [];
        const parsedRelations: TableRelation[] = [];

        // 遍历每个表结构
        data.tableStructures.forEach((table: any) => {
          const tableName = table.tableName;
          const createSQL = table.createSQL;
          
          // 解析字段
          const fields: any[] = [];
          
          // 提取括号内的内容
          const fieldsMatch = createSQL.match(/\(([\s\S]+)\)/);
          if (fieldsMatch) {
            const fieldsString = fieldsMatch[1];
            
            // 查找主键定义，支持多主键
            const primaryKeyMatch = fieldsString.match(/PRIMARY KEY\s*\(([^)]+)\)/i);
            const primaryKeyFields = primaryKeyMatch 
              ? primaryKeyMatch[1].split(',').map(field => field.trim().replace(/`/g, '')) 
              : [];
            console.log('主键字段:', primaryKeyFields);
            
            // 先找出所有的外键引用关系
            const foreignKeyRefs = new Map<string, { targetTable: string, targetField: string }>();
            fieldsString.split(',').forEach(line => {
              // 匹配 REFERENCES 格式：REFERENCES `table_name` (`field_name`)
              const referencesMatch = line.match(/FOREIGN KEY\s*\(`([^`]+)`\)\s*REFERENCES\s*`([^`]+)`\s*\(`([^`]+)`\)/i);
              if (referencesMatch) {
                const [_, sourceField, targetTable, targetField] = referencesMatch;
                foreignKeyRefs.set(sourceField, {
                  targetTable,
                  targetField
                });
                
                // 添加表之间的关系（用于绘制连线）
                parsedRelations.push({
                  source: tableName,
                  target: targetTable,
                  sourceField: sourceField,
                  targetField: targetField,
                  isFK: true  // 标记为外键关系，用于绘制虚线
                });
              }
            });
            
            // 按逗号分割字段定义，并过滤掉包含 CONSTRAINT 的行
            const fieldDefinitions = fieldsString
              .split(',')
              .map(f => f.trim())
              .filter(f => !f.toUpperCase().includes('CONSTRAINT')); // 过滤掉 CONSTRAINT 行
            
            // 解析普通字段
            fieldDefinitions.forEach(fieldDef => {
              const fieldMatch = fieldDef.match(/`([^`]+)`\s+(\w+)(?:\(([^)]+)\))?(\s+.*)?/);
              if (fieldMatch) {
                const fieldName = fieldMatch[1];
                const baseType = fieldMatch[2];
                const typeParams = fieldMatch[3];
                const fieldAttributes = fieldMatch[4] || '';
                
                // 构建完整的字段类型
                let fieldType = baseType;
                if (typeParams) {
                  fieldType += `(${typeParams})`;
                }

                // 检查是否已经存在这个字段
                if (!fields.some(f => f.name === fieldName)) {
                  const field = {
                    name: fieldName,
                    type: fieldType,
                    // 修改这里，检查字段是否在主键数组中
                    isPrimary: primaryKeyFields.includes(fieldName) || fieldAttributes.toLowerCase().includes('primary key'),
                    isForeign: foreignKeyRefs.has(fieldName)
                  };

                  // 如果是外键，添加引用信息
                  if (field.isForeign) {
                    const ref = foreignKeyRefs.get(fieldName);
                    field.references = {
                      table: ref.targetTable,
                      field: ref.targetField
                    };
                  }
                  
                  fields.push(field);
                }
              }
            });
          }
          
          parsedTables.push({
            name: tableName,
            fields: fields
          });
        });

        console.log('解析后的表结构:', parsedTables);
        console.log('解析后的关系:', parsedRelations);

        // 更新状态
        setTables(parsedTables);
        setRelations(parsedRelations);
        
        // 保存到 localStorage
        const dbKey = `db_${data.database}_structures`;
        localStorage.setItem(dbKey, JSON.stringify({
          timestamp: new Date().toISOString(),
          database: data.database,
          tables: parsedTables,
          relations: parsedRelations
        }));

        // 在这里调用 getLocalModels
        try {
          const models = await getLocalModels();
          setLocalModels(models);
          console.log("获取本地模型成功:", models);
          setIsSchemaReady(true);
        } catch (error) {
          console.error('获取本地模型失败:', error);
        }
        
      } else {
        console.error('学习失败：', data.error);
      }
    } catch (error) {
      console.error('请求错误：', error);
    } finally {
      setIsLearning(false);
    }
  };

  // 组件加时从 localStorage 恢复配置
  useEffect(() => {
    const savedConfig = localStorage.getItem('dbConnectionConfig');
    if (savedConfig) {
      setConnectionConfig(JSON.parse(savedConfig));
    }
  }, []);

  // 组件加载时恢复保存的表结构
  useEffect(() => {
    if (selectedDb) {
      const dbKey = `db_${selectedDb}_structures`;
      const savedStructures = localStorage.getItem(dbKey);
      if (savedStructures) {
        const { tables: savedTables, relations: savedRelations } = JSON.parse(savedStructures);
        setTables(savedTables);
        setRelations(savedRelations);
      }
    }
  }, [selectedDb]);

  // 修改 handleDatabaseSelect 函数
  const handleDatabaseSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDatabase = e.target.value;
    setSelectedDb(selectedDatabase);
    console.log("selectedDatabase:", selectedDatabase);
    // 清除之前的表结构数据
    setTableStructures([]);
    setTables([]);
    setRelations([]);
    setIsSchemaReady(false);
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <Header onDatabasesLoad={handleDatabasesLoad} />
      <main className="flex-1 w-full p-4 overflow-hidden">
        <div ref={containerRef} className="h-full flex relative">
          {/* 左侧区域 */}
          <div 
            style={{ width: `${leftWidth}%` }} 
            className="bg-white rounded-lg shadow-sm h-full flex flex-col"
          >
            {/* 修改这里：统一导航栏高度 */}
            <div className="h-12 px-4 flex items-center border-b border-gray-200">
              {databases.length > 0 && (
                <div className="flex items-center gap-3 w-full">
                  <div className="relative w-48">
                    <select
                      className="appearance-none w-full px-4 py-2 pr-8 text-gray-700 bg-white border border-gray-300 rounded-md 
                                shadow-sm transition duration-150 ease-in-out
                                hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={selectedDb}
                      onChange={handleDatabaseSelect}
                      disabled={isLearning}
                    >
                      <option value="" className="text-gray-500">select database</option>
                      {databases.map(db => (
                        <option key={db} value={db} className="text-gray-700">{db}</option>
                      ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-700">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <button
                    className={`p-2 rounded-md transition-all duration-200 
                      ${selectedDb && !isLearning
                        ? 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-900'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                    disabled={!selectedDb || isLearning}
                    onClick={handleLearn}
                    title={isLearning ? "加载中..." : "生成数据库关系图"}
                  >
                    {isLearning ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Network className="w-5 h-5" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* 力向图区域 */}
            {tables.length > 0 && (
              <div className="flex-1 overflow-hidden">
                <SchemaVisualizer 
                  tables={tables} 
                  relations={relations} 
                />
              </div>
            )}
          </div>

          {/* 拖动分隔条 */}
          <div
            className="w-1 bg-gray-200 hover:bg-blue-500 cursor-col-resize relative group h-full mx-[-1px]"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-blue-500 opacity-0 group-hover:opacity-10"></div>
          </div>

          {/* 右侧区域 */}
          <div className="flex-1 bg-white rounded-lg shadow-sm h-full flex flex-col">
            {isSchemaReady && (
              <ChatInterface 
                models={localModels} 
                selectedDatabase={selectedDb}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
