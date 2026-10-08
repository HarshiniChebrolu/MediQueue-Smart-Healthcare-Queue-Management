import React from 'react';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { HeroSection } from '../components/landing/HeroSection';
import { AboutSection } from '../components/landing/AboutSection';
import { DoctorsSection } from '../components/landing/DoctorsSection';
import { HospitalInfoSection } from '../components/landing/HospitalInfoSection';
import { TurnAlertModal } from '../components/common/TurnAlertModal';

export const LandingPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-grow">
        <HeroSection />
        <HospitalInfoSection />
        <AboutSection />
        <DoctorsSection />
      </main>
      <Footer />
      <TurnAlertModal />
    </div>
  );
};
export default LandingPage;
