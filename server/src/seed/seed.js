import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { Department } from '../models/Department.js';
import { Doctor } from '../models/Doctor.js';
import { Token } from '../models/Token.js';
import { Appointment } from '../models/Appointment.js';
import { QueueCounter } from '../models/QueueCounter.js';
import { Announcement } from '../models/Announcement.js';
import { Notification } from '../models/Notification.js';
import { QueueHistory } from '../models/QueueHistory.js';
import { PriorityRequest } from '../models/PriorityRequest.js';
import { AuditLog } from '../models/AuditLog.js';
import { getHospitalDateString } from '../utils/timezone.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mediqueue';
    await mongoose.connect(mongoUri);
    console.log('[MediQueue Seed] Connected to MongoDB for comprehensive multi-department seed...');

    await User.deleteMany({});
    await Department.deleteMany({});
    await Doctor.deleteMany({});
    await Token.deleteMany({});
    await Appointment.deleteMany({});
    await QueueCounter.deleteMany({});
    await Announcement.deleteMany({});
    await Notification.deleteMany({});
    await QueueHistory.deleteMany({});
    await PriorityRequest.deleteMany({});
    await AuditLog.deleteMany({});

    const todayStr = getHospitalDateString();

    // 1. Departments
    const deptOPD = await Department.create({
      name: 'General Medicine & OPD',
      code: 'OPD',
      tokenPrefix: 'GM',
      description: 'Comprehensive general outpatient consultations and preventive physician care.',
      icon: 'Stethoscope',
      activeStatus: true,
    });

    const deptCardio = await Department.create({
      name: 'Cardiology & Heart Care',
      code: 'CARD',
      tokenPrefix: 'CARD',
      description: 'Advanced cardiac diagnosis, ECG monitoring, echo, and preventive heart care.',
      icon: 'HeartPulse',
      activeStatus: true,
    });

    const deptPediatrics = await Department.create({
      name: 'Pediatrics & Child Health',
      code: 'PED',
      tokenPrefix: 'PED',
      description: 'Specialized neonatal, developmental, and pediatric outpatient medical care.',
      icon: 'Baby',
      activeStatus: true,
    });

    const deptOrtho = await Department.create({
      name: 'Orthopedics & Joint Care',
      code: 'ORTH',
      tokenPrefix: 'ORTH',
      description: 'Bone, joint evaluation, sports injuries, musculoskeletal rehabilitation, and trauma care.',
      icon: 'Bone',
      activeStatus: true,
    });

    // 2. Staff & Admin Accounts
    const adminUser = await User.create({
      name: 'Dr. James Sterling (Chief Medical Officer)',
      email: 'admin@mediqueue.com',
      mobile: '+1 800 555 0100',
      password: 'Admin123!',
      role: 'admin',
      gender: 'Male',
      activeStatus: true,
      profileCompleted: true,
    });

    const receptionistUser = await User.create({
      name: 'Elena Rostova (Head Receptionist)',
      email: 'receptionist@mediqueue.com',
      mobile: '+1 800 555 0199',
      password: 'Password123!',
      role: 'receptionist',
      gender: 'Female',
      activeStatus: true,
      profileCompleted: true,
    });

    // Doctor 1 (General Medicine)
    const docUser1 = await User.create({
      name: 'Dr. Arthur Pendelton, MD',
      email: 'dr.arthur@mediqueue.com',
      mobile: '+1 800 555 0122',
      password: 'Doctor123!',
      role: 'doctor',
      gender: 'Male',
      activeStatus: true,
      profileCompleted: true,
      photoURL: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=600',
    });

    const doctor1 = await Doctor.create({
      userId: docUser1._id,
      departmentId: deptOPD._id,
      qualification: 'MBBS, MD (Internal Medicine), DM',
      specialization: 'Senior Consultant Physician',
      registrationNumber: 'MC-2018-9942',
      experience: 15,
      roomNumber: 'Room 101',
      startTime: '08:30 AM',
      endTime: '05:00 PM',
      consultationFee: 500,
      defaultDuration: 10,
      avgConsultationDuration: 10,
      totalCompletedConsultations: 24,
      totalConsultationTimeMinutes: 240,
      recentConsultations: [
        { durationMinutes: 10, completedAt: new Date(Date.now() - 120 * 60000) },
        { durationMinutes: 12, completedAt: new Date(Date.now() - 90 * 60000) },
        { durationMinutes: 8, completedAt: new Date(Date.now() - 60 * 60000) },
        { durationMinutes: 11, completedAt: new Date(Date.now() - 30 * 60000) },
      ],
      biography: 'Senior Consultant Physician with 15+ years experience in OPD care, chronic illness management, and diagnostic medicine. Trained at Johns Hopkins.',
      profileImage: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=600',
      status: 'Available',
      activeStatus: true,
    });

    // Doctor 2 (Cardiology)
    const docUser2 = await User.create({
      name: 'Dr. Sarah Jenkins, MD, DM',
      email: 'dr.sarah@mediqueue.com',
      mobile: '+1 800 555 0133',
      password: 'Doctor123!',
      role: 'doctor',
      gender: 'Female',
      activeStatus: true,
      profileCompleted: true,
      photoURL: 'https://images.unsplash.com/photo-1594824813501-4837e1c74678?auto=format&fit=crop&q=80&w=600',
    });

    const doctor2 = await Doctor.create({
      userId: docUser2._id,
      departmentId: deptCardio._id,
      qualification: 'MBBS, MD (Cardiology), FACC',
      specialization: 'Consultant Cardiologist & Heart Specialist',
      registrationNumber: 'MC-2019-3312',
      experience: 12,
      roomNumber: 'Room 204',
      startTime: '09:00 AM',
      endTime: '04:30 PM',
      consultationFee: 750,
      defaultDuration: 15,
      avgConsultationDuration: 15,
      totalCompletedConsultations: 18,
      totalConsultationTimeMinutes: 270,
      recentConsultations: [
        { durationMinutes: 15, completedAt: new Date(Date.now() - 100 * 60000) },
        { durationMinutes: 14, completedAt: new Date(Date.now() - 50 * 60000) },
      ],
      biography: 'Interventional cardiologist specializing in cardiovascular wellness, hypertension management, and preventive heart screening.',
      profileImage: 'https://images.unsplash.com/photo-1594824813501-4837e1c74678?auto=format&fit=crop&q=80&w=600',
      status: 'Available',
      activeStatus: true,
    });

    // Doctor 3 (Pediatrics)
    const docUser3 = await User.create({
      name: 'Dr. Vikram Rao, MD, DNB',
      email: 'dr.vikram@mediqueue.com',
      mobile: '+1 800 555 0144',
      password: 'Doctor123!',
      role: 'doctor',
      gender: 'Male',
      activeStatus: true,
      profileCompleted: true,
      photoURL: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=600',
    });

    const doctor3 = await Doctor.create({
      userId: docUser3._id,
      departmentId: deptPediatrics._id,
      qualification: 'MBBS, MD (Pediatrics), DNB (Pediatrics)',
      specialization: 'Senior Pediatrician & Child Health Specialist',
      registrationNumber: 'MC-2020-7788',
      experience: 10,
      roomNumber: 'Room 302',
      startTime: '09:00 AM',
      endTime: '05:00 PM',
      consultationFee: 600,
      defaultDuration: 12,
      avgConsultationDuration: 12,
      totalCompletedConsultations: 15,
      totalConsultationTimeMinutes: 180,
      biography: 'Specialized pediatrician dedicated to child growth tracking, pediatric immunizations, acute illness management, and childhood nutrition.',
      profileImage: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=600',
      status: 'Available',
      activeStatus: true,
    });

    // Doctor 4 (Orthopedics)
    const docUser4 = await User.create({
      name: 'Dr. Elena Rossi, MS (Ortho)',
      email: 'dr.elena@mediqueue.com',
      mobile: '+1 800 555 0155',
      password: 'Doctor123!',
      role: 'doctor',
      gender: 'Female',
      activeStatus: true,
      profileCompleted: true,
      photoURL: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600',
    });

    const doctor4 = await Doctor.create({
      userId: docUser4._id,
      departmentId: deptOrtho._id,
      qualification: 'MBBS, MS (Orthopedics), MCh',
      specialization: 'Senior Orthopedic & Joint Surgeon',
      registrationNumber: 'MC-2017-5541',
      experience: 14,
      roomNumber: 'Room 405',
      startTime: '09:30 AM',
      endTime: '05:30 PM',
      consultationFee: 700,
      defaultDuration: 15,
      avgConsultationDuration: 15,
      totalCompletedConsultations: 20,
      totalConsultationTimeMinutes: 300,
      biography: 'Fellowship-trained orthopedic surgeon specializing in joint reconstruction, arthroscopy, sports trauma, and spine care.',
      profileImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600',
      status: 'Available',
      activeStatus: true,
    });

    // 3. Patients
    const patient1 = await User.create({
      name: 'David Miller',
      email: 'patient@mediqueue.com',
      mobile: '+1 555 019 2831',
      password: 'Patient123!',
      role: 'patient',
      patientId: 'PAT-2026-0001',
      gender: 'Male',
      dob: new Date('1988-04-12'),
      address: '742 Evergreen Terrace, Springfield',
      emergencyContact: '+1 555 019 9999',
      bloodGroup: 'O+',
      profileCompleted: true,
      verifiedMobile: true,
      photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
    });

    const patient2 = await User.create({
      name: 'Sophia Reynolds',
      email: 'sophia.reynolds@example.com',
      mobile: '+1 555 014 9921',
      password: 'Patient123!',
      role: 'patient',
      patientId: 'PAT-2026-0002',
      gender: 'Female',
      dob: new Date('1994-09-25'),
      address: '12 Hospital Avenue, Metro City',
      emergencyContact: '+1 555 014 1111',
      bloodGroup: 'A+',
      profileCompleted: true,
      verifiedMobile: true,
      photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
    });

    const patient3 = await User.create({
      name: 'Robert Chen',
      email: 'robert.chen@example.com',
      mobile: '+1 555 017 4488',
      password: 'Patient123!',
      role: 'patient',
      patientId: 'PAT-2026-0003',
      gender: 'Male',
      dob: new Date('1956-11-05'),
      address: '88 Oakridge Road, West Hills',
      emergencyContact: '+1 555 017 0000',
      bloodGroup: 'B+',
      profileCompleted: true,
      verifiedMobile: true,
      photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    });

    const patient4 = await User.create({
      name: 'Emma Watson',
      email: 'emma.watson@example.com',
      mobile: '+1 555 012 3344',
      password: 'Patient123!',
      role: 'patient',
      patientId: 'PAT-2026-0004',
      gender: 'Female',
      dob: new Date('1999-02-18'),
      address: '45 Pine Street, North Hills',
      emergencyContact: '+1 555 012 9999',
      bloodGroup: 'AB+',
      profileCompleted: true,
      verifiedMobile: true,
      photoURL: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200',
    });

    const patient5 = await User.create({
      name: 'Aarav Sharma',
      email: 'aarav.sharma@example.com',
      mobile: '+1 555 018 7766',
      password: 'Patient123!',
      role: 'patient',
      patientId: 'PAT-2026-0005',
      gender: 'Male',
      dob: new Date('1992-07-14'),
      address: '102 Silicon Parkway, East Bay',
      emergencyContact: '+1 555 018 0000',
      bloodGroup: 'O+',
      profileCompleted: true,
      verifiedMobile: true,
      photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    });

    // 4. Appointments & Live Tokens for Doctor 1 (Dr. Arthur - OPD)
    // Appointment 1: David Miller (Currently in consultation)
    const appt1 = await Appointment.create({
      patientId: patient1._id,
      doctorId: doctor1._id,
      departmentId: deptOPD._id,
      appointmentDate: todayStr,
      timeSlot: '09:00 AM',
      tokenNumber: 'GM-001',
      patientName: patient1.name,
      patientAge: 38,
      patientGender: 'Male',
      patientMobile: patient1.mobile,
      emergencyContact: patient1.emergencyContact,
      reasonForVisit: 'Severe migraine headache and nausea for past 2 days',
      symptomsDuration: '2 days',
      existingConditions: 'Hypertension',
      priority: 'Normal',
      status: 'In Consultation',
      checkInTime: new Date(Date.now() - 35 * 60000),
      consultationStartTime: new Date(Date.now() - 5 * 60000),
    });

    const token1 = await Token.create({
      tokenNumber: 'GM-001',
      sequenceNumber: 1,
      patientId: patient1._id,
      doctorId: doctor1._id,
      departmentId: deptOPD._id,
      patientName: patient1.name,
      patientAge: 38,
      patientGender: 'Male',
      patientMobile: patient1.mobile,
      reasonForVisit: 'Severe migraine headache and nausea for past 2 days',
      symptomsDuration: '2 days',
      existingConditions: 'Hypertension',
      status: 'In Consultation',
      queuePosition: 0,
      peopleAhead: 0,
      estimatedWaitingTimeMinutes: 0,
      joinedTime: new Date(Date.now() - 35 * 60000),
      consultationStartTime: new Date(Date.now() - 5 * 60000),
      appointmentId: appt1._id,
      dateString: todayStr,
    });
    appt1.tokenId = token1._id;
    await appt1.save();

    // Appointment 2: Sophia Reynolds (Waiting, next to be called)
    const appt2 = await Appointment.create({
      patientId: patient2._id,
      doctorId: doctor1._id,
      departmentId: deptOPD._id,
      appointmentDate: todayStr,
      timeSlot: '09:30 AM',
      tokenNumber: 'GM-002',
      patientName: patient2.name,
      patientAge: 32,
      patientGender: 'Female',
      patientMobile: patient2.mobile,
      emergencyContact: patient2.emergencyContact,
      reasonForVisit: 'Persistent fever, dry cough, and acute body ache',
      symptomsDuration: '3 days',
      existingConditions: 'None',
      priority: 'Normal',
      status: 'Waiting',
      checkInTime: new Date(Date.now() - 25 * 60000),
    });

    const token2 = await Token.create({
      tokenNumber: 'GM-002',
      sequenceNumber: 2,
      patientId: patient2._id,
      doctorId: doctor1._id,
      departmentId: deptOPD._id,
      patientName: patient2.name,
      patientAge: 32,
      patientGender: 'Female',
      patientMobile: patient2.mobile,
      reasonForVisit: 'Persistent fever, dry cough, and acute body ache',
      symptomsDuration: '3 days',
      existingConditions: 'None',
      status: 'Waiting',
      queuePosition: 1,
      peopleAhead: 0,
      estimatedWaitingTimeMinutes: 6,
      estimatedWaitMin: 5,
      estimatedWaitMax: 8,
      predictedWaitMinutes: 10,
      joinedTime: new Date(Date.now() - 25 * 60000),
      appointmentId: appt2._id,
      dateString: todayStr,
    });
    appt2.tokenId = token2._id;
    await appt2.save();

    // Appointment 3: Robert Chen (Senior Citizen)
    const appt3 = await Appointment.create({
      patientId: patient3._id,
      doctorId: doctor1._id,
      departmentId: deptOPD._id,
      appointmentDate: todayStr,
      timeSlot: '10:00 AM',
      tokenNumber: 'GM-003',
      patientName: patient3.name,
      patientAge: 70,
      patientGender: 'Male',
      patientMobile: patient3.mobile,
      emergencyContact: patient3.emergencyContact,
      reasonForVisit: 'Senior citizen routine blood pressure check and joint pain evaluation',
      symptomsDuration: '1 week',
      existingConditions: 'Diabetes & Osteoarthritis',
      priority: 'Senior',
      priorityReason: 'Age over 65 - priority assistance',
      status: 'Waiting',
      checkInTime: new Date(Date.now() - 15 * 60000),
    });

    const token3 = await Token.create({
      tokenNumber: 'GM-003',
      sequenceNumber: 3,
      patientId: patient3._id,
      doctorId: doctor1._id,
      departmentId: deptOPD._id,
      patientName: patient3.name,
      patientAge: 70,
      patientGender: 'Male',
      patientMobile: patient3.mobile,
      reasonForVisit: 'Senior citizen routine blood pressure check and joint pain evaluation',
      symptomsDuration: '1 week',
      existingConditions: 'Diabetes & Osteoarthritis',
      priority: 'Senior',
      priorityRank: 4,
      priorityReason: 'Age over 65 - priority assistance',
      status: 'Waiting',
      queuePosition: 2,
      peopleAhead: 1,
      estimatedWaitingTimeMinutes: 16,
      estimatedWaitMin: 14,
      estimatedWaitMax: 20,
      predictedWaitMinutes: 20,
      joinedTime: new Date(Date.now() - 15 * 60000),
      appointmentId: appt3._id,
      dateString: todayStr,
    });
    appt3.tokenId = token3._id;
    await appt3.save();

    // Appointment 4: Emma Watson
    const appt4 = await Appointment.create({
      patientId: patient4._id,
      doctorId: doctor1._id,
      departmentId: deptOPD._id,
      appointmentDate: todayStr,
      timeSlot: '10:30 AM',
      tokenNumber: 'GM-004',
      patientName: patient4.name,
      patientAge: 27,
      patientGender: 'Female',
      patientMobile: patient4.mobile,
      emergencyContact: patient4.emergencyContact,
      reasonForVisit: 'Seasonal allergic rhinitis, sore throat, and sneezing',
      symptomsDuration: '4 days',
      existingConditions: 'Mild Asthma',
      priority: 'Normal',
      status: 'Waiting',
      checkInTime: new Date(Date.now() - 8 * 60000),
    });

    const token4 = await Token.create({
      tokenNumber: 'GM-004',
      sequenceNumber: 4,
      patientId: patient4._id,
      doctorId: doctor1._id,
      departmentId: deptOPD._id,
      patientName: patient4.name,
      patientAge: 27,
      patientGender: 'Female',
      patientMobile: patient4.mobile,
      reasonForVisit: 'Seasonal allergic rhinitis, sore throat, and sneezing',
      symptomsDuration: '4 days',
      existingConditions: 'Mild Asthma',
      status: 'Waiting',
      queuePosition: 3,
      peopleAhead: 2,
      estimatedWaitingTimeMinutes: 26,
      estimatedWaitMin: 22,
      estimatedWaitMax: 30,
      predictedWaitMinutes: 30,
      joinedTime: new Date(Date.now() - 8 * 60000),
      appointmentId: appt4._id,
      dateString: todayStr,
    });
    appt4.tokenId = token4._id;
    await appt4.save();

    await QueueCounter.create({
      doctorId: doctor1._id,
      dateString: todayStr,
      lastSequence: 4,
    });

    // 5. Doctor 2 Queue (Dr. Sarah Jenkins - Cardiology)
    // Appointment 5: Aarav Sharma (Cardiology Urgent)
    const appt5 = await Appointment.create({
      patientId: patient5._id,
      doctorId: doctor2._id,
      departmentId: deptCardio._id,
      appointmentDate: todayStr,
      timeSlot: '10:00 AM',
      tokenNumber: 'CARD-001',
      patientName: patient5.name,
      patientAge: 34,
      patientGender: 'Male',
      patientMobile: patient5.mobile,
      emergencyContact: patient5.emergencyContact,
      reasonForVisit: 'Chest discomfort after light exertion and acute palpitations',
      symptomsDuration: '1 day',
      existingConditions: 'High Cholesterol',
      priority: 'Urgent',
      priorityReason: 'Cardiovascular symptoms flagged for expedited consultation',
      status: 'Waiting',
      checkInTime: new Date(Date.now() - 10 * 60000),
    });

    const token5 = await Token.create({
      tokenNumber: 'CARD-001',
      sequenceNumber: 1,
      patientId: patient5._id,
      doctorId: doctor2._id,
      departmentId: deptCardio._id,
      patientName: patient5.name,
      patientAge: 34,
      patientGender: 'Male',
      patientMobile: patient5.mobile,
      reasonForVisit: 'Chest discomfort after light exertion and acute palpitations',
      symptomsDuration: '1 day',
      existingConditions: 'High Cholesterol',
      priority: 'Urgent',
      priorityRank: 2,
      priorityReason: 'Cardiovascular symptoms flagged for expedited consultation',
      status: 'Waiting',
      queuePosition: 1,
      peopleAhead: 0,
      estimatedWaitingTimeMinutes: 15,
      estimatedWaitMin: 12,
      estimatedWaitMax: 18,
      predictedWaitMinutes: 15,
      joinedTime: new Date(Date.now() - 10 * 60000),
      appointmentId: appt5._id,
      dateString: todayStr,
    });
    appt5.tokenId = token5._id;
    await appt5.save();

    await QueueCounter.create({
      doctorId: doctor2._id,
      dateString: todayStr,
      lastSequence: 1,
    });

    // 6. Doctor 3 Queue (Dr. Vikram Rao - Pediatrics)
    await QueueCounter.create({
      doctorId: doctor3._id,
      dateString: todayStr,
      lastSequence: 0,
    });

    // Doctor 4 Queue (Dr. Elena Rossi - Orthopedics)
    await QueueCounter.create({
      doctorId: doctor4._id,
      dateString: todayStr,
      lastSequence: 0,
    });

    // 7. Completed History Records for Analytics
    const sampleHistories = [
      {
        tokenNumber: 'GM-091',
        patientId: patient1._id,
        doctorId: doctor1._id,
        departmentId: deptOPD._id,
        priority: 'Normal',
        status: 'Completed',
        joinedTime: new Date(Date.now() - 180 * 60000),
        calledTime: new Date(Date.now() - 150 * 60000),
        completedTime: new Date(Date.now() - 140 * 60000),
        waitingDurationMinutes: 30,
        predictedWaitMinutes: 28,
        consultationDurationMinutes: 10,
        consultationNotes: 'Patient presented with tension headache. Vitals normal. Prescribed acetaminophen and stress reduction.',
        diagnosis: 'Tension-type Headache',
        prescription: 'Tab Paracetamol 650mg SOS, Multivitamins OD x 10 days',
        dateString: todayStr,
      },
      {
        tokenNumber: 'GM-092',
        patientId: patient2._id,
        doctorId: doctor1._id,
        departmentId: deptOPD._id,
        priority: 'Senior',
        status: 'Completed',
        joinedTime: new Date(Date.now() - 140 * 60000),
        calledTime: new Date(Date.now() - 120 * 60000),
        completedTime: new Date(Date.now() - 108 * 60000),
        waitingDurationMinutes: 20,
        predictedWaitMinutes: 22,
        consultationDurationMinutes: 12,
        consultationNotes: 'BP 130/85. Fasting glucose normal. Refilled regular medications.',
        diagnosis: 'Essential Hypertension - Controlled',
        prescription: 'Tab Telmisartan 40mg OD morning, Low sodium diet',
        dateString: todayStr,
      },
      {
        tokenNumber: 'CARD-080',
        patientId: patient3._id,
        doctorId: doctor2._id,
        departmentId: deptCardio._id,
        priority: 'Urgent',
        status: 'Completed',
        joinedTime: new Date(Date.now() - 120 * 60000),
        calledTime: new Date(Date.now() - 105 * 60000),
        completedTime: new Date(Date.now() - 90 * 60000),
        waitingDurationMinutes: 15,
        predictedWaitMinutes: 16,
        consultationDurationMinutes: 15,
        consultationNotes: 'ECG showed normal sinus rhythm. Advised 2D Echo and lipid profile.',
        diagnosis: 'Atypical Non-Cardiac Chest Wall Pain',
        prescription: 'Tab Pantoprazole 40mg BBF, Gelusil syrup 10ml TDS',
        dateString: todayStr,
      },
    ];

    await QueueHistory.insertMany(sampleHistories);

    // 8. Notifications
    await Notification.create({
      userId: patient1._id,
      title: 'Active Consultation in Progress',
      message: 'You are currently inside Consultation Room 101 with Dr. Arthur Pendelton.',
      type: 'info',
      tokenId: token1._id,
    });

    await Notification.create({
      userId: patient2._id,
      title: 'Approaching Turn Alert',
      message: 'You are next in the OPD queue for Dr. Arthur Pendelton (Room 101). Please be ready near the waiting lounge.',
      type: 'turn_alert',
      tokenId: token2._id,
    });

    await Notification.create({
      userId: patient3._id,
      title: 'Token Generated: GM-003',
      message: 'Your token GM-003 is active. 1 patient ahead of you. Estimated wait: ~16 mins.',
      type: 'info',
      tokenId: token3._id,
    });

    await Notification.create({
      userId: docUser1._id,
      title: 'Active OPD Queue: 3 Waiting',
      message: 'You have 3 patients waiting in your queue. Next patient: Sophia Reynolds (GM-002).',
      type: 'info',
    });

    await Notification.create({
      userId: docUser2._id,
      title: 'Priority Patient in Cardiology',
      message: 'Aarav Sharma (CARD-001) has been added with Urgent priority for chest discomfort.',
      type: 'warning',
    });

    // 9. Announcements
    await Announcement.create({
      title: 'Multi-Department Digital Queue System Active',
      message: 'MediQueue OPD Queue Management is fully active across General Medicine, Cardiology, Pediatrics, and Orthopedics. Check your digital token for live room directions.',
      priority: 'Normal',
      activeStatus: true,
    });

    console.log('================================================================');
    console.log('  MediQueue Complete Healthcare Management Seed Finished!       ');
    console.log('================================================================');
    console.log('  Admin: admin@mediqueue.com / Admin123!                         ');
    console.log('  Receptionist: receptionist@mediqueue.com / Password123!        ');
    console.log('  Doctor 1 (OPD): dr.arthur@mediqueue.com / Doctor123!           ');
    console.log('  Doctor 2 (Cardio): dr.sarah@mediqueue.com / Doctor123!         ');
    console.log('  Doctor 3 (Pediatrics): dr.vikram@mediqueue.com / Doctor123!    ');
    console.log('  Doctor 4 (Ortho): dr.elena@mediqueue.com / Doctor123!          ');
    console.log('  Patient: patient@mediqueue.com / Patient123!                   ');
    console.log('================================================================');

    process.exit(0);
  } catch (error) {
    console.error('[MediQueue Seed Error]:', error);
    process.exit(1);
  }
};

seedDatabase();
