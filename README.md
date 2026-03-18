# PwezaCore - Multi-School Management System

PwezaCore is a modern, multi-tenant SaaS platform designed to streamline school management for various stakeholders, including school administrators, teachers, parents, students, and a single website owner. Built with Next.js and Supabase, it provides a comprehensive solution for educational institutions.

## 🌟 Features

### Multi-Tenant Architecture
- Each school operates independently with secure data isolation
- Row-Level Security (RLS) ensures data privacy between schools
- Scalable infrastructure supporting multiple schools

### Role-Based Dashboards
- **Website Owner**: Full system control and analytics
- **School Admin**: Complete school management capabilities
- **Teachers**: Grade entry, attendance tracking, and report generation
- **Parents**: View student reports, balances, and receipts
- **Students**: Access personal academic information

### Core Functionality
- **Student Management**: Registration, class assignments, and promotion tracking
- **WiFi-Based Attendance**: Teachers punch in/out using school WiFi
- **Grade Management**: Subject-based grading with term tracking
- **Report Generation**: Automated DOCX/PDF report creation
- **Payment Processing**: Receipt generation and financial tracking
- **Public Library**: Educational resources accessible to all
- **Job Board**: Anonymous job postings for schools

### Automation Features
- **Yearly Student Promotions**: Automatic class advancement
- **Graduation Processing**: Handles Primary 7, Senior 4, and Senior 6 graduations
- **Subscription Management**: Free tier for 0-20 students (excluding final year students)

## 🚀 Technology Stack

- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Storage, Edge Functions)
- **Animations**: Framer Motion for smooth micro-interactions
- **Document Generation**: DOCX and PDFKit for reports and receipts
- **Email**: Nodemailer for notifications
- **Deployment**: Vercel-ready with environment configuration

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Git

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pwezacore
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
   For **SMS & WhatsApp** (Africa's Talking), set in Vercel (or `.env.local`): `AFRICASTALKING_API_KEY`, `AFRICASTALKING_USERNAME`, `AFRICASTALKING_SENDER_ID` (SMS); for **WhatsApp** also set `AFRICASTALKING_WHATSAPP_NUMBER` (your WhatsApp business number, e.g. +256…).

4. **Set up Supabase database**
   - Create a new Supabase project
   - Run the SQL schema from `supabase/schema.sql` in the SQL Editor
   - Enable Row Level Security on all tables
   - Set up the required policies

5. **Start the development server**
```bash
npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Schema

The application uses the following main tables:

- **users**: User accounts with role-based access
- **schools**: School information and settings
- **students**: Student records and class assignments
- **teachers**: Teacher information and assignments
- **parents**: Parent-student relationships
- **attendance**: Teacher punch in/out records
- **grades**: Student academic performance
- **reports**: Generated academic reports
- **receipts**: Payment confirmations
- **jobs**: Public job postings
- **library**: Educational resources

## 🔐 Authentication & Security

- **Supabase Auth**: Secure user authentication
- **Row Level Security**: Data isolation between schools
- **Role-based Access**: Granular permissions for different user types
- **Environment Variables**: Secure configuration management

## 📱 Responsive Design

The application is fully responsive and optimized for:
- **Desktop**: Full-featured dashboard experience
- **Tablet**: Optimized layouts for medium screens
- **Mobile**: Touch-friendly interface for smartphones

## 🎨 UI/UX Features

- **Modern Design**: Clean, professional interface
- **Micro-animations**: Smooth transitions and hover effects
- **Accessibility**: WCAG compliant design patterns
- **Dark/Light Mode**: Automatic theme detection
- **Loading States**: User-friendly loading indicators

## 🚀 Deployment

### Vercel Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Connect your GitHub repository to Vercel
   - Add environment variables in Vercel dashboard
   - Deploy automatically on push

3. **Configure Domain**
   - Set up custom domain (pwezacore.com)
   - Configure DNS settings

### Environment Variables for Production

```env
NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-supabase-anon-key
```

## 📊 Usage Guide

### For School Administrators

1. **Register Your School**
   - Visit `/register`
   - Fill in school details and admin information
   - Complete registration process

2. **Manage School Data**
   - Add teachers, students, and parents
   - Configure school settings
   - Monitor subscription usage

3. **Generate Reports**
   - Create academic reports for students
   - Track attendance and performance
   - Manage financial records

### For Teachers

1. **Attendance Management**
   - Punch in/out using school WiFi
   - View attendance history
   - Track working hours

2. **Grade Entry**
   - Enter student grades by subject
   - Organize by terms
   - Generate grade reports

### For Parents

1. **Student Monitoring**
   - View student academic progress
   - Access reports and grades
   - Track payment history

2. **Communication**
   - Receive notifications
   - Download receipts
   - Stay updated on school activities

## 🔧 Development

### Project Structure

```
pwezacore/
├── app/                    # Next.js App Router
│   ├── dashboard/         # Role-based dashboards
│   ├── library/          # Public library page
│   ├── jobs/             # Public jobs page
│   ├── login/            # Authentication pages
│   ├── register/
│   └── page.tsx          # Landing page
├── src/
│   └── lib/
│       └── supabase.ts   # Supabase client configuration
├── supabase/
│   └── schema.sql        # Database schema
├── public/               # Static assets
└── package.json
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📈 Future Enhancements

- **Mobile App**: React Native application
- **Advanced Analytics**: Detailed reporting and insights
- **Integration APIs**: Third-party service integrations
- **Multi-language Support**: Internationalization
- **Advanced Notifications**: Push notifications and email templates
- **Video Conferencing**: Built-in meeting capabilities

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify Supabase URL and keys
   - Check network connectivity
   - Ensure database is properly set up

2. **Authentication Issues**
   - Clear browser cache and cookies
   - Verify user roles in database
   - Check RLS policies

3. **Build Errors**
   - Clear `.next` folder
   - Reinstall dependencies
   - Check TypeScript errors

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Support

For support and questions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Supabase for the backend infrastructure
- Tailwind CSS for the styling system
- Framer Motion for the animations

---

**PwezaCore** - Modern school management made simple.

<!-- Auto-deployment test -->