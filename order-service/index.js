const express = require('express');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const axios = require('axios');

// Initialize Express app
const app = express();
app.use(express.json());

// MongoDB and RabbitMQ configuration
const MONGO_URI = 'mongodb://localhost:27017/orders'; // MongoDB connection string
const RABBITMQ_URL = 'amqp://localhost'; // RabbitMQ connection string

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1); // Exit if DB connection fails
  });

// RabbitMQ Channel
let channel;

// Function to connect to RabbitMQ and setup listeners
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Ensure the queue exists for order events
    await channel.assertQueue('order_events', { durable: true });
    await channel.assertQueue('product_events', { durable: true }); // For product-related events
    await channel.assertQueue('user_events', { durable: true }); // For user-related events

    // Listen for product events
    channel.consume('product_events', (msg) => {
      if (msg) {
        const event = JSON.parse(msg.content.toString());
        console.log('Received product event:', event);
        // Handle product-related events (if needed)
        channel.ack(msg); // Acknowledge message processed
      }
    });

    // Listen for user events
    channel.consume('user_events', (msg) => {
      if (msg) {
        const event = JSON.parse(msg.content.toString());
        console.log('Received user event:', event);
        // Handle user-related events (if needed)
        channel.ack(msg); // Acknowledge message processed
      }
    });

    console.log('Connected to RabbitMQ and listening for order, product, and user events');
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error);
    process.exit(1); // Exit if RabbitMQ connection fails
  }
}

// Order Schema definition
const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  productId: { type: String, required: true },
  quantity: { type: Number, required: true },
  status: { type: String, default: 'Placed' },
});

const Order = mongoose.model('Order', orderSchema); // Order model

// Create Order Endpoint
app.post('/orders', async (req, res) => {
  const { userId, productId, quantity } = req.body;

  // Validate request data
  if (!userId || !productId || !quantity) {
    return res.status(400).json({ message: 'User ID, Product ID, and Quantity are required.' });
  }

  // Create new order
  const order = new Order({ userId, productId, quantity, status: 'Placed' });

  try {
    await order.save(); // Save order to the database

    // Publish order placed event
    if (channel) {
      await channel.sendToQueue('order_events', Buffer.from(JSON.stringify({
        event: 'Order Placed',
        productId,
        quantity
      })));
      console.log('Order Placed event emitted:', { productId, quantity });
    }

    res.status(201).json({ message: 'Order placed successfully', orderId: order._id });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ message: 'Failed to place order' });
  }
});

// Ship Order Endpoint
app.post('/orders/:id/ship', async (req, res) => {
  const orderId = req.params.id;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update order status to "Shipped"
    order.status = 'Shipped';
    await order.save();

    // Emit order shipped event
    if (channel) {
      await channel.sendToQueue('order_events', Buffer.from(JSON.stringify({
        event: 'Order Shipped',
        orderId: order._id
      })));
      console.log('Order Shipped event emitted:', { orderId: order._id });
    }

    res.status(200).json({ message: 'Order shipped successfully', orderId: order._id });
  } catch (err) {
    console.error('Error shipping order:', err);
    res.status(500).json({ message: 'Failed to ship order' });
  }
});

// Start the Express server and connect to RabbitMQ
async function startServer() {
  try {
    await connectRabbitMQ(); // Connect to RabbitMQ before starting the server

    const PORT = process.env.PORT || 4003; // Default port
    app.listen(PORT, () => {
      console.log(`Order Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start the server:', error);
    process.exit(1);
  }
}

// Initialize the service
startServer();
