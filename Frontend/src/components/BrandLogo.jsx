import React from 'react';
import logo from '../assets/ieee-logo.png'

export default function BrandLogo({ variant = 'default' }) {
  if (variant === 'login') {
    return (
      <div className="flex flex-col items-center">

        <img 
          src={logo} 
          alt="IEEE SUTech Logo" 
          className="w-32 h-32 rounded-full object-cover shadow-xl brightness-125 contrast-125 mb-2" 
        />
        <p className="mt-2 text-center text-sm text-slate-500 font-bold tracking-widest uppercase">
          Official Competition Portal
        </p>
      </div>
    );
  }

  if (variant === 'lobby') {
    return (
      <div className="flex items-center space-x-4">
        <img 
          src={logo} 
          alt="IEEE SUTech Logo" 
          className="w-16 h-16 rounded-full contrast-125" 
        />
        <div className="leading-tight">
          <h1 className="text-[#003476] font-extrabold text-lg tracking-tight">IEEE SUTECH Programming Contest</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Official Competition Portal</p>
        </div>
      </div>
    );
  }


  return (
    <div className="flex items-center space-x-3 tracking-tight pr-6 border-r border-slate-200">
      <img 
        src="/ieee-logo.png" 
        alt="IEEE SUTech Logo" 
        className="w-16 h-16 rounded-full contrast-200" 
      />
      <span className="text-[#003476] font-extrabold text-xl">IEEE SUTECH</span>
    </div>
  );
}