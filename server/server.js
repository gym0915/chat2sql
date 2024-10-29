import express from 'express';
import cors from 'cors';
import databaseRoutes from './routes/database.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', databaseRoutes);

// ... 其他服务器配置

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
