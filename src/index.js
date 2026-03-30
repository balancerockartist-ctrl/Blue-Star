require('dotenv').config();

const app = require('./api/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Blue-Star Quantum Economics Platform running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
