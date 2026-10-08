import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { runAuthTests } from './auth.test.js';
import { runQueueTests } from './queue.test.js';
import { runPrivacyTests } from './privacy.test.js';
import { runConcurrencyTests } from './concurrency.test.js';
import { runAppointmentWorkflowTests } from './appointment.test.js';

dotenv.config();
dotenv.config({ path: 'server/.env' });

async function runMasterTestSuite() {
  console.log('====================================================');
  console.log('      MEDIQUEUE AUTOMATED VERIFICATION TEST SUITE   ');
  console.log('====================================================');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mediqueue';
  try {
    await mongoose.connect(mongoUri);
    console.log(`Connected to MongoDB at ${mongoUri}`);
  } catch (err) {
    console.error('Failed to connect to MongoDB for tests:', err.message);
  }

  const results = [];

  // 1. Auth & RBAC
  results.push(await runAuthTests());

  // 2. Queue Engine & State Machine
  results.push(await runQueueTests());

  // 3. Privacy & Public Display
  results.push(await runPrivacyTests());

  // 4. Concurrency & Load
  results.push(await runConcurrencyTests());

  // 5. Appointment & Doctor-Specific Queue Workflow
  results.push(await runAppointmentWorkflowTests());

  console.log('\n====================================================');
  console.log('                  TEST SUMMARY                      ');
  console.log('====================================================');

  let totalPassed = 0;
  let totalFailed = 0;

  for (const res of results) {
    totalPassed += res.passed;
    totalFailed += res.failed;
    const status = res.failed === 0 ? '✓ ALL PASSED' : `✗ ${res.failed} FAILED`;
    console.log(` ${res.suite.padEnd(38)} : ${status} (${res.passed} passed, ${res.failed} failed)`);
  }

  console.log('----------------------------------------------------');
  console.log(` TOTAL: ${totalPassed} Passed | ${totalFailed} Failed`);
  console.log('====================================================\n');

  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runMasterTestSuite();
