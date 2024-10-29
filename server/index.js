import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import databaseRoutes from './routes/database.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// 添加请求日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 确保这些中间件在路由之前
app.use(cors());
app.use(express.json());  // 解析 JSON 请求体
app.use(express.urlencoded({ extended: true }));  // 解析 URL 编码的请求体

app.get('/api/local-models', async (req, res) => {
  console.log('Local models route handler called (in index.js)');
  try {
    const response = await axios.get('http://localhost:11434/api/tags');
    const models = response.data.models.map(model => model.name);
    console.log("models:",models);
    res.json({ models });
  } catch (error) {
    console.error('获取本地模型失败:', error);
    res.status(500).json({ error: '获取本地模型失败' });
  }
});

// 确保这个挂载点是正确的
app.use('/api', databaseRoutes);

// 添加错误处理中间件
app.use((err, req, res, next) => {
  console.error('[ERROR] Server error:', err);
  res.status(500).json({ 
    success: false, 
    message: '服务器错误',
    error: err.message 
  });
});

// 添加端口监听
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[INFO] Server is running on port ${PORT}`);
});
