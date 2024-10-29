import React, { useState, useRef, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useTable, usePagination } from 'react-table';
import { Clipboard, Play, Check, User, Code, Loader, PlusCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Toast from './Toast'; // 导入 Toast 组件

interface ChatInterfaceProps {
  models: string[];
  selectedDatabase: string; // 添加选中的数据库名称
}

interface Message {
  type: 'user' | 'bot';
  content: string;
  mark?: 'sql';
  sqlResult?: any[]; // 添加此字段存储每条消息的 SQL 执行结果
}

// 新增表格组件
const SQLResultTable: React.FC<{ resultData: any[] }> = ({ resultData }) => {
  // 如果结果为空数组，创建一个带有默认结构的空数据
  const processedData = useMemo(() => {
    if (resultData.length === 0) {
      return [{
        result: '没有找到匹配的数据',
        count: 0,
        timestamp: new Date().toLocaleString()
      }];
    }
    
    // 处理数据，确保所有值都是可以渲染的类型
    return resultData.map(item => {
      const processedItem: any = {};
      Object.entries(item).forEach(([key, value]) => {
        if (value === null) {
          processedItem[key] = 'NULL';
        } else if (typeof value === 'object') {
          // 如果值是对象，将其转换为字符串
          processedItem[key] = JSON.stringify(value);
        } else if (value instanceof Date) {
          // 如果是日期对象，转换为本地字符串
          processedItem[key] = value.toLocaleString();
        } else if (Array.isArray(value)) {
          // 如果是数组，转换为字符串
          processedItem[key] = value.join(', ');
        } else {
          // 其他类型直接使用
          processedItem[key] = value;
        }
      });
      return processedItem;
    });
  }, [resultData]);

  const columns = useMemo(() => {
    // 使用处理后的数据来生成列
    return Object.keys(processedData[0] || {}).map(key => ({
      Header: key,
      accessor: key
    }));
  }, [processedData]);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize }
  } = useTable(
    {
      columns,
      data: processedData,  // 使用处理后的数据
      initialState: { pageIndex: 0, pageSize: 10 }
    },
    usePagination
  );

  return (
    <div className="overflow-x-auto">
      <table {...getTableProps()} className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          {headerGroups.map(headerGroup => {
            const { key, ...restHeaderGroupProps } = headerGroup.getHeaderGroupProps();
            return (
              <tr key={key} {...restHeaderGroupProps}>
                {headerGroup.headers.map(column => {
                  const { key, ...restColumnProps } = column.getHeaderProps();
                  return (
                    <th
                      key={key}
                      {...restColumnProps}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {column.render('Header')}
                    </th>
                  );
                })}
              </tr>
            );
          })}
        </thead>
        <tbody {...getTableBodyProps()} className="bg-white divide-y divide-gray-200">
          {page.map(row => {
            prepareRow(row);
            const { key, ...restRowProps } = row.getRowProps();
            return (
              <tr key={key} {...restRowProps}>
                {row.cells.map(cell => {
                  const { key, ...restCellProps } = cell.getCellProps();
                  return (
                    <td
                      key={key}
                      {...restCellProps}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                    >
                      {cell.render('Cell')}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex justify-between items-center py-3">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{pageIndex * pageSize + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min((pageIndex + 1) * pageSize, processedData.length)}
            </span> of{' '}
            <span className="font-medium">{processedData.length}</span> results
          </p>
        </div>
        <div>
          <button
            onClick={() => previousPage()}
            disabled={!canPreviousPage}
            className="px-3 py-1 border rounded-md text-sm text-gray-500 hover:bg-gray-100"
          >
            Previous
          </button>
          <button
            onClick={() => nextPage()}
            disabled={!canNextPage}
            className="ml-2 px-3 py-1 border rounded-md text-sm text-gray-500 hover:bg-gray-100"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ models, selectedDatabase }) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [isSelectShaking, setIsSelectShaking] = useState(false);
  const [isInputShaking, setIsInputShaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const selectRef = useRef<HTMLSelectElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false); // 新增状态来跟踪是否正在等待响应
  const [isRunningSQL, setIsRunningSQL] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(e.target.value);
  };

  const sendSqlRequest = async (prompt: string) => {
    setIsLoading(true); // 开始加载
    try {
      const response = await axios.post('http://localhost:3001/api/generate-sql', {
        model: selectedModel,
        prompt: prompt,
        mark: "sql"
      });
      console.log('后端响应:', response.data);
      if (response.data.success) {
        setMessages(prev => [...prev, { 
          type: 'bot', 
          content: response.data.generatedContent,
          mark: 'sql'
        }]);
      }
    } catch (error) {
      console.error('发送请求失败:', error);
    } finally {
      setIsLoading(false); // 无论成功还是失败，都结束加载
    }
  };

  const handleSend = () => {
    if (isLoading) return; // 如果正在加载，直接返回
    const trimmedInput = inputValue.trim();
    if (!selectedModel) {
      setIsSelectShaking(true);
      setTimeout(() => setIsSelectShaking(false), 820);
      return;
    }
    if (!trimmedInput) {
      setIsInputShaking(true);
      setTimeout(() => setIsInputShaking(false), 820);
      return;
    }
    
    // 添加用户消息消息列表
    setMessages(prev => [...prev, { type: 'user', content: trimmedInput }]);
    
    // 获取保存的 allCreateSQL
    const allCreateSQL = localStorage.getItem('allCreateSQL') || '';
    
    // 拼接完整的提示内容
    const fullPrompt = `${allCreateSQL}\n\n理解以上sql语句及示例数据并回答问题，你只需要回复markdown格式的sql语句，记住不要回复其他文字信息。\n\n问题：${trimmedInput}`;
    
    // 打印完整的提示内容
    console.log('完整的提示内容:', fullPrompt);
    
    // 发送请求
    sendSqlRequest(fullPrompt);
    
    // 清空输入框
    setInputValue('');
  };

  useEffect(() => {
    setTimeout(() => {
      Prism.highlightAll();
    }, 0);
  }, [messages]);

  const copyToClipboard = (text: string, index: number) => {
    // 清理 SQL 文本，移除 markdown 标记
    const cleanedText = text.replace(/^```sql\s*|```$/g, '').trim();
    
    const textArea = document.createElement('textarea');
    textArea.value = cleanedText;  // 使用清理后的文本
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000); // 2秒后恢复图标
    } catch (err) {
      console.error('复制失败:', err);
    }
    
    document.body.removeChild(textArea);
  };

  const runSQL = async (sql: string, messageIndex: number) => {
    if (isRunningSQL) return;
    setIsRunningSQL(true);
    try {
      // 清理 SQL 文本，移除 markdown 标记
      const cleanedSQL = sql
        .replace(/^```sql\s*/i, '')
        .replace(/```$/m, '')
        .trim();

      console.log('处理后的 SQL:', cleanedSQL);

      const response = await axios.post('http://localhost:3001/api/run-sql', {
        sql: cleanedSQL,
        database: selectedDatabase,
        config: JSON.parse(localStorage.getItem('dbConnectionConfig') || '{}')
      }, {
        timeout: 15000
      });
      
      if (response.data.success) {
        setMessages(prev => prev.map((msg, idx) => 
          idx === messageIndex 
            ? { ...msg, sqlResult: response.data.result }
            : msg
        ));
      }
    } catch (error) {
      console.error('执行 SQL 失败:', error);
      // 创建一个错误结果对象
      console.error("error1:", error.response.data.code);
      const errorResult = [{
        error: error instanceof Error ? error.response.data.code : '执行 SQL 时发生未知错误',
        timestamp: new Date().toLocaleString()
      }];
      
      // 更新消息的 sqlResult，使用错误信息
      setMessages(prev => prev.map((msg, idx) => 
        idx === messageIndex 
          ? { ...msg, sqlResult: errorResult }
          : msg
      ));
    } finally {
      setIsRunningSQL(false);
    }
  };

  const renderMessage = (message: Message, index: number) => {
    if (message.type === 'user') {
      return (
        <div className="bg-blue-100 p-3 rounded-lg">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      );
    } else {
      return (
        <div className="bg-gray-100 p-3 rounded-lg">
          <div className="relative bg-[#f6f8fa] rounded-lg overflow-hidden">
            <div className="flex justify-between items-center px-4 py-2 bg-[#f0f0f0] text-sm">
              <span className="font-semibold text-gray-600">SQL</span>
              {message.mark === 'sql' && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => copyToClipboard(message.content, index)}
                    className="text-gray-500 hover:text-gray-700"
                    title="复制"
                  >
                    {copiedIndex === index ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Clipboard className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => runSQL(message.content, index)} // 传入消息索引
                    className="text-gray-500 hover:text-gray-700"
                    title="运行"
                    disabled={isRunningSQL}
                  >
                    {isRunningSQL ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
            </div>
            <ReactMarkdown
              children={message.content}
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <div className="overflow-x-auto max-w-full"> {/* 修改这里 */}
                      <SyntaxHighlighter
                        style={{}}
                        language={match[1]}
                        PreTag="div"
                        className="language-sql"
                        customStyle={{
                          background: 'transparent',
                          padding: '1rem',
                          margin: 0,
                          whiteSpace: 'pre',       // 添加这行
                          wordWrap: 'normal',      // 添加这行
                          overflowX: 'auto',       // 添加这行
                          minWidth: '100%',        // 添加这行
                        }}
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            />
            {/* 使用消息自己的 sqlResult */}
            {message.sqlResult && message.sqlResult.length > 0 && message.mark === 'sql' && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <SQLResultTable resultData={message.sqlResult} />
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  // 添加一个 useEffect 来监听消息变化
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]); // 当消息列表变化时触发

  // 添加清空聊天记录的函数
  const handleClearChat = () => {
    setMessages([]);
  };

  // 添加键盘事件处理函数
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // 阻止默认的回车换行行为
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-12 flex justify-between items-center px-4 border-b border-gray-200">
        <div className="text-sm text-gray-600">Chat History</div>
        <button
          onClick={handleClearChat}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors duration-200"
          title="新建聊天"
        >
          <PlusCircle className="w-5 h-5 text-gray-900" />
        </button>
      </div>

      {/* 聊天内容区域 */}
      <div 
        ref={chatContainerRef}
        className="flex-grow overflow-y-auto p-4 space-y-4"
      >
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                message.type === 'user' ? 'bg-gray-900 ml-2' : 'bg-gray-300 mr-2'
              }`}>
                {message.type === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Code className="w-5 h-5 text-gray-600" />
                )}
              </div>
              {renderMessage(message, index)}
            </div>
          </div>
        ))}
      </div>

      {/* 输入区域 */}
      <div className="flex items-center space-x-2 p-4 bg-white border-t">
        <select
          ref={selectRef}
          value={selectedModel}
          onChange={handleModelChange}
          className={`border border-gray-300 rounded-md p-2 ${isSelectShaking ? 'animate-shake' : ''}`}
          disabled={isLoading}
        >
          <option value="">Selection model</option>
          {models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>

        <div className="flex-grow relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            className={`w-full pr-12 pl-4 py-2 border border-gray-300 rounded-md ${
              isInputShaking ? 'animate-shake' : ''
            }`}
            placeholder="What sql statements do you want to generate..."
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full
              transition-colors duration-200 ${
                isLoading
                  ? 'text-gray-300'
                  : 'text-gray-900 hover:bg-gray-100'
              }`}
            title="发送"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>

      {showToast && (
        <Toast
          message="已复制到剪贴"
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
};

export default ChatInterface;
