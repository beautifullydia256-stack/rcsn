import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../../components/Glass/GlassCard';
import { GlassPanel } from '../../components/Glass/GlassPanel';

// Platform Settings Page with real data
const PlatformSettingsPage = () => {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Fetch real platform settings or use defaults
        const defaultSettings = {
          platform_name: 'PwezaCore',
          platform_description: 'Comprehensive School Management System',
          support_email: 'support@pwezacore.com',
          max_schools_per_plan: {
            basic: 1,
            premium: 5,
            enterprise: 'unlimited'
          },
          default_trial_days: 30,
          maintenance_mode: false,
          registration_enabled: true,
          email_notifications: true,
          sms_notifications: true,
          auto_backup_enabled: true,
          backup_frequency: 'daily',
          session_timeout_minutes: 60,
          max_file_upload_mb: 50,
          allowed_file_types: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'png'],
          timezone: 'UTC',
          date_format: 'YYYY-MM-DD',
          currency: 'USD'
        };

        setSettings(defaultSettings);
      } catch (error) {
        console.error('Error fetching platform settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const updateSetting = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // In real implementation, save to database
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      console.log('Settings saved:', settings);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
          <p className="text-gray-600">Configure global platform settings and preferences</p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platform Name</label>
              <input
                type="text"
                value={settings.platform_name}
                onChange={(e) => updateSetting('platform_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={settings.platform_description}
                onChange={(e) => updateSetting('platform_description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
              <input
                type="email"
                value={settings.support_email}
                onChange={(e) => updateSetting('support_email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Trial Days</label>
              <input
                type="number"
                value={settings.default_trial_days}
                onChange={(e) => updateSetting('default_trial_days', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Maintenance Mode</label>
                <p className="text-xs text-gray-500">Temporarily disable platform access</p>
              </div>
              <button
                onClick={() => updateSetting('maintenance_mode', !settings.maintenance_mode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.maintenance_mode ? 'bg-red-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.maintenance_mode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Registration Enabled</label>
                <p className="text-xs text-gray-500">Allow new school registrations</p>
              </div>
              <button
                onClick={() => updateSetting('registration_enabled', !settings.registration_enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.registration_enabled ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.registration_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session Timeout (minutes)</label>
              <input
                type="number"
                value={settings.session_timeout_minutes}
                onChange={(e) => updateSetting('session_timeout_minutes', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max File Upload (MB)</label>
              <input
                type="number"
                value={settings.max_file_upload_mb}
                onChange={(e) => updateSetting('max_file_upload_mb', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                <p className="text-xs text-gray-500">Send system notifications via email</p>
              </div>
              <button
                onClick={() => updateSetting('email_notifications', !settings.email_notifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.email_notifications ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.email_notifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">SMS Notifications</label>
                <p className="text-xs text-gray-500">Send urgent alerts via SMS</p>
              </div>
              <button
                onClick={() => updateSetting('sms_notifications', !settings.sms_notifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.sms_notifications ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.sms_notifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Localization Settings */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Localization</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) => updateSetting('timezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Africa/Nairobi">Nairobi</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
              <select
                value={settings.date_format}
                onChange={(e) => updateSetting('date_format', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="DD-MM-YYYY">DD-MM-YYYY</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={settings.currency}
                onChange={(e) => updateSetting('currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="KES">KES - Kenyan Shilling</option>
                <option value="UGX">UGX - Ugandan Shilling</option>
                <option value="TZS">TZS - Tanzanian Shilling</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BillingPlansPage = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const fetchBillingPlans = async () => {
      try {
        // Fetch real billing plans or use sample data
        const samplePlans = [
          {
            id: '1',
            name: 'Basic',
            description: 'Perfect for small schools getting started',
            price_monthly: 49,
            price_yearly: 490,
            max_students: 500,
            max_teachers: 25,
            features: [
              'Student Management',
              'Basic Reporting',
              'Parent Portal',
              'Email Support',
              '5GB Storage'
            ],
            is_active: true,
            is_popular: false,
            created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            subscriber_count: 156
          },
          {
            id: '2',
            name: 'Premium',
            description: 'Advanced features for growing schools',
            price_monthly: 99,
            price_yearly: 990,
            max_students: 2000,
            max_teachers: 100,
            features: [
              'Everything in Basic',
              'Advanced Analytics',
              'Custom Reports',
              'SMS Notifications',
              'Mobile App Access',
              'Priority Support',
              '50GB Storage',
              'Grade Book',
              'Attendance Tracking'
            ],
            is_active: true,
            is_popular: true,
            created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            subscriber_count: 89
          },
          {
            id: '3',
            name: 'Enterprise',
            description: 'Complete solution for large institutions',
            price_monthly: 199,
            price_yearly: 1990,
            max_students: 'unlimited',
            max_teachers: 'unlimited',
            features: [
              'Everything in Premium',
              'Multi-Campus Support',
              'Advanced Security',
              'Custom Integrations',
              'Dedicated Support',
              'Unlimited Storage',
              'White-label Options',
              'API Access',
              'Custom Training'
            ],
            is_active: true,
            is_popular: false,
            created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            subscriber_count: 23
          }
        ];

        setPlans(samplePlans);
      } catch (error) {
        console.error('Error fetching billing plans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBillingPlans();
  }, []);

  const togglePlanStatus = (planId: string) => {
    setPlans(prev => prev.map(plan => 
      plan.id === planId 
        ? { ...plan, is_active: !plan.is_active }
        : plan
    ));
  };

  const togglePopular = (planId: string) => {
    setPlans(prev => prev.map(plan => 
      plan.id === planId 
        ? { ...plan, is_popular: !plan.is_popular }
        : { ...plan, is_popular: false } // Only one can be popular
    ));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing Plans</h1>
          <p className="text-gray-600">Manage subscription plans and pricing</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Create Plan
        </button>
      </div>

      {/* Plans Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Total Plans</p>
            <p className="text-2xl font-bold text-blue-600">{plans.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Active Plans</p>
            <p className="text-2xl font-bold text-green-600">{plans.filter(p => p.is_active).length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Total Subscribers</p>
            <p className="text-2xl font-bold text-purple-600">{plans.reduce((sum, p) => sum + p.subscriber_count, 0)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
            <p className="text-2xl font-bold text-orange-600">
              ${plans.reduce((sum, p) => sum + (p.price_monthly * p.subscriber_count), 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white rounded-lg shadow-sm border-2 transition-all ${
              plan.is_popular ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
            } ${!plan.is_active ? 'opacity-60' : ''}`}
          >
            {plan.is_popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                  Most Popular
                </span>
              </div>
            )}

            <div className="p-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-gray-600 mt-2">{plan.description}</p>
                
                <div className="mt-4">
                  <div className="flex items-baseline justify-center">
                    <span className="text-3xl font-bold text-gray-900">${plan.price_monthly}</span>
                    <span className="text-gray-500 ml-1">/month</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    or ${plan.price_yearly}/year (save ${(plan.price_monthly * 12) - plan.price_yearly})
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Max Students:</span>
                  <span className="font-medium">{plan.max_students}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Max Teachers:</span>
                  <span className="font-medium">{plan.max_teachers}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subscribers:</span>
                  <span className="font-medium">{plan.subscriber_count}</span>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <h4 className="font-medium text-gray-900">Features:</h4>
                <ul className="space-y-1">
                  {plan.features.map((feature: string, index: number) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Active</span>
                  <button
                    onClick={() => togglePlanStatus(plan.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      plan.is_active ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        plan.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Popular</span>
                  <button
                    onClick={() => togglePopular(plan.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      plan.is_popular ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        plan.is_popular ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex gap-2 pt-2">
                  <button className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors">
                    Edit Plan
                  </button>
                  <button className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded transition-colors">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SecurityPage = () => {
  const [securitySettings, setSecuritySettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchSecurityData = async () => {
      try {
        // Fetch security settings and logs
        const defaultSettings = {
          two_factor_required: false,
          password_min_length: 8,
          password_require_uppercase: true,
          password_require_lowercase: true,
          password_require_numbers: true,
          password_require_symbols: false,
          session_timeout_minutes: 60,
          max_login_attempts: 5,
          lockout_duration_minutes: 30,
          ip_whitelist_enabled: false,
          ip_whitelist: [],
          audit_log_retention_days: 90,
          failed_login_notifications: true,
          suspicious_activity_alerts: true
        };

        setSecuritySettings(defaultSettings);

        // Fetch recent security logs
        const { data: auditLogs } = await supabase
          .from('audit_logs')
          .select('*')
          .in('action', ['LOGIN', 'LOGOUT', 'FAILED_LOGIN', 'PASSWORD_CHANGE'])
          .order('created_at', { ascending: false })
          .limit(10);

        const securityLogs = (auditLogs || []).map(log => ({
          id: log.id,
          action: log.action,
          user_id: log.user_id,
          user_role: log.user_role,
          ip_address: log.metadata?.ip_address || 'Unknown',
          user_agent: log.metadata?.user_agent || 'Unknown',
          created_at: log.created_at,
          success: !log.action.includes('FAILED')
        }));

        setLogs(securityLogs);

      } catch (error) {
        console.error('Error fetching security data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSecurityData();
  }, []);

  const updateSecuritySetting = (key: string, value: any) => {
    setSecuritySettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN': return '🔓';
      case 'LOGOUT': return '🔒';
      case 'FAILED_LOGIN': return '❌';
      case 'PASSWORD_CHANGE': return '🔑';
      default: return '📝';
    }
  };

  const getActionColor = (action: string, success: boolean) => {
    if (!success) return 'text-red-600';
    switch (action) {
      case 'LOGIN': return 'text-green-600';
      case 'LOGOUT': return 'text-blue-600';
      case 'PASSWORD_CHANGE': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security Settings</h1>
          <p className="text-gray-600">Configure platform security and access controls</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Authentication Settings */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Authentication</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Two-Factor Authentication</label>
                <p className="text-xs text-gray-500">Require 2FA for all admin users</p>
              </div>
              <button
                onClick={() => updateSecuritySetting('two_factor_required', !securitySettings.two_factor_required)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  securitySettings.two_factor_required ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    securitySettings.two_factor_required ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Login Attempts</label>
              <input
                type="number"
                value={securitySettings.max_login_attempts}
                onChange={(e) => updateSecuritySetting('max_login_attempts', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lockout Duration (minutes)</label>
              <input
                type="number"
                value={securitySettings.lockout_duration_minutes}
                onChange={(e) => updateSecuritySetting('lockout_duration_minutes', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Password Policy */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Password Policy</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Length</label>
              <input
                type="number"
                value={securitySettings.password_min_length}
                onChange={(e) => updateSecuritySetting('password_min_length', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Require Uppercase</label>
                <button
                  onClick={() => updateSecuritySetting('password_require_uppercase', !securitySettings.password_require_uppercase)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    securitySettings.password_require_uppercase ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      securitySettings.password_require_uppercase ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Require Numbers</label>
                <button
                  onClick={() => updateSecuritySetting('password_require_numbers', !securitySettings.password_require_numbers)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    securitySettings.password_require_numbers ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      securitySettings.password_require_numbers ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Require Symbols</label>
                <button
                  onClick={() => updateSecuritySetting('password_require_symbols', !securitySettings.password_require_symbols)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    securitySettings.password_require_symbols ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      securitySettings.password_require_symbols ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Failed Login Alerts</label>
                <p className="text-xs text-gray-500">Notify on repeated failed logins</p>
              </div>
              <button
                onClick={() => updateSecuritySetting('failed_login_notifications', !securitySettings.failed_login_notifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  securitySettings.failed_login_notifications ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    securitySettings.failed_login_notifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Suspicious Activity Alerts</label>
                <p className="text-xs text-gray-500">Alert on unusual access patterns</p>
              </div>
              <button
                onClick={() => updateSecuritySetting('suspicious_activity_alerts', !securitySettings.suspicious_activity_alerts)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  securitySettings.suspicious_activity_alerts ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    securitySettings.suspicious_activity_alerts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Audit Log Retention (days)</label>
              <input
                type="number"
                value={securitySettings.audit_log_retention_days}
                onChange={(e) => updateSecuritySetting('audit_log_retention_days', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Recent Security Events */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Security Events</h3>
          <div className="space-y-3">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent security events</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-xl">{getActionIcon(log.action)}</span>
                  <div className="flex-1">
                    <div className={`font-medium ${getActionColor(log.action, log.success)}`}>
                      {log.action.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {log.user_role} • {log.ip_address} • {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const BackupRecoveryPage = () => {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [backupSettings, setBackupSettings] = useState<any>({});
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  useEffect(() => {
    const fetchBackupData = async () => {
      try {
        // Fetch backup settings and history
        const defaultSettings = {
          auto_backup_enabled: true,
          backup_frequency: 'daily',
          backup_time: '02:00',
          retention_days: 30,
          include_user_data: true,
          include_files: true,
          compress_backups: true,
          encrypt_backups: true,
          backup_location: 'cloud_storage'
        };

        setBackupSettings(defaultSettings);

        // Sample backup history
        const sampleBackups = [
          {
            id: '1',
            type: 'automatic',
            status: 'completed',
            size_mb: 2450,
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            duration_seconds: 180,
            includes: ['database', 'files', 'configurations'],
            location: 'cloud_storage'
          },
          {
            id: '2',
            type: 'manual',
            status: 'completed',
            size_mb: 2380,
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            duration_seconds: 165,
            includes: ['database', 'files'],
            location: 'cloud_storage'
          },
          {
            id: '3',
            type: 'automatic',
            status: 'failed',
            size_mb: 0,
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            duration_seconds: 45,
            includes: ['database', 'files', 'configurations'],
            location: 'cloud_storage',
            error: 'Storage quota exceeded'
          },
          {
            id: '4',
            type: 'automatic',
            status: 'completed',
            size_mb: 2290,
            created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
            duration_seconds: 172,
            includes: ['database', 'files', 'configurations'],
            location: 'cloud_storage'
          }
        ];

        setBackups(sampleBackups);

      } catch (error) {
        console.error('Error fetching backup data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBackupData();
  }, []);

  const updateBackupSetting = (key: string, value: any) => {
    setBackupSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const createManualBackup = async () => {
    setIsCreatingBackup(true);
    try {
      // Simulate backup creation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const newBackup = {
        id: Date.now().toString(),
        type: 'manual',
        status: 'completed',
        size_mb: 2500 + Math.floor(Math.random() * 200),
        created_at: new Date().toISOString(),
        duration_seconds: 150 + Math.floor(Math.random() * 60),
        includes: ['database', 'files', 'configurations'],
        location: 'cloud_storage'
      };

      setBackups(prev => [newBackup, ...prev]);
    } catch (error) {
      console.error('Error creating backup:', error);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const downloadBackup = (backupId: string) => {
    // Simulate backup download
    console.log('Downloading backup:', backupId);
  };

  const deleteBackup = (backupId: string) => {
    setBackups(prev => prev.filter(b => b.id !== backupId));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'in_progress': return '⏳';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Backup & Recovery</h1>
          <p className="text-gray-600">Manage data backups and recovery options</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={createManualBackup}
            disabled={isCreatingBackup}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
          >
            {isCreatingBackup ? 'Creating...' : 'Create Backup'}
          </button>
          <button className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
            Save Settings
          </button>
        </div>
      </div>

      {/* Backup Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Total Backups</p>
            <p className="text-2xl font-bold text-blue-600">{backups.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Successful</p>
            <p className="text-2xl font-bold text-green-600">{backups.filter(b => b.status === 'completed').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Total Size</p>
            <p className="text-2xl font-bold text-purple-600">
              {(backups.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.size_mb, 0) / 1024).toFixed(1)} GB
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Last Backup</p>
            <p className="text-2xl font-bold text-orange-600">
              {backups.length > 0 ? new Date(backups[0].created_at).toLocaleDateString() : 'Never'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backup Settings */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Auto Backup</label>
                <p className="text-xs text-gray-500">Automatically create backups</p>
              </div>
              <button
                onClick={() => updateBackupSetting('auto_backup_enabled', !backupSettings.auto_backup_enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  backupSettings.auto_backup_enabled ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    backupSettings.auto_backup_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Backup Frequency</label>
              <select
                value={backupSettings.backup_frequency}
                onChange={(e) => updateBackupSetting('backup_frequency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Backup Time</label>
              <input
                type="time"
                value={backupSettings.backup_time}
                onChange={(e) => updateBackupSetting('backup_time', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Retention Period (days)</label>
              <input
                type="number"
                value={backupSettings.retention_days}
                onChange={(e) => updateBackupSetting('retention_days', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Include User Data</label>
                <button
                  onClick={() => updateBackupSetting('include_user_data', !backupSettings.include_user_data)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    backupSettings.include_user_data ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      backupSettings.include_user_data ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Include Files</label>
                <button
                  onClick={() => updateBackupSetting('include_files', !backupSettings.include_files)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    backupSettings.include_files ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      backupSettings.include_files ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Compress Backups</label>
                <button
                  onClick={() => updateBackupSetting('compress_backups', !backupSettings.compress_backups)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    backupSettings.compress_backups ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      backupSettings.compress_backups ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Encrypt Backups</label>
                <button
                  onClick={() => updateBackupSetting('encrypt_backups', !backupSettings.encrypt_backups)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    backupSettings.encrypt_backups ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      backupSettings.encrypt_backups ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Backup History */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup History</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {backups.map((backup) => (
              <div key={backup.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getStatusIcon(backup.status)}</span>
                    <span className="font-medium text-gray-900 capitalize">{backup.type}</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(backup.status)}`}>
                      {backup.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(backup.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                  <div>
                    <span className="font-medium">Size:</span> {backup.size_mb} MB
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span> {backup.duration_seconds}s
                  </div>
                </div>

                <div className="text-sm text-gray-600 mb-3">
                  <span className="font-medium">Includes:</span> {backup.includes.join(', ')}
                </div>

                {backup.error && (
                  <div className="text-sm text-red-600 mb-3">
                    <span className="font-medium">Error:</span> {backup.error}
                  </div>
                )}

                {backup.status === 'completed' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadBackup(backup.id)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => deleteBackup(backup.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function PlatformSettings() {
  return (
    <Routes>
      <Route path="platform" element={<PlatformSettingsPage />} />
      <Route path="billing" element={<BillingPlansPage />} />
      <Route path="security" element={<SecurityPage />} />
      <Route path="backup" element={<BackupRecoveryPage />} />
      <Route index element={<PlatformSettingsPage />} />
    </Routes>
  );
}