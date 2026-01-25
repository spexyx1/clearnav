import React from 'react';
import { Settings, Shield, Bell, Database, Globe } from 'lucide-react';

export default function PlatformSettings() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Platform Settings</h2>
        <p className="text-slate-600 mt-1">Configure platform-wide settings and preferences</p>
      </div>

      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Security Settings</h3>
              <p className="text-sm text-slate-600">Manage authentication and security policies</p>
            </div>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-slate-700">Require 2FA for platform admins</span>
              <input
                type="checkbox"
                className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-slate-700">Enable session timeout</span>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Notification Settings</h3>
              <p className="text-sm text-slate-600">Configure platform notification preferences</p>
            </div>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-slate-700">New tenant signups</span>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-slate-700">Payment failures</span>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-slate-700">Trial expiration warnings</span>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Database Settings</h3>
              <p className="text-sm text-slate-600">Manage database configurations</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Default database type for new tenants
              </label>
              <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="managed">Managed</option>
                <option value="byod">BYOD</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Domain Settings</h3>
              <p className="text-sm text-slate-600">Configure domain and SSL settings</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Base domain
              </label>
              <input
                type="text"
                defaultValue="yourdomain.com"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <label className="flex items-center justify-between">
              <span className="text-slate-700">Auto-provision SSL certificates</span>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Save Settings
        </button>
      </div>
    </div>
  );
}
