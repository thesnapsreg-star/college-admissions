import { useState } from 'react'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <div className="card">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {['general', 'notifications', 'security', 'integrations'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">General Settings</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">Application Name</label>
                <input
                  type="text"
                  className="input mt-1"
                  defaultValue="College Admissions Portal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Institution Name</label>
                <input
                  type="text"
                  className="input mt-1"
                  defaultValue="Grand Valley College"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Academic Year</label>
                <select className="input mt-1">
                  <option>2026-2027</option>
                  <option>2025-2026</option>
                  <option>2024-2025</option>
                </select>
              </div>
              <button className="btn btn-primary">Save Changes</button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>
              <div className="space-y-4">
                {[
                  { label: 'New application submitted', defaultChecked: true },
                  { label: 'Application status changed', defaultChecked: true },
                  { label: 'Document uploaded', defaultChecked: true },
                  { label: 'Weekly digest', defaultChecked: false },
                ].map((item, i) => (
                  <div key={i} className="flex items-center">
                    <input
                      type="checkbox"
                      defaultChecked={item.defaultChecked}
                      className="h-4 w-4 text-primary border-gray-300 rounded"
                    />
                    <label className="ml-3 text-sm text-gray-700">{item.label}</label>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary">Save Changes</button>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-500">Require 2FA for all admin accounts</p>
                  </div>
                  <button className="btn btn-secondary">Enable</button>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Session Timeout</p>
                    <p className="text-sm text-gray-500">Auto-logout after inactivity</p>
                  </div>
                  <select className="input w-32">
                    <option>15 minutes</option>
                    <option>30 minutes</option>
                    <option>1 hour</option>
                  </select>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Password Policy</p>
                    <p className="text-sm text-gray-500">Minimum password requirements</p>
                  </div>
                  <button className="btn btn-secondary">Configure</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Integrations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'Slack', desc: 'Send notifications to Slack channels', connected: false },
                  { name: 'Google Workspace', desc: 'Sync with Google accounts', connected: true },
                  { name: 'Dropbox', desc: 'Document storage integration', connected: false },
                  { name: 'Salesforce', desc: 'CRM integration', connected: false },
                ].map((item, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                      <button className={`btn ${item.connected ? 'btn-danger' : 'btn-primary'} btn-sm`}>
                        {item.connected ? 'Disconnect' : 'Connect'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}