const express = require('express');
const app = express();
const databaseRoutes = require('./routes/databaseRoutes');

app.use('/api/database', databaseRoutes);
