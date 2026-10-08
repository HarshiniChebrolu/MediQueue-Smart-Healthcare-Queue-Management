import { sanitizeForPublicDisplay } from '../socket/socketHandler.js';

export async function runPrivacyTests() {
  console.log('\n--- Running Patient Data Privacy & Public Display Test Suite ---');
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
    // 1. Raw Sensitive Queue Data
    const rawTokens = [
      {
        tokenNumber: 'A101',
        status: 'Called',
        patientName: 'John Doe',
        patientPhone: '+919876543210',
        reasonForVisit: 'Severe chest pain radiating to left arm',
        medicalConditions: 'Hypertension, Type 2 Diabetes',
        priority: 'Emergency',
        departmentName: 'Cardiology',
        doctorName: 'Dr. Sarah Jenkins',
        roomNumber: 'Cardio-102'
      },
      {
        tokenNumber: 'A102',
        status: 'Waiting',
        patientName: 'Jane Smith',
        patientPhone: '+919123456789',
        reasonForVisit: 'Follow up on blood test',
        priority: 'Normal',
        departmentName: 'Cardiology',
        doctorName: 'Dr. Sarah Jenkins',
        roomNumber: 'Cardio-102'
      }
    ];

    // 2. Sanitize for Public TV Screen
    const publicSafe = sanitizeForPublicDisplay(rawTokens);

    // 3. Verify zero PII is leaked
    const jsonStr = JSON.stringify(publicSafe);
    assert(!jsonStr.includes('John Doe') && !jsonStr.includes('Jane Smith'), 'Patient names are completely stripped from public display payload');
    assert(!jsonStr.includes('9876543210') && !jsonStr.includes('9123456789'), 'Patient phone numbers are completely stripped from public display payload');
    assert(!jsonStr.includes('chest pain') && !jsonStr.includes('Hypertension'), 'Medical symptoms, conditions, and reasons for visit are completely stripped');
    assert(!jsonStr.includes('reasonForVisit') && !jsonStr.includes('medicalConditions'), 'PII fields are non-existent in the public data structure');

    // 4. Verify safe public fields are preserved
    assert(publicSafe[0].tokenNumber === 'A101' && publicSafe[0].status === 'Called', 'Safe display tokens and statuses are preserved');
    assert(publicSafe[0].doctorName === 'Dr. Sarah Jenkins' && publicSafe[0].roomNumber === 'Cardio-102', 'Doctor name and consultation room are visible for patient navigation');

  } catch (err) {
    console.error('Unexpected error in Privacy test suite:', err);
    failed++;
  }

  return { suite: 'Data Privacy & Public Display', passed, failed };
}
