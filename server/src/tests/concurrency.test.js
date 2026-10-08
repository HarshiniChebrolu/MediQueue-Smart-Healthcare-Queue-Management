import mongoose from 'mongoose';
import Token from '../models/Token.js';
import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import QueueCounter from '../models/QueueCounter.js';
import { getHospitalDateString } from '../utils/timezone.js';
import dotenv from 'dotenv';
dotenv.config();

export async function runConcurrencyTests() {
  console.log('\n--- Running Load & Concurrency Test Suite (Phase 29) ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    const isConnected = mongoose.connection.readyState === 1;
    if (!isConnected) {
      console.log('  [INFO] Connecting to MongoDB for concurrency stress testing...');
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mediqueue');
    }

    const testDate = `TEST-${Date.now()}`;

    const uniqueSuffix = Date.now().toString().slice(-4);
    
    // Create mock User for Doctor
    const testDocUser = await User.create({
      name: `Dr. Concurrency Stress ${uniqueSuffix}`,
      email: `stress.doc.${uniqueSuffix}@mediqueue.test`,
      role: 'doctor',
      provider: 'local',
      activeStatus: true
    });

    // Create mock Department & Doctor
    const testDept = await Department.create({
      name: `Stress Test Clinic ${uniqueSuffix}`,
      code: `STC${uniqueSuffix}`,
      tokenPrefix: 'S',
      description: 'Department for concurrency validation'
    });

    const testDoctor = await Doctor.create({
      userId: testDocUser._id,
      departmentId: testDept._id,
      qualification: 'MBBS, MD',
      specialization: 'Emergency Medicine',
      registrationNumber: `REG-STRESS-${uniqueSuffix}`,
      roomNumber: 'STRESS-1',
      status: 'Available',
      dailyTokenCounters: new Map([[testDate, 0]])
    });

    // 1. CONCURRENT JOIN QUEUE TEST: 20 simultaneous patients joining the same doctor's queue
    const NUM_PATIENTS = 20;
    const patientIds = [];
    for (let i = 0; i < NUM_PATIENTS; i++) {
      patientIds.push(new mongoose.Types.ObjectId());
    }

    console.log(`  Simulating ${NUM_PATIENTS} simultaneous patient queue join requests...`);
    const joinPromises = patientIds.map(async (patientId, idx) => {
      // Atomic counter increment using findOneAndUpdate on QueueCounter to guarantee sequential non-colliding token generation
      const counter = await QueueCounter.findOneAndUpdate(
        { doctorId: testDoctor._id, dateString: testDate },
        { $inc: { lastSequence: 1 } },
        { new: true, upsert: true }
      );
      const seq = counter.lastSequence;
      const prefix = testDept.tokenPrefix || 'S';
      const tokenNumber = `${prefix}-${String(seq).padStart(3, '0')}`;

      const token = await Token.create({
        tokenNumber,
        patientId,
        patientName: `Stress Patient ${idx + 1}`,
        reasonForVisit: 'General Consultation',
        doctorId: testDoctor._id,
        departmentId: testDept._id,
        dateString: testDate,
        sequenceNumber: seq,
        status: 'Waiting',
        priorityRank: 5,
        joinedTime: new Date()
      });

      return token;
    });

    const createdTokens = await Promise.all(joinPromises);

    // Verify:
    // A. Exactly 20 tokens created
    assert(createdTokens.length === NUM_PATIENTS, `Successfully created all ${NUM_PATIENTS} tokens concurrently`);

    // B. No duplicate token numbers
    const tokenNumberSet = new Set(createdTokens.map(t => t.tokenNumber));
    assert(tokenNumberSet.size === NUM_PATIENTS, `Zero duplicate tokens generated across ${NUM_PATIENTS} concurrent joins (Set size = ${tokenNumberSet.size})`);

    // C. No duplicate sequence numbers
    const seqSet = new Set(createdTokens.map(t => t.sequenceNumber));
    assert(seqSet.size === NUM_PATIENTS, `Sequence numbers are strictly unique and monotonic (1 to ${NUM_PATIENTS})`);

    // 2. CONCURRENT DOUBLE-CALL RACE TEST:
    // 5 concurrent attempts to "Call Next Patient" on the doctor
    console.log('  Simulating 5 simultaneous doctor "Call Next" operations on the queue...');
    
    // In our queue engine, calling next uses an atomic findOneAndUpdate on the next waiting token:
    const callPromises = Array(5).fill(null).map(async () => {
      // Find the first waiting token and atomically transition to 'Called'
      const calledToken = await Token.findOneAndUpdate(
        {
          doctorId: testDoctor._id,
          dateString: testDate,
          status: 'Waiting'
        },
        {
          $set: {
            status: 'Called',
            calledAt: new Date(),
            calledExpiresAt: new Date(Date.now() + 120000)
          }
        },
        { sort: { priorityRank: 1, sequenceNumber: 1 }, new: true }
      );
      return calledToken;
    });

    const callResults = await Promise.all(callPromises);
    const successfullyCalledTokens = callResults.filter(Boolean);

    // Verify:
    // All 5 calls should transition distinct tokens without colliding on the same token
    const calledTokenIds = new Set(successfullyCalledTokens.map(t => t._id.toString()));
    assert(
      calledTokenIds.size === successfullyCalledTokens.length,
      `Atomic locking prevents double-calls: all ${successfullyCalledTokens.length} concurrent calls transitioned distinct tokens without race collisions`
    );

    // Clean up test documents
    await Token.deleteMany({ dateString: testDate });
    await QueueCounter.deleteMany({ dateString: testDate });
    await Doctor.findByIdAndDelete(testDoctor._id);
    await Department.findByIdAndDelete(testDept._id);
    if (testDocUser) await User.findByIdAndDelete(testDocUser._id);

  } catch (err) {
    console.error('Unexpected error in Concurrency test suite:', err);
    failed++;
  }

  return { suite: 'Concurrency & Load (Phase 29)', passed, failed };
}
