import express from 'express';
import cors from 'cors';
import databaseRoutes from './routes/database.js';

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 路由
app.use('/api', databaseRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('[ERROR] Server error:', err);
  res.status(500).json({ 
    success: false, 
    message: '服务器错误',
    error: err.message 
  });
});

// 启动服务器
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
