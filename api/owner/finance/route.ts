import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withOwnerAuth } from '../../../lib/middleware/ownerAuth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface FinanceData {
  overview: {
    totalRevenue: number;
    monthlyRecurringRevenue: number;
    annualRevenue: number;
    projectedAnnualRevenue: number;
    revenueGrowth: number;
    payingSchools: number;
    averageRevenuePerSchool: number;
  };
  revenueByPlan: Array<{
    planName: string;
    schoolCount: number;
    monthlyRevenue: number;
    annualRevenue: number;
    percentage: number;
  }>;
  recentTransactions: Array<{
    transactionId: string;
    schoolName: string;
    amount: number;
    type: 'subscription' | 'student_payment';
    status: 'completed' | 'pending' | 'failed';
    date: string;
  }>;
  subscriptionMetrics: {
    activeSubscriptions: number;
    trialSubscriptions: number;
    expiredSubscriptions: number;
    cancelledSubscriptions: number;
    expiringWithin30Days: number;
  };
}

async function getFinanceData(): Promise<FinanceData> {
  try {
    // Get subscription revenue data
    const { data: subscriptions, error: subsError } = await supabase
      .from('school_subscriptions')
      .select(`
        plan_name,
        monthly_amount,
        status,
        end_date,
        schools!inner(name)
      `);

    if (subsError) {
      console.error('Subscriptions query error:', subsError);
      throw new Error('Failed to fetch subscription data');
    }

    // Get student payments data (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: payments, error: paymentsError } = await supabase
      .from('student_payments')
      .select(`
        payment_id,
        amount_paid,
        payment_date,
        reversed_at,
        schools!inner(name)
      `)
      .gte('payment_date', twelveMonthsAgo.toISOString())
      .is('reversed_at', null);

    if (paymentsError) {
      console.error('Payments query error:', paymentsError);
      throw new Error('Failed to fetch payments data');
    }

    // Calculate overview metrics
    const activeSubscriptions = (subscriptions || []).filter(s => s.status === 'active');
    const monthlyRecurringRevenue = activeSubscriptions.reduce((sum, s) => sum + parseFloat(s.monthly_amount || '0'), 0);
    const annualRevenue = monthlyRecurringRevenue * 12;

    // Calculate student payments revenue (current year)
    const currentYear = new Date().getFullYear();
    const currentYearPayments = (payments || []).filter(p => 
      new Date(p.payment_date).getFullYear() === currentYear
    );
    const studentPaymentsRevenue = currentYearPayments.reduce((sum, p) => sum + parseFloat(p.amount_paid || '0'), 0);

    const totalRevenue = annualRevenue + studentPaymentsRevenue;
    const projectedAnnualRevenue = totalRevenue * 1.15; // 15% growth projection

    // Calculate growth (simulated - in production, compare with previous period)
    const revenueGrowth = 12.5; // Percentage

    const payingSchools = activeSubscriptions.length;
    const averageRevenuePerSchool = payingSchools > 0 ? monthlyRecurringRevenue / payingSchools : 0;

    // Revenue by plan
    const planRevenue: Record<string, { count: number; revenue: number }> = {};
    activeSubscriptions.forEach(sub => {
      const plan = sub.plan_name || 'Free (0-20)';
      if (!planRevenue[plan]) {
        planRevenue[plan] = { count: 0, revenue: 0 };
      }
      planRevenue[plan].count++;
      planRevenue[plan].revenue += parseFloat(sub.monthly_amount || '0');
    });

    const revenueByPlan = Object.entries(planRevenue).map(([planName, data]) => ({
      planName,
      schoolCount: data.count,
      monthlyRevenue: data.revenue,
      annualRevenue: data.revenue * 12,
      percentage: monthlyRecurringRevenue > 0 ? (data.revenue / monthlyRecurringRevenue) * 100 : 0,
    }));

    // Recent transactions (last 10)
    const recentPayments = (payments || [])
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
      .slice(0, 10);

    const recentTransactions = recentPayments.map(payment => ({
      transactionId: payment.payment_id,
      schoolName: payment.schools?.name || 'Unknown School',
      amount: parseFloat(payment.amount_paid || '0'),
      type: 'student_payment' as const,
      status: 'completed' as const,
      date: payment.payment_date,
    }));

    // Subscription metrics
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const subscriptionMetrics = {
      activeSubscriptions: (subscriptions || []).filter(s => s.status === 'active').length,
      trialSubscriptions: (subscriptions || []).filter(s => s.status === 'trial').length,
      expiredSubscriptions: (subscriptions || []).filter(s => s.status === 'expired').length,
      cancelledSubscriptions: (subscriptions || []).filter(s => s.status === 'cancelled').length,
      expiringWithin30Days: (subscriptions || []).filter(s => 
        s.status === 'active' && 
        s.end_date && 
        new Date(s.end_date) <= thirtyDaysFromNow
      ).length,
    };

    return {
      overview: {
        totalRevenue,
        monthlyRecurringRevenue,
        annualRevenue,
        projectedAnnualRevenue,
        revenueGrowth,
        payingSchools,
        averageRevenuePerSchool,
      },
      revenueByPlan,
      recentTransactions,
      subscriptionMetrics,
    };

  } catch (error) {
    console.error('Error fetching finance data:', error);
    throw error;
  }
}

async function handler(request: NextRequest): Promise<NextResponse> {
  try {
    if (request.method !== 'GET') {
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      );
    }

    const financeData = await getFinanceData();

    return NextResponse.json({
      success: true,
      data: financeData,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Finance API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch finance data',
        code: 'FINANCE_FETCH_ERROR',
      },
      { status: 500 }
    );
  }
}

// Export with owner authentication
export const GET = withOwnerAuth(handler, 'finance_view', '/api/owner/finance');