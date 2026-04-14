const { chromium } = require('playwright-core');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => res.send('<h1>Local Automation Dashboard</h1>'));

async function connectToBrowser() {
    // Connect to the locally running Chrome instance
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const page = browser.contexts()[0].pages()[0];
    return page;
}

server.listen(3000, () => console.log('Dashboard running at http://localhost:3000'));
module.exports = { connectToBrowser, io };