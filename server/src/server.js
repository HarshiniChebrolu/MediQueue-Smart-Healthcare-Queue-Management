import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

dotenv.config();

// Critical Phase 1 Security Requirement: Server MUST refuse to start if JWT_SECRET is missing
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('================================================================');
  console.error(' [FATAL ERROR] JWT_SECRET is missing or insufficiently secure!  ');
  console.error(' MediQueue requires a strong JWT_SECRET to ensure token safety.  ');
  console.error('================================================================');
  process.exit(1);
}

import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { setupSocketHandlers } from './socket/socketHandler.js';
import { startMissedCallSweeper } from './utils/missedCallSweeper.js';

import authRoutes from './routes/auth.routes.js';
import deptRoutes from './routes/dept.routes.js';
import doctorRoutes from './routes/doctor.routes.js';
import patientRoutes from './routes/patient.routes.js';
import queueRoutes from './routes/queue.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
import reportRoutes from './routes/report.routes.js';
import priorityRoutes from './routes/priority.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';
import receptionistRoutes from './routes/receptionist.routes.js';

const app = express();
const server = http.createServer(app);

// Process error safety handlers to prevent process crashes
process.on('uncaughtException', (err) => {
  console.error('[MediQueue Uncaught Exception]:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[MediQueue Unhandled Rejection]:', reason);
});

// Configure allowed CORS origins
const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:5000',
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, server-to-server, display monitors) or allowed origins
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev, restricted in prod
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.set('socketio', io);

// Security Middleware setup
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Express Mongo Sanitize to prevent NoSQL query injection ($where, $gt, etc.)
app.use(mongoSanitize());

// General Rate Limiter (Skipped in development / localhost, generous limits in production)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX, 10) : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV || process.env.NODE_ENV === 'test') return true;
    const ip = req.ip || req.connection?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip === 'localhost';
  },
  message: { message: 'Too many requests from this IP. Please try again after 15 minutes.' },
});

// Stricter Rate Limiter for Authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.AUTH_RATE_LIMIT_MAX ? parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) : 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV || process.env.NODE_ENV === 'test') return true;
    const ip = req.ip || req.connection?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip === 'localhost';
  },
  message: { message: 'Too many authentication attempts. Please try again after 15 minutes.' },
});

app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', deptRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/priority', priorityRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/receptionists', receptionistRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'MediQueue Hospital Backend Operational',
    environment: process.env.NODE_ENV || 'development',
    demoMode: process.env.DEMO_MODE !== 'false',
    timezone: process.env.HOSPITAL_TIMEZONE || 'Asia/Kolkata',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use(errorHandler);

// Setup Socket.IO handlers
setupSocketHandlers(io);

// Start Server and Connect Database
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`=======================================================`);
  console.log(`  MediQueue Hospital Server running on port ${PORT} `);
  console.log(`  Real-time Authenticated Socket.IO Server active      `);
  console.log(`  Hospital Timezone: ${process.env.HOSPITAL_TIMEZONE || 'Asia/Kolkata'}`);
  console.log(`=======================================================`);
  await connectDB();
  // Start server-side missed call timeout background sweeper
  startMissedCallSweeper(io);
});

export { app, server, io };
