import React, { useState } from 'react';
import { Phone, Play, Pause, Upload } from 'lucide-react';
import { useAuth } from '../../lib/auth';

export default function VoiceAgentDialer() {
  const { tenant } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [calling, setCalling] = useState(false);

  async function initiateCall() {
    if (!phoneNumber || !tenant?.id) return;
    setCalling(true);

    setTimeout(() => {
      setCalling(false);
      setPhoneNumber('');
      alert('Call initiated successfully!');
    }, 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Phone className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outbound Voice Dialer</h1>
          <p className="text-gray-600">Make AI-powered sales calls</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Quick Dial</h2>

        <div className="flex space-x-3">
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={initiateCall}
            disabled={!phoneNumber || calling}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Phone className="h-4 w-4" />
            <span>{calling ? 'Calling...' : 'Call'}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Bulk Dialer</h2>
        <p className="text-sm text-gray-600 mb-4">
          Upload a CSV file with phone numbers to start a calling campaign
        </p>
        <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <Upload className="h-4 w-4" />
          <span>Upload Lead List</span>
        </button>
      </div>
    </div>
  );
}
