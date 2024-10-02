const express = require("express");
const { ApolloServer, gql } = require("apollo-server-express");
const axios = require("axios");

const typeDefs = gql`
  type User {
    id: ID!
    username: String!
    email: String!
  }

  type Product {
    id: ID!
    name: String!
    price: Float!
    inventory: Int!
  }

  type Order {
    id: ID!
    userId: ID!
    productId: ID!
    quantity: Int!
    status: String!
  }

  type Query {
    users: [User]
    products: [Product]
    orders: [Order]
  }

  type Mutation {
    registerUser(username: String!, password: String!, email: String!): String
    updateUserProfile(id: ID!, username: String, email: String): String
    createProduct(name: String!, price: Float!, inventory: Int!): String
    updateProductInventory(id: ID!, quantity: Int!): String
    placeOrder(userId: ID!, productId: ID!, quantity: Int!): String
    updateOrderStatus(orderId: ID!, status: String!): String
  }
`;

// GraphQL Resolvers
const resolvers = {
  Query: {
    users: async () => {
      const response = await axios.get('http://localhost:4001/users');
      return response.data;
    },
    products: async () => {
      const response = await axios.get('http://localhost:4002/products');
      return response.data;
    },
    orders: async () => {
      const response = await axios.get('http://localhost:4003/orders');
      return response.data;
    },
  },
  Mutation: {
    registerUser: async (_, { username, password, email }) => {
      await axios.post('http://localhost:4001/register', { username, password, email });
      return 'User registered';
    },
    updateUserProfile: async (_, { id, username, email }, context) => {
      await axios.put(`http://localhost:4001/profile/${id}`, { username, email }, {
          headers: { Authorization: `Bearer ${context.token}` },
      });
      return 'User Updated';
  },
  
    createProduct: async (_, { name, price, inventory }) => {
      await axios.post('http://localhost:4002/products', { name, price, inventory });
      return 'Product created';
    },
    updateProductInventory: async (_, { id, quantity }) => {
      await axios.put(`http://localhost:4002/products/${id}`, { quantity });
      return 'Product inventory updated';
    },
    placeOrder: async (_, { userId, productId, quantity }) => {
      await axios.post('http://localhost:4003/orders', { userId, productId, quantity });
      return 'Order placed';
    },
    updateOrderStatus: async (_, { orderId, status }) => {
      await axios.put(`http://localhost:4003/orders/${orderId}`, { status });
      return 'Order status updated';
    },
  },
};


async function startApolloServer() {
  const server = new ApolloServer({ typeDefs, resolvers });
  const app = express();
  await server.start();
  server.applyMiddleware({ app });

  app.listen(4000, () => {
    console.log("GraphQL Gateway running on http://localhost:4000/graphql");
  });
}

startApolloServer();
