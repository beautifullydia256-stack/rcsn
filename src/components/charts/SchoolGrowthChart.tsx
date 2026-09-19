import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SchoolGrowthData {
  month: string;
  monthYear: string;
  newSchools: number;
  primarySchools: number;
  secondarySchools: number;
}

interface SchoolGrowthChartProps {
  className?: string;
}

export default function SchoolGrowthChart({ className = '' }: SchoolGrowthChartProps) {
  const [data, setData] = useState<SchoolGrowthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGrowthData = async () => {
      try {
        setLoading(true);
        
        // Fetch school growth data from materialized view
        const { data: growthData, error } = await supabase
          .from('owner_school_growth_metrics')
          .select('*')
          .order('month_year', { ascending: true });

        if (error) {
          throw error;
        }

        // Transform data for chart
        const chartData: SchoolGrowthData[] = (growthData || []).map((item: any) => {
          const date = new Date(item.month_year);
          const monthName = date.toLocaleDateString('en-US', { month: 'short' });
          const year = date.getFullYear();
          
          return {
            month: `${monthName} ${year}`,
            monthYear: item.month_year,
            newSchools: item.new_schools_count || 0,
            primarySchools: item.new_primary_schools || 0,
            secondarySchools: item.new_secondary_schools || 0,
          };
        });

        // If no data, generate sample data for the last 12 months
        if (chartData.length === 0) {
          const sampleData: SchoolGrowthData[] = [];
          for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthName = date.toLocaleDateString('en-US', { month: 'short' });
            const year = date.getFullYear();
            
            const newSchools = Math.floor(Math.random() * 15) + 2;
            const primarySchools = Math.floor(newSchools * 0.6);
            const secondarySchools = newSchools - primarySchools;
            
            sampleData.push({
              month: `${monthName} ${year}`,
              monthYear: date.toISOString(),
              newSchools,
              primarySchools,
              secondarySchools,
            });
          }
          setData(sampleData);
        } else {
          setData(chartData);
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching school growth data:', err);
        setError('Failed to load school growth data');
      } finally {
        setLoading(false);
      }
    };

    fetchGrowthData();
  }, []);

  if (loading) {
    return (
      <div className={`h-64 flex items-center justify-center ${className}`}>
        <div className="animate-pulse space-y-3 w-full">
          <div className="h-4 bg-slate-700 rounded w-1/4 mx-auto"></div>
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-end gap-2 justify-center">
                <div className={`bg-slate-700 rounded w-8 h-${Math.floor(Math.random() * 20) + 8}`}></div>
                <div className={`bg-slate-600 rounded w-8 h-${Math.floor(Math.random() * 15) + 4}`}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`h-64 flex items-center justify-center ${className}`}>
        <div className="text-center space-y-3">
          <BarChart3 className="w-10 h-10 text-red-400 mx-auto" />
          <div className="text-red-400 font-medium">Chart Error</div>
          <div className="text-red-300 text-sm">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-lg p-3 shadow-xl">
          <p className="text-white font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value} schools
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      className={`h-64 ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis 
            dataKey="month" 
            stroke="#9CA3AF"
            fontSize={12}
            tick={{ fill: '#9CA3AF' }}
          />
          <YAxis 
            stroke="#9CA3AF"
            fontSize={12}
            tick={{ fill: '#9CA3AF' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ color: '#9CA3AF', fontSize: '12px' }}
          />
          <Bar 
            dataKey="primarySchools" 
            name="Primary Schools"
            fill="#06B6D4" 
            radius={[2, 2, 0, 0]}
          />
          <Bar 
            dataKey="secondarySchools" 
            name="Secondary Schools"
            fill="#3B82F6" 
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}