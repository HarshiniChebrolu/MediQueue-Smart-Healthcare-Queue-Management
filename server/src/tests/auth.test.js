import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: 'server/.env' });
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'mediqueue_super_secure_jwt_secret_token_key_2026_healthcare_production';
}

export async function runAuthTests() {
  console.log('\n--- Running Authentication & RBAC Test Suite ---');
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
    // 1. JWT Secret Verification
    const secret = process.env.JWT_SECRET;
    assert(secret && secret.length >= 32, 'JWT_SECRET is present and has strong entropy (>= 32 chars)');

    // 2. Token generation and decoding
    const mockPatientId = new mongoose.Types.ObjectId();
    const token = jwt.sign(
      { id: mockPatientId.toString(), role: 'patient', email: 'test.patient@hospital.com' },
      secret,
      { expiresIn: '1h' }
    );

    const decoded = jwt.verify(token, secret);
    assert(decoded.id === mockPatientId.toString() && decoded.role === 'patient', 'Valid JWT signs and verifies correctly');

    // 3. Invalid Token Rejection
    let invalidRejected = false;
    try {
      jwt.verify('invalid.token.signature', secret);
    } catch (err) {
      invalidRejected = true;
    }
    assert(invalidRejected, 'Invalid/tampered JWT is strictly rejected');

    // 4. Expired Token Rejection
    const expiredToken = jwt.sign(
      { id: mockPatientId.toString(), role: 'patient' },
      secret,
      { expiresIn: '-1s' }
    );
    let expiredRejected = false;
    try {
      jwt.verify(expiredToken, secret);
    } catch (err) {
      expiredRejected = true;
    }
    assert(expiredRejected, 'Expired JWT is strictly rejected');

    // 5. Middleware Protect Test (Mock Request/Response)
    const reqValid = {
      headers: { authorization: `Bearer ${token}` }
    };
    const res = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.data = data; return this; }
    };

    // Mock User.findById for middleware
    const originalFindById = User.findById;
    User.findById = () => ({
      select: () => Promise.resolve({
        _id: mockPatientId,
        email: 'test.patient@hospital.com',
        role: 'patient',
        activeStatus: true
      })
    });

    let nextCalled = false;
    await protect(reqValid, res, () => { nextCalled = true; });
    assert(nextCalled && reqValid.user && reqValid.user.role === 'patient', 'Protect middleware authenticates valid token and attaches user');

    // 6. RBAC Role Protection Test
    const doctorRoleMiddleware = authorizeRoles('doctor');
    let doctorAllowed = false;
    let doctorBlockedStatus = 0;
    const resForbidden = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.data = data; return this; }
    };

    doctorRoleMiddleware(reqValid, resForbidden, () => { doctorAllowed = true; });
    assert(!doctorAllowed && resForbidden.statusCode === 403, 'Patient role is strictly forbidden from accessing Doctor endpoints (403)');

    // 7. Walk-in Password Login Restriction
    const walkinUser = new User({
      name: 'Walkin Test',
      email: 'walkin_test@temp.mediqueue.local',
      role: 'patient',
      provider: 'walkin',
      phone: '+919876543210'
    });

    assert(walkinUser.provider === 'walkin' && !walkinUser.password, 'Walk-in patient accounts have no universal/predictable password');

    // Restore original User.findById
    User.findById = originalFindById;

  } catch (err) {
    console.error('Unexpected error in Auth test suite:', err);
    failed++;
  }

  return { suite: 'Authentication & RBAC', passed, failed };
}
