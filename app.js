// server.js
const path = require('path');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;


// 1) Serve static files (HTML/CSS/JS) from /public
app.use(express.static(path.join(__dirname, 'public')));

// 2) Parse JSON bodies (for POST/PUT APIs later)
app.use(express.json());

// 3) Example API route (you can delete/modify later)
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Express!' });
});

// 4) Start server
app.listen(PORT, () => {
  console.log(`
  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  ┃   Server listening on port: ${PORT}    ┃
  ┃     http://localhost:${PORT}/          ┃
  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  `);
});