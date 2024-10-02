const amqp = require('amqplib');

let channel=null;

const connectRabbitMQ = async () => {
  while (!channel) {
    try {
      const connection = await amqp.connect('amqp://localhost');
      channel = await connection.createChannel();
      await channel.assertQueue('user_events');
      console.log('Connected to RabbitMQ and listening for events on "user_events" queue');
    } catch (error) {
      console.error('Error connecting to RabbitMQ:', error);
      console.log('Retrying connection in 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};


const publishUserEvent = async (event) => {
  try {
    if (!channel) {
      console.log('Waiting for RabbitMQ channel to be ready...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!channel) {
        throw new Error('RabbitMQ channel is not initialized');
      }
    }
    await channel.sendToQueue('user_events', Buffer.from(JSON.stringify(event)));
  } catch (error) {
    console.error('Failed to publish event:', error);
  }
};

module.exports = {
  connectRabbitMQ,
  publishUserEvent,
};
