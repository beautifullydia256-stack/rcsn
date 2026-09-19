import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Rocket, GraduationCap, Wallet, FileText, Search } from 'lucide-react';
import { publicAssetUrl } from '@/lib/publicAssetUrl';

const faqs = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'How do I set up my school on PwezaCore?',
        a: 'After registering, you\'ll be guided through a simple setup process where you add your school information, create classes, and invite your first teachers. Our onboarding team can also help you get started with a free setup call.'
      },
      {
        q: 'Can I import data from my existing system?',
        a: 'Yes! We provide data import templates for students, teachers, and fee records. Our support team can help you migrate your existing data smoothly during the setup process.'
      },
      {
        q: 'How long does it take to get started?',
        a: 'Most schools are up and running within 1-2 days. Basic setup takes about 30 minutes, and we provide training for your staff to ensure everyone is comfortable using the system.'
      }
    ]
  },
  {
    category: 'Student Management',
    questions: [
      {
        q: 'How do I add new students?',
        a: 'Go to Students > Add Student and fill in the required information. You can add students individually or use our bulk import feature with an Excel template.'
      },
      {
        q: 'Can parents access their child\'s information?',
        a: 'Yes! Parents get their own login portal where they can view their child\'s grades, attendance, fee balance, and receive school communications.'
      },
      {
        q: 'How do I generate student ID cards?',
        a: 'Navigate to Students > ID Cards, select the students you want, choose your template, and click Generate. The system creates professional ID cards with photos and school branding.'
      }
    ]
  },
  {
    category: 'Fees & Payments',
    questions: [
      {
        q: 'How do I record fee payments?',
        a: 'Go to Finance > Record Payment, select the student, enter the amount and payment method. The system automatically generates a receipt and updates the student\'s balance.'
      },
      {
        q: 'Can I track outstanding balances?',
        a: 'Yes! The Finance dashboard shows all outstanding balances in real-time. You can also generate reports and send automated reminders to parents.'
      },
      {
        q: 'How do I set up different fee structures?',
        a: 'Navigate to Settings > Fee Structure to create different fee categories (tuition, meals, transport, etc.) and assign them to different classes or student groups.'
      }
    ]
  },
  {
    category: 'Reports & Grades',
    questions: [
      {
        q: 'How do I generate report cards?',
        a: 'After teachers enter grades, go to Reports > Generate Reports, select the term/class, and click Generate. The system creates professional report cards with grades, positions, and comments.'
      },
      {
        q: 'Can I customize report card templates?',
        a: 'Yes! You can upload your school logo, customize colors, and choose from different report card layouts to match your school\'s branding.'
      },
      {
        q: 'How does the grading system work?',
        a: 'PwezaCore supports Uganda\'s official PLE, UCE, and UACE grading scales with automatic grade calculations, aggregates, and divisions according to UNEB standards.'
      }
    ]
  },
  {
    category: 'Technical Support',
    questions: [
      {
        q: 'What if I forget my password?',
        a: 'Click "Forgot Password" on the login page and enter your email. You\'ll receive a reset link within minutes. If you don\'t receive it, check your spam folder or contact support.'
      },
      {
        q: 'Can I use PwezaCore on mobile devices?',
        a: 'Yes! PwezaCore works on all devices - phones, tablets, and computers. Teachers can mark attendance and enter grades even when offline using our mobile app.'
      },
      {
        q: 'Is my school data secure?',
        a: 'Absolutely! We use bank-level encryption, regular backups, and strict access controls. Your data is stored securely in the cloud and is never shared with third parties.'
      }
    ]
  }
];

const guides = [
  {
    title: 'Quick Start Guide',
    description: 'Get your school set up in 30 minutes',
    icon: <Rocket className="w-8 h-8 text-blue-500" />,
    topics: ['Account setup', 'Adding classes', 'Inviting teachers', 'First student enrollment']
  },
  {
    title: 'Teacher Training',
    description: 'Help your teachers master PwezaCore',
    icon: <GraduationCap className="w-8 h-8 text-emerald-500" />,
    topics: ['Taking attendance', 'Entering grades', 'Generating reports', 'Parent communication']
  },
  {
    title: 'Financial Management',
    description: 'Master fee collection and reporting',
    icon: <Wallet className="w-8 h-8 text-amber-500" />,
    topics: ['Recording payments', 'Generating receipts', 'Outstanding balances', 'Financial reports']
  },
  {
    title: 'Report Generation',
    description: 'Create professional report cards',
    icon: <FileText className="w-8 h-8 text-indigo-500" />,
    topics: ['Setting up grades', 'Customizing templates', 'Bulk generation', 'Distribution']
  }
];

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const categories = ['All', ...faqs.map(f => f.category)];

  const filteredFaqs = faqs.filter(category => {
    if (selectedCategory !== 'All' && category.category !== selectedCategory) return false;
    if (!searchQuery) return true;
    
    return category.questions.some(q => 
      q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.a.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <img src={publicAssetUrl('logo.png')} alt="PwezaCore" width={28} height={28} className="rounded" />
              <h1 className="text-2xl font-bold text-blue-600">PwezaCore</h1>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                to="/contact"
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Contact Support
              </Link>
              <Link
                to="/"
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Help Center
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Find answers to common questions, step-by-step guides, and get the help you need to make the most of PwezaCore.
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl mx-auto mb-12"
        >
          <div className="relative">
            <input
              type="text"
              placeholder="Search for help articles, guides, or FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 pl-12 text-lg border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-lg"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
        </motion.div>

        {/* Quick Help Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
        >
          {guides.map((guide, index) => (
            <div
              key={guide.title}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
            >
              <div className="mb-4">{guide.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {guide.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                {guide.description}
              </p>
              <ul className="space-y-1">
                {guide.topics.map((topic, i) => (
                  <li key={i} className="text-xs text-gray-500 dark:text-gray-400">
                    • {topic}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Frequently Asked Questions
          </h2>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-slate-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* FAQ Items */}
          <div className="max-w-4xl mx-auto space-y-6">
            {filteredFaqs.map((category) => (
              <div key={category.category}>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {category.category}
                </h3>
                <div className="space-y-3">
                  {category.questions.map((faq, index) => {
                    const faqId = `${category.category}-${index}`;
                    const isOpen = openFaq === faqId;
                    
                    return (
                      <div
                        key={faqId}
                        className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
                      >
                        <button
                          onClick={() => setOpenFaq(isOpen ? null : faqId)}
                          className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          <span className="font-medium text-gray-900 dark:text-white">
                            {faq.q}
                          </span>
                          <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                            ▼
                          </span>
                        </button>
                        {isOpen && (
                          <div className="px-6 pb-4">
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                              {faq.a}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-center text-white"
        >
          <h2 className="text-2xl font-bold mb-4">Still need help?</h2>
          <p className="text-blue-100 mb-6">
            Can't find what you're looking for? Our support team is here to help you succeed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/contact"
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              Contact Support
            </Link>
            <a
              href="https://wa.me/256742490303"
              className="bg-blue-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-800 transition-colors"
            >
              WhatsApp Us
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}