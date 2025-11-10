const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the current directory
app.use(express.static('.'));

// Serve wavesurfer.js files from node_modules
app.use('/wavesurfer.js', express.static(path.join(__dirname, 'node_modules/wavesurfer.js')));

// Route for the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`🪁 Kite Sampler running at http://localhost:${port}`);
    console.log(`📁 Project directory: ${__dirname}`);
    console.log(`🎵 Ready to sample some music!`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Server shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Server shutting down gracefully');
    process.exit(0);
});