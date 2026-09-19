import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { HardDrive } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { registerApiUrl } from '../../lib/registerApiOrigin';

interface StorageData {
  name: string;
  value: number;
  color: string;
  percentage: number;
  [key: string]: unknown; // Index signature for Recharts compatibility
}

interface StorageUsageChartProps {
  className?: string;
}

export default function StorageUsageChart({ className = '' }: StorageUsageChartProps) {
  const [data, setData] = useState<StorageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalStorage, setTotalStorage] = useState(0);

  useEffect(() => {
    const fetchStorageData = async () => {
      try {
        setLoading(true);
        
        // Fetch system health data which includes storage information
        const response = await fetch(registerApiUrl('/api/owner/system-health'), {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch storage data');
        }

        const result = await response.json();
        const storageInfo = result.data?.storage;

        if (storageInfo) {
          const usedStorage = storageInfo.totalUsage || 0;
          const totalLimit = storageInfo.totalLimit || 1000;
          const freeStorage = Math.max(0, totalLimit - usedStorage);
          
          setTotalStorage(totalLimit);
          
          // Create storage breakdown data
          const storageData: StorageData[] = [
            {
              name: 'Used Storage',
              value: usedStorage,
              color: '#06B6D4',
              percentage: totalLimit > 0 ? (usedStorage / totalLimit) * 100 : 0,
            },
            {
              name: 'Free Storage',
              value: freeStorage,
              color: '#374151',
              percentage: totalLimit > 0 ? (freeStorage / totalLimit) * 100 : 100,
            },
          ];

          // Add breakdown by school types if we have detailed data
          if (storageInfo.schoolsNearLimit && storageInfo.schoolsNearLimit.length > 0) {
            const highUsageSchools = storageInfo.schoolsNearLimit.slice(0, 3);
            const otherUsage = usedStorage - highUsageSchools.reduce((sum: number, school: any) => sum + school.usage, 0);
            
            const detailedData: StorageData[] = [
              ...highUsageSchools.map((school: any, index: number) => ({
                name: school.schoolName,
                value: school.usage,
                color: ['#06B6D4', '#10B981', '#F59E0B'][index],
                percentage: totalLimit > 0 ? (school.usage / totalLimit) * 100 : 0,
              })),
              {
                name: 'Other Schools',
                value: Math.max(0, otherUsage),
                color: '#8B5CF6',
                percentage: totalLimit > 0 ? (Math.max(0, otherUsage) / totalLimit) * 100 : 0,
              },
              {
                name: 'Free Storage',
                value: freeStorage,
                color: '#374151',
                percentage: totalLimit > 0 ? (freeStorage / totalLimit) * 100 : 100,
              },
            ].filter(item => item.value > 0);
            
            setData(detailedData);
          } else {
            setData(storageData);
          }
        } else {
          // Generate sample data if no real data available
          const sampleData: StorageData[] = [
            { name: 'Documents', value: 2500, color: '#06B6D4', percentage: 35 },
            { name: 'Images', value: 1800, color: '#10B981', percentage: 25 },
            { name: 'Videos', value: 1200, color: '#F59E0B', percentage: 17 },
            { name: 'Other Files', value: 800, color: '#8B5CF6', percentage: 11 },
            { name: 'Free Space', value: 900, color: '#374151', percentage: 12 },
          ];
          setData(sampleData);
          setTotalStorage(7200);
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching storage data:', err);
        setError('Failed to load storage data');
        
        // Fallback to sample data
        const sampleData: StorageData[] = [
          { name: 'Used Storage', value: 6500, color: '#06B6D4', percentage: 65 },
          { name: 'Free Storage', value: 3500, color: '#374151', percentage: 35 },
        ];
        setData(sampleData);
        setTotalStorage(10000);
      } finally {
        setLoading(false);
      }
    };

    fetchStorageData();
  }, []);

  if (loading) {
    return (
      <div className={`h-64 flex items-center justify-center ${className}`}>
        <div className="animate-pulse">
          <div className="w-32 h-32 bg-slate-700 rounded-full mx-auto mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-slate-700 rounded w-24 mx-auto"></div>
            <div className="h-2 bg-slate-700 rounded w-16 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`h-64 flex items-center justify-center ${className}`}>
        <div className="text-center space-y-3">
          <HardDrive className="w-10 h-10 text-red-400 mx-auto" />
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-lg p-3 shadow-xl">
          <p className="text-white font-medium">{data.name}</p>
          <p className="text-slate-300 text-sm">
            {data.value.toLocaleString()} MB ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show labels for very small slices
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="500"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <motion.div 
      className={`h-64 ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">
            {(totalStorage / 1000).toFixed(1)} GB
          </div>
          <div className="text-sm text-slate-400">Total Storage</div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="80%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={80}
            innerRadius={40}
            fill="#8884d8"
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        {data.map((entry, index) => (
          <div key={index} className="flex items-center gap-1 text-xs">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-slate-300 truncate max-w-20">
              {entry.name}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}