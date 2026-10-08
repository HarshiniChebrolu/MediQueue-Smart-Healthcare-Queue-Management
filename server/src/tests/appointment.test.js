import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Doctor } from '../models/Doctor.js';
import { Department } from '../models/Department.js';
import { Token } from '../models/Token.js';
import { Appointment } from '../models/Appointment.js';
import { QueueHistory } from '../models/QueueHistory.js';
import { getHospitalDateString } from '../utils/timezone.js';

export async function runAppointmentWorkflowTests() {
  console.log('\n--- Running Doctor-Specific Queue & Appointment Workflow Test Suite ---');
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
    const todayStr = getHospitalDateString();

    // 1. Verify Doctor Specific Queues Isolation
    const docArthur = await User.findOne({ email: 'dr.arthur@mediqueue.com' });
    const doctorArthurRecord = await Doctor.findOne({ userId: docArthur._id });

    const docSarah = await User.findOne({ email: 'dr.sarah@mediqueue.com' });
    const doctorSarahRecord = await Doctor.findOne({ userId: docSarah._id });

    assert(doctorArthurRecord && doctorSarahRecord, 'Both Dr. Arthur and Dr. Sarah records exist');

    const arthurTokens = await Token.find({ doctorId: doctorArthurRecord._id, dateString: todayStr });
    const sarahTokens = await Token.find({ doctorId: doctorSarahRecord._id, dateString: todayStr });

    assert(arthurTokens.length > 0, `Dr. Arthur has dedicated queue (${arthurTokens.length} tokens)`);
    assert(sarahTokens.length > 0, `Dr. Sarah has dedicated queue (${sarahTokens.length} tokens)`);

    const hasOverlap = arthurTokens.some((tA) =>
      sarahTokens.some((tS) => String(tA._id) === String(tS._id))
    );
    assert(!hasOverlap, 'Zero queue token overlap between different doctors (Strict isolation preserved)');

    // 2. Verify Appointment Model & Token Synchronization
    const activeAppts = await Appointment.find({ doctorId: doctorArthurRecord._id, appointmentDate: todayStr });
    assert(activeAppts.length > 0, `Dr. Arthur has ${activeAppts.length} appointments scheduled today`);

    const sampleAppt = activeAppts[0];
    assert(sampleAppt.tokenNumber && sampleAppt.timeSlot, `Appointment contains valid tokenNumber (${sampleAppt.tokenNumber}) and timeSlot (${sampleAppt.timeSlot})`);

    // 3. Verify Clinical Documentation Recording
    const historyWithNotes = await QueueHistory.find({ doctorId: doctorArthurRecord._id, status: 'Completed' });
    assert(historyWithNotes.length > 0, 'Consultation history contains completed clinical records');
    const noteEntry = historyWithNotes.find((h) => h.diagnosis && h.prescription);
    assert(!!noteEntry, `Clinical history properly stores diagnosis and prescription ("${noteEntry?.diagnosis}")`);

  } catch (err) {
    console.error('Unexpected error in Appointment test suite:', err);
    failed++;
  }

  return { suite: 'Doctor-Specific Queue & Appointment Flow', passed, failed };
}
