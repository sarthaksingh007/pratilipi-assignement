const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const amqp = require('amqplib');

const app = express();
app.use(express.json());

const MONGO_URI = 'mongodb://localhost:27017/users';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const RABBITMQ_URL = 'amqp://localhost';

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});

// RabbitMQ Channel
let channel;

// Connect to RabbitMQ and setup listeners
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertQueue('user_events', { durable: true });

    // Listen for incoming events
    channel.consume('user_events', (msg) => {
      if (msg !== null) {
        const event = JSON.parse(msg.content.toString());
        console.log('Received event:', event);

        handleEvent(event);
        channel.ack(msg);
      }
    });

    console.log('RabbitMQ connected, listening on "user_events" queue');
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
    process.exit(1);
  }
}

// Event handler
function handleEvent(event) {
  switch (event.event) {
    case 'User Registered':
      console.log(`Handling event: User Registered for userId: ${event.userId}`);
      break;

    case 'User Profile Updated':
      console.log(`Handling event: User Profile Updated for userId: ${event.userId}`);
      break;

    default:
      console.log('Unknown event:', event);
  }
}

// User Schema and Model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

// JWT Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // No token found

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Invalid token
    req.user = user;
    next();
  });
}

// User Registration Endpoint
app.post('/register', async (req, res) => {
  const { username, password, email } = req.body;

  try {
    const newUser = new User({ username, password, email });
    await newUser.save();

    if (channel) {
      const event = { event: 'User Registered', userId: newUser._id };
      channel.sendToQueue('user_events', Buffer.from(JSON.stringify(event)));
      console.log('User Registered event emitted:', event);
    }

    // Create and return a JWT token
    const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ message: 'User registered successfully', token });
  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({ message: 'Failed to register user' });
  }
});

// User Profile Update Endpoint
app.put('/profile/:id', async (req, res) => {
  const { username, email } = req.body;

  console.log(req.body);
  

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Update user profile
    user.username = username || user.username;
    user.email = email || user.email;
    await user.save();

    if (channel) {
      const event = { event: 'User Profile Updated', userId: user._id };
      channel.sendToQueue('user_events', Buffer.from(JSON.stringify(event)));
      console.log('User Profile Updated event emitted:', event);
    }

    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Start the Express server and connect to RabbitMQ
async function startServer() {
  try {
    await connectRabbitMQ();

    const PORT = process.env.PORT || 4001;
    app.listen(PORT, () => {
      console.log(`User Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start the server:', error);
    process.exit(1);
  }
}

startServer();
