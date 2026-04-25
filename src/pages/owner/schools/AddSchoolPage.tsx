import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../../lib/supabase';

interface SchoolFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  website: string;
  subscription_plan: 'basic' | 'premium' | 'enterprise';
  student_count: number;
  teacher_count: number;
  admin_name: string;
  admin_email: string;
  admin_phone: string;
  trial_days: number;
}

const AddSchoolPage: React.FC = () => {
  const [formData, setFormData] = useState<SchoolFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'USA',
    postal_code: '',
    website: '',
    subscription_plan: 'basic',
    student_count: 0,
    teacher_count: 0,
    admin_name: '',
    admin_email: '',
    admin_phone: '',
    trial_days: 30
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: keyof SchoolFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'School name is required';
    if (!formData.email.trim()) newErrors.email = 'School email is required';
    if (!formData.email.includes('@')) newErrors.email = 'Valid email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.country.trim()) newErrors.country = 'Country is required';
    if (!formData.admin_name.trim()) newErrors.admin_name = 'Admin name is required';
    if (!formData.admin_email.trim()) newErrors.admin_email = 'Admin email is required';
    if (!formData.admin_email.includes('@')) newErrors.admin_email = 'Valid admin email is required';
    if (formData.student_count < 1) newErrors.student_count = 'Student count must be at least 1';
    if (formData.teacher_count < 1) newErrors.teacher_count = 'Teacher count must be at least 1';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // In a real implementation, this would create the school in the database
      console.log('Creating school:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess(true);
      
      // Reset form after success
      setTimeout(() => {
        setFormData({
          name: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          country: 'USA',
          postal_code: '',
          website: '',
          subscription_plan: 'basic',
          student_count: 0,
          teacher_count: 0,
          admin_name: '',
          admin_email: '',
          admin_phone: '',
          trial_days: 30
        });
        setSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('Error creating school:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanDetails = (plan: string) => {
    switch (plan) {
      case 'basic':
        return { price: '$49/month', features: ['Up to 500 students', 'Basic reporting', 'Email support'] };
      case 'premium':
        return { price: '$99/month', features: ['Up to 2000 students', 'Advanced analytics', 'Priority support', 'Mobile app'] };
      case 'enterprise':
        return { price: '$199/month', features: ['Unlimited students', 'Custom integrations', 'Dedicated support', 'White-label'] };
      default:
        return { price: '', features: [] };
    }
  };

  if (success) {
    return (
      <div className="p-6">
        <motion.div
          className="max-w-md mx-auto bg-white rounded-lg shadow-sm border p-8 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <div className="text-green-500 text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">School Created Successfully!</h2>
          <p className="text-gray-600 mb-4">
            {formData.name} has been added to the platform. Login credentials have been sent to the admin email.
          </p>
          <div className="text-sm text-gray-500">
            Redirecting to schools list...
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Add New School</h1>
        <p className="text-gray-600">Create a new school account on the platform</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* School Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">School Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                School Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter school name"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                School Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="school@example.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.phone ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="+1-555-0123"
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => updateField('website', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://school.edu"
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Address *
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.address ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="123 Education Street"
              />
              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City *
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.city ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="City name"
              />
              {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State/Province
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => updateField('state', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="State or Province"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country *
              </label>
              <select
                value={formData.country}
                onChange={(e) => updateField('country', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.country ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="USA">United States</option>
                <option value="Canada">Canada</option>
                <option value="UK">United Kingdom</option>
                <option value="Kenya">Kenya</option>
                <option value="Uganda">Uganda</option>
                <option value="Tanzania">Tanzania</option>
                <option value="Other">Other</option>
              </select>
              {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postal Code
              </label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => updateField('postal_code', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="12345"
              />
            </div>
          </div>
        </div>

        {/* School Details */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">School Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Students *
              </label>
              <input
                type="number"
                min="1"
                value={formData.student_count}
                onChange={(e) => updateField('student_count', Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.student_count ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="500"
              />
              {errors.student_count && <p className="text-red-500 text-xs mt-1">{errors.student_count}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Teachers *
              </label>
              <input
                type="number"
                min="1"
                value={formData.teacher_count}
                onChange={(e) => updateField('teacher_count', Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.teacher_count ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="25"
              />
              {errors.teacher_count && <p className="text-red-500 text-xs mt-1">{errors.teacher_count}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trial Period (days)
              </label>
              <input
                type="number"
                min="0"
                max="90"
                value={formData.trial_days}
                onChange={(e) => updateField('trial_days', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Subscription Plan */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['basic', 'premium', 'enterprise'] as const).map((plan) => {
              const planDetails = getPlanDetails(plan);
              return (
                <div
                  key={plan}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                    formData.subscription_plan === plan
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => updateField('subscription_plan', plan)}
                >
                  <div className="text-center">
                    <h4 className="text-lg font-semibold text-gray-900 capitalize">{plan}</h4>
                    <p className="text-2xl font-bold text-blue-600 my-2">{planDetails.price}</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {planDetails.features.map((feature, index) => (
                        <li key={index}>• {feature}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Admin Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">School Administrator</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Name *
              </label>
              <input
                type="text"
                value={formData.admin_name}
                onChange={(e) => updateField('admin_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.admin_name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="John Doe"
              />
              {errors.admin_name && <p className="text-red-500 text-xs mt-1">{errors.admin_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Email *
              </label>
              <input
                type="email"
                value={formData.admin_email}
                onChange={(e) => updateField('admin_email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.admin_email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="admin@school.edu"
              />
              {errors.admin_email && <p className="text-red-500 text-xs mt-1">{errors.admin_email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Phone
              </label>
              <input
                type="tel"
                value={formData.admin_phone}
                onChange={(e) => updateField('admin_phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+1-555-0123"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
          >
            {loading ? 'Creating School...' : 'Create School'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddSchoolPage;