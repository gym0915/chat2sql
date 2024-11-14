import express from 'express';
import mysql from 'mysql2/promise';
import axios from 'axios'; // 确保已经导入 axios
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { getAxiosProxyConfig } from '../utils/proxyConfig.js';

// 获取 ES Module 的 __dirname 等价物
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 修改这里：配置 dotenv，使用正确的路径
dotenv.config({ 
  path: resolve(__dirname, '../../.env') // 注意这里改为 ../../.env
});

// 添加环境变量加载确认日志
console.log('环境变量 HUGGINGFACE_MODELS:', process.env.HUGGINGFACE_MODELS);

const router = express.Router();

// 修改日志工具的实现
const log = {
  info: (message, data = {}) => console.log(`[Server Info] ${message}`, data),  // 移除冒号，添加默认值
  error: (message, error = {}) => console.error(`[Server Error] ${message}`, error),
  success: (message, data = {}) => console.log(`[Server Success] ${message}`, data)
};

// 路径保持为 '/connect'，完整路径将是 '/api/database/connect'
router.post('/connect', async (req, res) => {
  console.log('Received request body:', req.body);
  
  // 使用前端定义的字段名
  const { server, username, password, port } = req.body;
  
  log.info('Received database connection request', {
    server,
    username,
    port,
    timestamp: new Date().toISOString()
  });

  try {
    // 验证必填字段
    if (!server) {
      throw new Error('服务器地址不能为空');
    }
    if (!username) {
      throw new Error('用户名不能为空');
    }

    log.info('Attempting to create MySQL connection', { 
      host: server,
      user: username,
      port: port || 3306 
    });
    
    const connection = await mysql.createConnection({
      host: server,
      user: username,
      password: password || '',
      port: parseInt(port) || 3306,
      connectTimeout: 10000,
      charset: 'utf8mb4'
    });

    try {
      log.info('Attempting to connect to database');  // 不需要额外的参数
      await connection.connect();
      
      // 获取数据库列表
      const [databases] = await connection.execute('SHOW DATABASES');
      const databaseList = databases.map(db => db.Database);
      
      log.info('Database list', { databases: databaseList });  // 添加数据库列表到日志
      
      await connection.end();
      //log.info('Connection closed');  // 简单的状态日志
      
      log.success('Database connection successful', { 
        server, 
        port,
        databaseCount: databaseList.length 
      });
      
      res.json({ 
        success: true,
        connectionId: Date.now().toString(),
        databases: databaseList,
        message: '数据库连接成功',
        timestamp: new Date().toISOString()
      });
    } catch (connError) {
      try {
        await connection.end();
      } catch (endError) {
        log.error('Error closing connection', endError);
      }
      throw connError;
    }
    
  } catch (error) {
    log.error('Database connection failed', {
      error: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      timestamp: new Date().toISOString(),
      stack: error.stack
    });
    
    let errorMessage = '数据库连接失败';
    let statusCode = 500;

    switch (error.code) {
      case 'ER_ACCESS_DENIED_ERROR':
        errorMessage = '访问被拒绝，请检查用户名和密码';
        statusCode = 401;
        break;
      case 'ECONNREFUSED':
        errorMessage = '无法连接到数据库服务器，请检查地址和端口';
        statusCode = 503;
        break;
      case 'ER_NOT_SUPPORTED_AUTH_MODE':
        errorMessage = '认证方式不支持，请检查MySQL配置';
        statusCode = 400;
        break;
      default:
        errorMessage = error.message || '数据库连接失败';
    }
    
    res.status(statusCode).json({ 
      success: false, 
      message: errorMessage,
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });
  }
});

router.delete('/disconnect/:connectionId', async (req, res) => {
  // 现有的断开连接处理代码...
});

// 修改学习数据库的路由处理
router.post('/learn-database', async (req, res) => {
  const { server, username, password, port, databaseName } = req.body;
  log.info('收到学习请:', {
    server,
    username,
    databaseName,
    timestamp: new Date().toISOString()
  });

  try {
    // 创建数据库连接
    const connection = await mysql.createConnection({
      host: server,
      user: username,
      password: password,
      port: port,
      database: databaseName,  // 直接指定数据库
      multipleStatements: true
    });

    // 1. 获取所有表名
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(table => Object.values(table)[0]); // 提取表名
    
    log.info('获取到的表列表:', tableNames);
    console.log("tableNames:",tableNames);
    // 2. 获取每个表的创建语句
    const tableStructures = [];
    log.info('数据表：',tableNames);
    for (const tableName of tableNames) {
      try {
        // 同时获取表结构和示例数据
        const [createTableResult] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
        const [sampleData] = await connection.query(`SELECT * FROM \`${tableName}\` LIMIT 3`);
        
        tableStructures.push({
          tableName: tableName,
          createSQL: createTableResult[0]['Create Table'],
          sampleQuery: `SELECT * FROM \`${tableName}\` LIMIT 3`,
          sampleData: sampleData
        });
        
        log.info(`获取表结构和示例数据成功: ${tableName}`);
      } catch (error) {
        log.error(`获取表 ${tableName} 信息失败:`, error);
        tableStructures.push({
          tableName: tableName,
          error: error.message
        });
      }
    }

    // 关闭连接
    await connection.end();

    // 3. 返回结果
    res.json({ 
      success: true, 
      message: `成功获取数据库 ${databaseName} 的表结构`,
      database: databaseName,
      tables: tableNames,
      tableStructures: tableStructures
    });

  } catch (error) {
    log.error('获取数据库表信息失败', error);
    res.status(500).json({ 
      success: false, 
      message: '获取数据库表信息失败',
      error: error.message 
    });
  }
});

// 添加新的路由来获取本地模型
router.get('/local-models', async (req, res) => {
  console.log('Local models route handler called');
  try {
    console.log("获取本地模型local-models");
    const response = await axios.get('http://localhost:11434/api/tags');
    console.log('Ollama API response:', response.data); // 添加日志
    const models = response.data.models.map(model => model.name);
    console.log("models:",models);
    res.json({ models });
  } catch (error) {
    console.error('获取本地模型失败:', error);
    res.status(500).json({ error: '获取本地模型失败' });
  }
});

// 修改 SQL 生成请求的路由处理
router.post('/generate-sql', async (req, res) => {
  const { source, model, prompt, mark } = req.body;
  console.log('收到 SQL 生成请求:', { source, model, prompt });

  try {
    let generatedContent;
    if (source === 'Ollama') {
      // 调用 Ollama API
      const ollamaResponse = await axios.post('http://localhost:11434/api/generate', {
        model: model,
        prompt: prompt,
        stream: false
      });
      generatedContent = ollamaResponse.data.response;
      console.log("response from ollama",generatedContent);
      
    } else if (source === 'HuggingFace') {
      try {
        const token = process.env.HUGGINGFACE_API_TOKEN?.trim(); // 添加 trim() 去除可能的空格
        console.log("使用的 token:", token);
        
        if (!token) {
          throw new Error('HuggingFace API token not found in environment variables');
        }
        
        const axiosConfig = {
          ...getAxiosProxyConfig(),
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          validateStatus: status => status < 500 // 允许非 500 错误被正常捕获
        };

        console.log('请求配置:', {
          url: `https://api-inference.huggingface.co/models/${model}`,
          headers: axiosConfig.headers,
          proxy: axiosConfig.proxy
        });

        const huggingfaceResponse = await axios.post(
          `https://api-inference.huggingface.co/models/${model}`,
          { inputs: prompt },
          axiosConfig
        );

        if (huggingfaceResponse.data) {
          generatedContent = huggingfaceResponse.data[0]?.generated_text || huggingfaceResponse.data;
        } else {
          throw new Error('无效的 HuggingFace API 响应格式');
        }
        console.log("HuggingFace 响应:", generatedContent);

      } catch (error) {
        // 增强错误日志
        console.error('HuggingFace API 调用失败:', {
          message: error.message,
          response: {
            data: error.response?.data,
            status: error.response?.status,
            headers: error.response?.headers,
            config: error.config
          },
          stack: error.stack
        });
        
        // 返回更具体的错误信息
        throw new Error(`调用 HuggingFace API 失败: ${
          error.response?.data?.error || 
          error.message || 
          '未知错误'
        }`);
      }
    } else {
      throw new Error('不支持的模型来源');
    }

    // 通用的 SQL 处理逻辑
    const sqlRegex = /```sql\n([\s\S]*?)```/;
    const match = generatedContent.match(sqlRegex);
    const sqlContent = match ? match[1].trim() : generatedContent.trim();
    const markdownSQL = `\`\`\`sql\n${sqlContent}\n\`\`\``;

    res.json({ 
      success: true, 
      generatedContent: markdownSQL,
      mark: mark
    });
  } catch (error) {
    console.error('生成 SQL 失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '生成 SQL 失败',
      error: error.message
    });
  }
});

// 修改执行 SQL 的路由
router.post('/run-sql', async (req, res) => {
  const { sql, database, config } = req.body;
  let connection;

  try {
    connection = await mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password,
      port: config.port,
      database: database,
      connectTimeout: 10000,
      timeout: 10000
    });

    console.log("执行 SQL:", sql);
    const [results] = await connection.query(sql);
    console.log("查询结果:", results);

    // 处理空结果的情况
    let resultToSend;
    if (!Array.isArray(results) || results.length === 0) {
      // 创建一个默认的结果对象
      resultToSend = [{
        result: '没有找到匹配的数据',
      }];
    } else {
      resultToSend = results;
    }

    res.json({ 
      success: true, 
      result: resultToSend,
      count: Array.isArray(results) ? results.length : 0
    });

  } catch (error) {
    console.error('执行 SQL 失败:', error);
    console.error('执行 SQL 失败:', error.code);
    
    res.status(500).json({ 
      success: false, 
      error: error.error,
      code: error.code 
    });
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (err) {
        console.error('关闭连接失败:', err);
      }
    }
  }
});

// 修改 SQL 生成请求的路由处理
router.get('/api/sql', async (req, res) => {
  try {
    const sqlQuery = "SELECT * FROM users"; // 示例 SQL 语句
    // 将 SQL 语句包装成 Markdown 格式
    const markdownSql = `\`\`\`sql\n${sqlQuery}\n\`\`\``;
    res.json({ content: markdownSql });
  } catch (error) {
    res.status(500).send('Server Error');
  }
});

router.get('/huggingface-models', async (req, res) => {
  try {
    // 从环境变量读取预设的模型列表
    const modelsStr = process.env.HUGGINGFACE_MODELS;
    
    // 添加更详细的日志
    console.log('读取到的环境变量值:', modelsStr);
    
    if (!modelsStr) {
      console.error('环境变量 HUGGINGFACE_MODELS 未设置或为空');
      throw new Error('未在环境变量中设置 HUGGINGFACE_MODELS');
    }

    // 将字符串转换为数组 (假设环境变量中模型名用逗号分隔)
    const models = modelsStr.split(',').map(model => model.trim());
    
    console.log('解析后的 HuggingFace 模型列表:', models);
    res.json({ models });
    
  } catch (error) {
    console.error('获取 HuggingFace 模型失败:', {
      message: error.message,
      code: error.code,
      env: process.env.HUGGINGFACE_MODELS // 添加环境变量值到错误日志
    });

    res.status(500).json({ 
      error: '获取 HuggingFace 模型失败',
      details: {
        message: error.message,
        code: error.code,
        type: error.name
      }
    });
  }
});

console.log('Database routes module loaded');

export default router;
