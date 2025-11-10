// Load environment variables
const NODE_ENV = process.env.NODE_ENV || 'development';
const path = require('path');
const fs = require('fs');

// Try to load .env.{NODE_ENV}, .env, or config.env
const envFiles = [
  `.env.${NODE_ENV}`,
  '.env',
  'config.env'
];

for (const envFile of envFiles) {
  const envPath = path.resolve(__dirname, envFile);
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    break;
  }
}

const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 5000;

// Validate required environment variables
const requiredEnvVars = ['DB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

// Connection event listeners
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected from MongoDB');
});

// MongoDB connection function with retry logic
const connectDB = async (retryCount = 0, maxRetries = 5) => {
  try {
    const isAtlas = process.env.DB_URI?.startsWith('mongodb+srv');
    
    const mongooseOptions = {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      bufferCommands: true,
      retryWrites: true,
      w: 'majority',
    };

    if (isAtlas) {
      mongooseOptions.serverApi = {
        version: '1',
        strict: true,
        deprecationErrors: true,
      };
      // Only allow invalid certificates in development
      if (NODE_ENV === 'development') {
        mongooseOptions.tls = true;
        mongooseOptions.tlsAllowInvalidCertificates = true;
        console.warn('⚠️ TLS certificate validation disabled (development mode)');
      }
    }

    const conn = await mongoose.connect(process.env.DB_URI, mongooseOptions);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn;
    
  } catch (error) {
    console.error(`❌ MongoDB connection error (attempt ${retryCount + 1}/${maxRetries}):`, error.message);

    // Tailored suggestions based on common error types
    if (error.message.includes('IP that isn\'t whitelisted')) {
      console.error('\n🔧 SOLUTION: Add your IP to Atlas Network Access.');
    } else if (error.message.includes('authentication failed')) {
      console.error('\n🔧 SOLUTION: Check your username/password in environment variables');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('\n🔧 SOLUTION: Verify your cluster URI in environment variables');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\n🔧 SOLUTION: Local MongoDB may not be running.');
    }

    if (retryCount < maxRetries - 1) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff
      console.log(`🔄 Retrying connection in ${delay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectDB(retryCount + 1, maxRetries);
    } else {
      console.error('❌ Max retry attempts reached. Exiting...');
      throw error;
    }
  }
};

// Graceful shutdown function
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close server
    if (global.server) {
      await new Promise((resolve) => {
        global.server.close(resolve);
      });
      console.log('✅ HTTP server closed');
    }

    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('✅ Database connection closed');
    }

    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start server only if MongoDB is fully connected
const startServer = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();

    console.log('⏳ Waiting for connection to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (mongoose.connection.readyState !== 1) {
      console.error('❌ Database connection not ready');
      throw new Error('Database connection not ready after waiting');
    }

    console.log('✅ Database connection confirmed');

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
      console.log(`📊 API available at http://<your-server-ip>:${PORT}/api`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`📅 Started at: ${new Date().toISOString()}`);
    });

    // Store server reference for graceful shutdown
    global.server = server;

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
};

startServer();