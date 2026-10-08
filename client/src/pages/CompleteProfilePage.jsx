import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, ShieldCheck, Heart, User, Phone, MapPin, Calendar, AlertCircle, ArrowRight, CheckCircle2, Stethoscope } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const CompleteProfilePage = () => {
  const { user, completeProfile } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    mobile: user?.mobile || '',
    dob: user?.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
    gender: user?.gender || 'Male',
    bloodGroup: user?.bloodGroup || 'O+',
    address: user?.address || '',
    emergencyContact: user?.emergencyContact || '',
    medicalConditions: {
      diabetes: false,
      hypertension: false,
      pregnancy: false,
      dialysis: false,
      heartDisease: false,
      asthma: false,
      allergies: '',
      currentMedication: '',
    },
  });

  const [showMedicalSection, setShowMedicalSection] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleConditionToggle = (conditionKey) => {
    setFormData({
      ...formData,
      medicalConditions: {
        ...formData.medicalConditions,
        [conditionKey]: !formData.medicalConditions[conditionKey],
      },
    });
  };

  const handleMedicalTextChange = (e) => {
    setFormData({
      ...formData,
      medicalConditions: {
        ...formData.medicalConditions,
        [e.target.name]: e.target.value,
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.mobile || !formData.dob || !formData.address || !formData.emergencyContact) {
      setError('Please fill in all required fields marked with *.');
      return;
    }

    setLoading(true);
    try {
      await completeProfile(formData);
      navigate('/patient-dashboard', { state: { profileJustCompleted: true } });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to complete profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Compute form completion percentage for the progress bar
  const requiredFields = [formData.mobile, formData.dob, formData.address, formData.emergencyContact];
  const filledCount = requiredFields.filter((val) => val && String(val).trim() !== '').length;
  const progressPercent = Math.min(100, Math.round(50 + (filledCount / requiredFields.length) * 50));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center space-y-2 mb-4">
        <Link to="/" className="inline-flex items-center gap-2 group">
          <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/30">
            <Activity className="w-7 h-7 stroke-[2.5]" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-slate-900">
            Medi<span className="text-teal-600">Queue</span>
          </span>
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Welcome to MediQueue! 👋</h2>
        <p className="text-xs text-slate-500 font-medium">
          Let's complete your health profile in under a minute.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl border border-slate-200 sm:px-10 space-y-6">
          
          {/* Progress Indicator Banner */}
          <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-teal-900">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>Step 2 of 2: Health Profile Setup</span>
              </span>
              <span className="text-teal-700 font-extrabold">{progressPercent}% Completed</span>
            </div>
            <div className="w-full h-2 bg-teal-200/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Prefilled Google User Badge */}
          <div className="flex items-center gap-3.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-teal-500 shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-teal-600 text-white font-extrabold text-lg flex items-center justify-center border-2 border-teal-500">
                {user?.name?.charAt(0) || 'P'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 truncate">{user?.name}</h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Google Verified
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Required Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  name="mobile"
                  required
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-sm placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  name="dob"
                  required
                  value={formData.dob}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gender *</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group *</label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Residential Address *</label>
              <input
                type="text"
                name="address"
                required
                value={formData.address}
                onChange={handleChange}
                placeholder="Street address, city, postal code"
                className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-sm placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Contact Number *</label>
              <input
                type="tel"
                name="emergencyContact"
                required
                value={formData.emergencyContact}
                onChange={handleChange}
                placeholder="+91 98765 12345"
                className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-sm placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* Optional Medical Information Section Accordion */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowMedicalSection(!showMedicalSection)}
                className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between transition-all"
              >
                <span className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-teal-600" />
                  <span>Optional Medical Information & Pre-existing Conditions</span>
                </span>
                <span className="text-teal-600 font-extrabold text-sm">
                  {showMedicalSection ? '−' : '+'}
                </span>
              </button>

              {showMedicalSection && (
                <div className="mt-3 p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-4 text-xs animate-fadeIn">
                  <p className="text-[11px] text-slate-500 font-medium">
                    Select any pre-existing medical conditions to assist attending OPD doctors:
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      { key: 'diabetes', label: 'Diabetes' },
                      { key: 'hypertension', label: 'Hypertension' },
                      { key: 'pregnancy', label: 'Pregnancy' },
                      { key: 'dialysis', label: 'Dialysis' },
                      { key: 'heartDisease', label: 'Heart Disease' },
                      { key: 'asthma', label: 'Asthma' },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          formData.medicalConditions[item.key]
                            ? 'bg-teal-50 border-teal-300 text-teal-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.medicalConditions[item.key]}
                          onChange={() => handleConditionToggle(item.key)}
                          className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Known Allergies</label>
                      <input
                        type="text"
                        name="allergies"
                        value={formData.medicalConditions.allergies}
                        onChange={handleMedicalTextChange}
                        placeholder="e.g. Penicillin, Dust, Peanuts"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Current Medication</label>
                      <input
                        type="text"
                        name="currentMedication"
                        value={formData.medicalConditions.currentMedication}
                        onChange={handleMedicalTextChange}
                        placeholder="e.g. Paracetamol 500mg, Metformin"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-md shadow-teal-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Saving Health Profile...</span>
                  </span>
                ) : (
                  <>
                    <span>Save & Access Patient Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
};

export default CompleteProfilePage;
