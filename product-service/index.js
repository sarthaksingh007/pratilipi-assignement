const express = require('express');
const mongoose = require('mongoose');
const amqp = require('amqplib');

// Initialize Express app
const app = express();
app.use(express.json());

const MONGO_URI = 'mongodb://localhost:27017/products'; // MongoDB connection string
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

    // Ensure the queues exist
    await channel.assertQueue('product_events', { durable: true });
    await channel.assertQueue('order_events', { durable: true });

    // Listen for product events
    channel.consume('product_events', (msg) => {
      if (msg) {
        const event = JSON.parse(msg.content.toString());
        console.log('Received product event:', event);
        // Handle the product event here
        channel.ack(msg); // Acknowledge message processed
      }
    });

    // Listen for order events to update inventory
    channel.consume('order_events', async (msg) => {
      if (msg) {
        const order = JSON.parse(msg.content.toString());
        console.log('Received order event:', order);
        await updateInventory(order.productId, order.quantity);
        channel.ack(msg);
      }
    });

    console.log('Connected to RabbitMQ and listening for product and order events');
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error);
    process.exit(1); // Exit if RabbitMQ connection fails
  }
}

// Product schema definition
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  inventory: { type: Number, required: true },
});

const Product = mongoose.model('Product', productSchema); // Product model

// Create Product Endpoint
app.post('/products', async (req, res) => {
  const { name, price, inventory } = req.body;

  try {
    const product = new Product({ name, price, inventory });
    await product.save();

    // Emit product created event
    if (channel) {
      await channel.sendToQueue('product_events', Buffer.from(JSON.stringify({ event: 'Product Created', productId: product._id })));
      console.log('Product Created event emitted:', { productId: product._id });
    }

    res.status(201).json({ message: 'Product created successfully', productId: product._id });
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ message: 'Failed to create product' });
  }
});

// Update Inventory Endpoint
app.put('/products/:id/inventory', async (req, res) => {
  const productId = req.params.id;
  const { quantity } = req.body;

  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.inventory += quantity; // Update inventory level
    await product.save();

    // Emit inventory updated event
    if (channel) {
      await channel.sendToQueue('product_events', Buffer.from(JSON.stringify({ event: 'Inventory Updated', productId: product._id })));
      console.log('Inventory Updated event emitted:', { productId: product._id });
    }

    res.status(200).json({ message: 'Inventory updated successfully', inventory: product.inventory });
  } catch (err) {
    console.error('Error updating inventory:', err);
    res.status(500).json({ message: 'Failed to update inventory' });
  }
});

// Update Product Endpoint
app.put('/products/:id', async (req, res) => {
  const productId = req.params.id;
  const { name, price, inventory } = req.body;

  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Update product details if provided
    if (name) product.name = name;
    if (price) product.price = price;
    if (inventory !== undefined) product.inventory = inventory;

    await product.save();

    // Emit product updated event
    if (channel) {
      await channel.sendToQueue('product_events', Buffer.from(JSON.stringify({ event: 'Product Updated', productId: product._id })));
      console.log('Product Updated event emitted:', { productId: product._id });
    }

    res.status(200).json({ message: 'Product updated successfully', productId: product._id });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ message: 'Failed to update product' });
  }
});

// Function to update inventory when an order is placed
async function updateInventory(productId, quantity) {
  try {
    const product = await Product.findById(productId);
    if (!product) {
      console.error(`Product with ID ${productId} not found.`);
      return;
    }

    if (product.inventory < quantity) {
      console.error(`Not enough inventory for product ID ${productId}.`);
      return; // Not enough inventory to fulfill the order
    }

    product.inventory -= quantity; // Deduct quantity from inventory
    await product.save();

    console.log(`Inventory for product ID ${productId} updated. New inventory: ${product.inventory}`);
  } catch (err) {
    console.error('Error updating inventory on order placed:', err);
  }
}

// Start the Express server and connect to RabbitMQ
async function startServer() {
  try {
    await connectRabbitMQ();

    const PORT = process.env.PORT || 4002; // Default port
    app.listen(PORT, () => {
      console.log(`Product Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start the server:', error);
    process.exit(1);
  }
}

// Initialize the service
startServer();
