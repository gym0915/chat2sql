const express = require('express');
const app = express();
const databaseRoutes = require('./routes/databaseRoutes');

// 其他中间件设置...

app.use('/api', databaseRoutes);

// 其他路由和服务器设置...
