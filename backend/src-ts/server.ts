import dotenv from 'dotenv';
import app from './app';
import { connectDatabase } from './config/database';
import { mlsSyncJob } from './jobs/mls-sync.job';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected successfully');

    // Start MLS sync job (only in production or if explicitly enabled)
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_MLS_SYNC === 'true') {
      mlsSyncJob.start();
      console.log('✅ MLS sync job started');
    } else {
      console.log('ℹ️  MLS sync job disabled (set ENABLE_MLS_SYNC=true to enable)');
    }

    // Start server
    app.listen(PORT, () => {
      console.log('🚀 Server running on port', PORT);
      console.log(`📍 http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();
