const express = require('express');
const http = require('http');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const { createClient } = require('redis');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  path: '/socket.io',
  cors: { origin: '*' }
});

let jobsCollection;
const redisClient = createClient({ url: process.env.REDIS_URL });

async function initDataLayer() {
  await redisClient.connect();
  const mongoClient = new MongoClient(process.env.MONGO_URL);
  await mongoClient.connect();
  const db = mongoClient.db('planahead_db');
  jobsCollection = db.collection('jobs');

  const count = await jobsCollection.countDocuments();
  if (count === 0) {
    await jobsCollection.insertOne({
      title: 'Fix Leaking Kitchen Sink Pipe',
      categoryIcon: 'WRENCH',
      userName: 'Martha (Senior Homeowner)',
      location: 'Sector 4, Local Radius 2km',
      userBudget: 400,
      currentOffer: 400,
      lastBidder: 'USER',
      isPromoted: true,
      status: 'OPEN_NEGOTIATION',
      bids: [
        { sender: 'Martha (User)', amount: 400, note: 'Proposed initial budget', time: new Date().toISOString() }
      ],
      createdAt: new Date()
    });
  }
}
initDataLayer().catch(console.error);

app.get('/health', (req, res) => res.status(200).json({ status: 'UP', service: 'negotiation-service' }));

app.get('/jobs', async (req, res) => {
  try {
    const jobs = await jobsCollection.find().sort({ isPromoted: -1, createdAt: -1 }).toArray();
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/jobs', async (req, res) => {
  try {
    const { title, categoryIcon, userName, location, userBudget, isPromoted } = req.body;
    const budget = Number(userBudget);
    const newJob = {
      title,
      categoryIcon: categoryIcon || 'WRENCH',
      userName: userName || 'Homeowner',
      location: location || 'Verified Local Premises',
      userBudget: budget,
      currentOffer: budget,
      lastBidder: 'USER',
      isPromoted: Boolean(isPromoted),
      status: 'OPEN_NEGOTIATION',
      bids: [{ sender: `${userName} (User)`, amount: budget, note: 'Initial proposed budget', time: new Date().toISOString() }],
      createdAt: new Date()
    };
    const result = await jobsCollection.insertOne(newJob);
    newJob._id = result.insertedId;
    await redisClient.set(`job:${newJob._id}:offer`, String(budget));
    io.emit('job:updated', newJob);
    res.status(201).json(newJob);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/jobs/:id/bargain', async (req, res) => {
  try {
    const { sender, role, proposedAmount, note } = req.body;
    const amount = Number(proposedAmount);
    const bidEntry = {
      sender: `${sender} (${role})`,
      amount,
      note: note || 'Counter-offer submitted',
      time: new Date().toISOString()
    };
    const result = await jobsCollection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      {
        $set: { currentOffer: amount, lastBidder: role, status: 'BARGAINING' },
        $push: { bids: bidEntry }
      },
      { returnDocument: 'after' }
    );
    await redisClient.set(`job:${req.params.id}:offer`, String(amount));
    io.emit('job:updated', result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/jobs/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await jobsCollection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: { status } },
      { returnDocument: 'after' }
    );
    io.emit('job:updated', result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4002;
server.listen(PORT, () => console.log(`Negotiation Service running on port ${PORT}`));
