import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import NotificationsCard from '../components/NotificationsCard';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);

  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Bell className="w-8 h-8 text-blue-400" />
        <h1 className="text-2xl sm:text-3xl font-bold ac-text-primary">Notifications</h1>
      </div>
      <p className="ac-text-muted">View all your notifications</p>
      <NotificationsCard notifications={notifications} />
    </motion.div>
  );
}
