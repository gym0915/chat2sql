import express from 'express';
import cors from 'cors';
import databaseRoutes from './routes/database.js';

const app = express();
app.use(cors());
app.use(express.json());

// 使用数据库路由
app.use('/api', databaseRoutes);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
