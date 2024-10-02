
This project implements a microservice architecture for an e-commerce platform, consisting of three main microservices (User, Product, and Order) and a GraphQL Gateway. Each microservice is containerized using Docker, and RabbitMQ is used for event-driven communication between the services.

## Table of Contents
- [Microservices Overview](#microservices-overview)
  - [User Service](#user-service)
  - [Product Service](#product-service)
  - [Order Service](#order-service)
  - [GraphQL Gateway](#graphql-gateway)
- [Tech Stack](#tech-stack)
- [Setup Instructions](#setup-instructions)
  - [Prerequisites](#prerequisites)
  - [Docker Setup](#docker-setup)
- [Testing the System](#testing-the-system)
  - [GraphQL Queries & Mutations](#graphql-queries--mutations)
  - [Postman Collection](#postman-collection)
- [Event-Driven Communication](#event-driven-communication)
- [Development & Contributions](#development--contributions)

## Microservices Overview

### 1. User Service

**Responsibilities:**
- User registration and authentication using JWT.
- Profile management.
- Emits and listens to events related to user actions like "User Registered" and "User Profile Updated".

**API Endpoints:**
- `POST /register`: Register a new user.
- `PUT /profile`: Update user profile.

**Events:**
- **Emits:**
  - `User Registered`
  - `User Profile Updated`
- **Listens:** None.

### 2. Product Service

**Responsibilities:**
- Manage products, including creation and inventory updates.
- Emits and listens to events related to product updates like "Product Created" and "Inventory Updated".

**API Endpoints:**
- `POST /products`: Create a new product.
- `PUT /products/:id`: Update product inventory.

**Events:**
- **Emits:**
  - `Product Created`
  - `Inventory Updated`
- **Listens:**
  - `Order Placed`

### 3. Order Service

**Responsibilities:**
- Manage order creation and status updates.
- Emits and listens to events like "Order Placed" and "Order Shipped".

**API Endpoints:**
- `POST /orders`: Place a new order.
- `PUT /orders/:id`: Update order status.

**Events:**
- **Emits:**
  - `Order Placed`
  - `Order Shipped`
- **Listens:**
  - `Product Created`
  - `User Registered`

### 4. GraphQL Gateway

**Responsibilities:**
- Exposes a unified GraphQL API for the frontend.
- Aggregates data from the microservices (User, Product, and Order) using REST endpoints and RabbitMQ for event communication.

**GraphQL Endpoints:**
- **Queries:**
  - `users`: Get a list of all users.
  - `products`: Get a list of all products.
  - `orders`: Get a list of all orders.
- **Mutations:**
  - `registerUser`: Register a new user.
  - `createProduct`: Create a new product.
  - `placeOrder`: Place a new order.

## Tech Stack
- **Node.js**: Backend framework for each microservice.
- **Express.js**: Web framework for building REST APIs.
- **MongoDB**: Database for storing data (user, product, and order data).
- **GraphQL**: Unified API for client interaction.
- **RabbitMQ**: Message broker for handling event-driven communication between microservices.
- **Docker**: Containerization of all services.
- **Apollo Server**: GraphQL server used in the Gateway.

## Setup Instructions

### Prerequisites
- Docker and Docker Compose installed on your machine.

### Docker Setup

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   cd <repository_root>
   ```

2. **Build and run all services with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

   This will start the following services:
   - `zookeeper` on port `2181`
   - `kafka` on port `9092`
   - `rabbitmq` on ports `5672` and `15672` (management UI)
   - `mongo` on port `27017`
   - `user-service` on port `4001`
   - `product-service` on port `4002`
   - `order-service` on port `4003`
   - `graphql-gateway` on port `4000`

### Testing the System

#### GraphQL Queries & Mutations

You can test the system using the **GraphQL Playground** available at:
```
http://localhost:4000/graphql
```

Here are some example queries and mutations:

- **Register User:**
  ```graphql
  mutation {
    registerUser(username: "JohnDoe", password: "password123", email: "john@example.com")
  }
  ```

- **Get All Users:**
  ```graphql
  query {
    users {
      id
      username
      email
    }
  }
  ```

- **Create Product:**
  ```graphql
  mutation {
    createProduct(name: "Laptop", price: 999.99, inventory: 100)
  }
  ```

- **Place Order:**
  ```graphql
  mutation {
    placeOrder(userId: "1", productId: "1", quantity: 1)
  }
  ```

#### Postman Collection

You can import the provided **Postman Collection** to test REST APIs for each microservice and the GraphQL Gateway. The collection includes endpoints for:
- Registering users
- Creating products
- Placing orders

> **Note:** Make sure to modify the Postman environment to point to the appropriate service URLs (e.g., `localhost:4001` for User Service).

## Event-Driven Communication

Each microservice communicates asynchronously using RabbitMQ for emitting and consuming events.

### Event Flow:
- **User Registered:** Emitted by the User Service after user registration. Listened to by the Order and Product Services for state updates.
- **Product Created:** Emitted by the Product Service after product creation. Listened to by the Order Service.
- **Order Placed:** Emitted by the Order Service when an order is placed. Listened to by the Product Service to update inventory.

### Event Resilience:
RabbitMQ is used with proper error handling and retries. You can implement Dead Letter Queues (DLQs) to handle event failures.

## Development & Contributions

### Local Development

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   ```

2. **Install dependencies for each service:**
   ```bash
   cd user-service && npm install
   cd product-service && npm install
   cd order-service && npm install
   cd graphql-gateway && npm install
   ```

3. **Start the services locally:**
   - For each service, you can use:
     ```bash
     npm start
     ```

### Contributions

Feel free to fork this repository and submit pull requests. All contributions, including bug fixes, new features, and documentation improvements, are welcome.

---

### License

This project is open-source and available under the [MIT License](./LICENSE).

---

This README provides comprehensive instructions and an overview of the project. You can further customize it based on your specific project structure or additional services you plan to include.
