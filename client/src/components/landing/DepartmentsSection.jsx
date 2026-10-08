import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Stethoscope,
  HeartPulse,
  Brain,
  Bone,
  Baby,
  UserCheck,
  Ear,
  Sparkles,
  Activity,
  Cross,
  ArrowRight,
  Clock,
  CheckCircle,
} from 'lucide-react';
import API from '../../services/api';

const ICON_MAP = {
  Stethoscope,
  HeartPulse,
  Brain,
  Bone,
  Baby,
  UserCheck,
  Ear,
  Sparkles,
  Activity,
  Cross,
};

export const DepartmentsSection = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDepts() {
      try {
        const { data } = await API.get('/departments');
        setDepartments(data);
      } catch (e) {
        console.error('Error fetching departments', e);
      } finally {
        setLoading(false);
      }
    }
    loadDepts();
  }, []);

  return (
    <section id="departments" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-teal-600 font-bold text-xs uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
            Hospital Departments
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Specialized Clinical Departments
          </h2>
          <p className="text-slate-600 text-base">
            Our multispecialty hospital features fully equipped OPD wings led by senior clinical consultants.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {departments.map((dept) => {
              const IconComponent = ICON_MAP[dept.icon] || Stethoscope;
              return (
                <div
                  key={dept._id}
                  className="bg-slate-50 hover:bg-white rounded-2xl p-6 border border-slate-200 hover:border-teal-300 hover:shadow-xl transition-all group flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                        Token Prefix: {dept.tokenPrefix}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                        {dept.name}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">Code: {dept.code}</p>
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed">
                      {dept.description}
                    </p>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <CheckCircle className="w-4 h-4 text-teal-600" />
                      <span>{dept.availableDoctorsCount || 0} Doctors Available</span>
                    </div>

                    <a
                      href="#doctors"
                      className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                    >
                      <span>View Doctors</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
};
