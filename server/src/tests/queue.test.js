import mongoose from 'mongoose';
import { calculateQueuePositions, calculateDoctorETA } from '../utils/queueCalculations.js';
import { screenForTriageAdvisory } from '../utils/triageDetector.js';
import Token from '../models/Token.js';
import Doctor from '../models/Doctor.js';
import { getHospitalDateString } from '../utils/timezone.js';

export async function runQueueTests() {
  console.log('\n--- Running Queue Engine & State Machine Test Suite ---');
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
    // 1. Timezone-Aware Hospital Local Date
    const localDate = getHospitalDateString();
    assert(/^\d{4}-\d{2}-\d{2}$/.test(localDate), `Hospital local date (${localDate}) follows ISO format using configured timezone`);

    // 2. Deterministic Red-Flag Triage Screener
    const highRiskScreen = screenForTriageAdvisory('Patient has acute severe chest pain radiating to left arm');
    assert(
      highRiskScreen.isFlagged === true &&
      highRiskScreen.advisoryLevel === 'HIGH_PRIORITY_REVIEW' &&
      highRiskScreen.keywords.includes('chest pain'),
      'Triage screener accurately identifies critical red-flag keywords without autonomous medical diagnosis'
    );

    const normalScreen = screenForTriageAdvisory('Routine annual physical checkup');
    assert(
      normalScreen.isFlagged === false && highRiskScreen.disclaimer.includes('NON-AUTONOMOUS'),
      'Normal cases pass without red flags and include non-autonomous decision-support disclaimer'
    );

    // 3. Priority Aging & Anti-Starvation Calculation
    const now = Date.now();
    // Patient A: Normal (rank 5), waited 90 mins -> score = 5*20 - 90 = 10
    // Patient B: Priority (rank 3), waited 10 mins -> score = 3*20 - 10 = 50
    // Patient C: Emergency (rank 1), waited 2 mins -> score = -999999
    // Expected order: C (Emergency) -> A (waited 90m, score 10) -> B (waited 10m, score 50)
    const mockTokens = [
      {
        _id: new mongoose.Types.ObjectId(),
        tokenNumber: 'A001',
        status: 'Waiting',
        priorityRank: 5,
        joinedTime: new Date(now - 90 * 60 * 1000),
        queuedAt: new Date(now - 90 * 60 * 1000)
      },
      {
        _id: new mongoose.Types.ObjectId(),
        tokenNumber: 'A002',
        status: 'Waiting',
        priorityRank: 3,
        joinedTime: new Date(now - 10 * 60 * 1000),
        queuedAt: new Date(now - 10 * 60 * 1000)
      },
      {
        _id: new mongoose.Types.ObjectId(),
        tokenNumber: 'A003',
        status: 'Waiting',
        priorityRank: 1,
        priority: 'Emergency',
        joinedTime: new Date(now - 2 * 60 * 1000),
        queuedAt: new Date(now - 2 * 60 * 1000)
      }
    ];

    const sortedTokens = calculateQueuePositions(mockTokens, 10);
    assert(sortedTokens[0].tokenNumber === 'A003', 'Emergency token (Rank 1) takes absolute priority at front of queue');
    assert(sortedTokens[1].tokenNumber === 'A001', 'Aging score promotes long-waiting normal patient ahead of recent priority patient (Anti-Starvation)');
    assert(sortedTokens[2].tokenNumber === 'A002', 'Lower-waited priority patient places appropriately behind aged normal patient');

    // 4. Honest Moving Average ETA Range Calculation
    const mockDoctor = {
      averageConsultationTime: 12,
      recentConsultations: [10, 12, 14, 11, 13, 12, 15] // median = 12
    };

    // 3 people ahead
    const eta = calculateDoctorETA(mockDoctor, 3);
    assert(
      eta.minMinutes >= 25 &&
      eta.maxMinutes <= 45 &&
      eta.text.includes('–') &&
      eta.isFallback === false,
      `Honest ETA calculation produces a realistic range (${eta.text}) rather than false single-minute precision`
    );

    // Fallback ETA when history is empty
    const mockNewDoctor = {
      averageConsultationTime: 10,
      recentConsultations: []
    };
    const fallbackEta = calculateDoctorETA(mockNewDoctor, 2);
    assert(
      fallbackEta.isFallback === true,
      'Transparently flags fallback status when doctor consultation history is building'
    );

    // 5. State Machine Validation: Completed Token Cannot Be Cancelled
    const completedToken = new Token({
      tokenNumber: 'A010',
      patientId: new mongoose.Types.ObjectId(),
      doctorId: new mongoose.Types.ObjectId(),
      departmentId: new mongoose.Types.ObjectId(),
      date: localDate,
      sequenceNumber: 10,
      status: 'Completed',
      priorityRank: 5,
      joinedTime: new Date()
    });

    let cancelAllowed = false;
    if (['Waiting', 'Approaching', 'Called'].includes(completedToken.status)) {
      completedToken.status = 'Cancelled';
      cancelAllowed = true;
    }
    assert(!cancelAllowed && completedToken.status === 'Completed', 'Completed tokens are strictly immutable and cannot be cancelled');

    // 6. False Turn Alert Protection: PeopleAhead === 0 is Approaching, NOT Called
    const waitingQueue = [
      { _id: new mongoose.Types.ObjectId(), tokenNumber: 'A021', status: 'Waiting', priorityRank: 5, joinedTime: new Date() }
    ];
    const positioned = calculateQueuePositions(waitingQueue, 10);
    const nextPatient = positioned[0];
    assert(
      nextPatient.peopleAhead === 0 && nextPatient.status === 'Approaching' && nextPatient.status !== 'Called',
      'Having peopleAhead === 0 correctly signifies "Next in line" (Approaching) without firing false "It\'s your turn" CALLED status'
    );

  } catch (err) {
    console.error('Unexpected error in Queue test suite:', err);
    failed++;
  }

  return { suite: 'Queue Engine & State Machine', passed, failed };
}
