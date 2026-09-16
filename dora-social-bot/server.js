import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3005;
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'dora_webhook_secure_2026';

app.use(cors());
app.use(express.json());

// In-memory event log for SSE
let eventSubscribers = [];
let receivedEvents = [];

// Broadcast SSE event
function broadcastEvent(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  eventSubscribers.forEach(res => {
    try {
      res.write(payload);
    } catch (e) {
      // client closed
    }
  });
}

// 1. Health check & Diagnostics
app.get('/api/ping', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Dora Cars Standalone Social Bot & Webhook Server',
    time: new Date().toISOString(),
    port: PORT,
    subscribersCount: eventSubscribers.length,
    eventsCount: receivedEvents.length
  });
});

// 2. Real-time Server-Sent Events (SSE) stream for Frontend
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`);

  eventSubscribers.push(res);

  req.on('close', () => {
    eventSubscribers = eventSubscribers.filter(s => s !== res);
  });
});

// 3. Meta Webhook Verification (GET /webhook)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
      console.log('✓ Meta Webhook verified successfully!');
      return res.status(200).send(challenge);
    } else {
      console.warn('✗ Meta Webhook verification token mismatch.');
      return res.sendStatus(403);
    }
  }
  res.sendStatus(400);
});

// 4. Meta Webhook Message Receiver (POST /webhook)
app.post('/webhook', (req, res) => {
  const body = req.body;

  if (body.object === 'page' || body.object === 'instagram') {
    body.entry?.forEach(entry => {
      // Messenger or Instagram messaging events
      const messaging = entry.messaging || [];
      messaging.forEach(event => {
        const parsedMessage = {
          id: 'meta_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          platform: body.object === 'instagram' ? 'instagram' : 'facebook',
          senderId: event.sender?.id,
          recipientId: event.recipient?.id,
          text: event.message?.text || '',
          timestamp: event.timestamp || Date.now(),
          raw: event
        };

        receivedEvents.unshift(parsedMessage);
        if (receivedEvents.length > 200) receivedEvents.pop();

        broadcastEvent({ type: 'NEW_MESSAGE', data: parsedMessage });
      });
    });

    return res.status(200).send('EVENT_RECEIVED');
  }

  res.sendStatus(404);
});

// 5. TikTok Webhook Receiver (GET & POST /api/tiktok-webhook)
app.get('/api/tiktok-webhook', (req, res) => {
  // TikTok Webhook challenge
  if (req.query.challenge) {
    return res.send(req.query.challenge);
  }
  res.json({ status: 'ok', channel: 'tiktok' });
});

app.post('/api/tiktok-webhook', (req, res) => {
  const body = req.body;
  const parsedEvent = {
    id: 'tt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    platform: 'tiktok',
    event: body.event || 'message_or_lead',
    data: body,
    timestamp: Date.now()
  };

  receivedEvents.unshift(parsedEvent);
  if (receivedEvents.length > 200) receivedEvents.pop();

  broadcastEvent({ type: 'TIKTOK_EVENT', data: parsedEvent });
  res.status(200).json({ status: 'success' });
});

app.listen(PORT, () => {
  console.log(`🤖 Dora Social Bot Standalone Webhook Server running on port ${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/api/ping`);
  console.log(`📡 SSE Stream: http://localhost:${PORT}/api/events`);
  console.log(`🌐 Meta Webhook URL: http://localhost:${PORT}/webhook`);
});
