import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { Text, Avatar, Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { signOut } from '../store/slices/authSlice';
import { AppDispatch, RootState } from '../store';
import { theme } from '../theme';

interface DrawerItem {
  label: string;
  icon: string;
  route: string;
}

const roleMenus: Record<string, DrawerItem[]> = {
  admin: [
    { label: 'Dashboard', icon: 'view-dashboard', route: 'AdminDashboard' },
    { label: 'Students', icon: 'account-group', route: 'Students' },
    { label: 'Teachers', icon: 'school', route: 'Teachers' },
    { label: 'Parents', icon: 'account-heart', route: 'Parents' },
    { label: 'Exam Sets', icon: 'file-document-multiple', route: 'ExamSets' },
    { label: 'Exam Results', icon: 'clipboard-text', route: 'ExamResults' },
    { label: 'Payments', icon: 'cash-multiple', route: 'Payments' },
    { label: 'Expenses', icon: 'cash-minus', route: 'Expenses' },
    { label: 'Reports', icon: 'file-chart', route: 'Reports' },
    { label: 'Attendance', icon: 'clock-in', route: 'AttendanceRecords' },
    { label: 'Notifications', icon: 'bell', route: 'Notifications' },
    { label: 'Settings', icon: 'cog', route: 'Settings' },
  ],
  teacher: [
    { label: 'Dashboard', icon: 'view-dashboard', route: 'TeacherDashboard' },
    { label: 'My Classes', icon: 'book-open-variant', route: 'MyClasses' },
    { label: 'My Students', icon: 'account-group', route: 'MyStudents' },
    { label: 'Attendance', icon: 'clock-in', route: 'Attendance' },
    { label: 'Exam Results', icon: 'clipboard-text', route: 'ExamResults' },
    { label: 'Timetable', icon: 'calendar-clock', route: 'Timetable' },
    { label: 'AI Lesson Planner', icon: 'robot', route: 'AILessonPlanner' },
    { label: 'Assignments', icon: 'file-document-edit', route: 'Assignments' },
    { label: 'Resources', icon: 'folder', route: 'Resources' },
    { label: 'Messages', icon: 'message', route: 'Messages' },
    { label: 'Notifications', icon: 'bell', route: 'Notifications' },
    { label: 'Settings', icon: 'cog', route: 'Settings' },
  ],
  parent: [
    { label: 'Dashboard', icon: 'view-dashboard', route: 'ParentDashboard' },
    { label: 'Student Reports', icon: 'file-chart', route: 'StudentReports' },
    { label: 'Payments', icon: 'cash-multiple', route: 'Payments' },
    { label: 'Receipts', icon: 'receipt', route: 'Receipts' },
    { label: 'Notifications', icon: 'bell', route: 'Notifications' },
  ],
  student: [
    { label: 'Dashboard', icon: 'view-dashboard', route: 'StudentDashboard' },
    { label: 'My Reports', icon: 'file-chart', route: 'MyReports' },
    { label: 'My Fees', icon: 'cash', route: 'MyFees' },
    { label: 'Notifications', icon: 'bell', route: 'Notifications' },
  ],
  accountant: [
    { label: 'Dashboard', icon: 'view-dashboard', route: 'AccountantDashboard' },
    { label: 'Payments', icon: 'cash-multiple', route: 'Payments' },
    { label: 'Receipts', icon: 'receipt', route: 'Receipts' },
    { label: 'Expenses', icon: 'cash-minus', route: 'Expenses' },
    { label: 'Balances', icon: 'wallet', route: 'Balances' },
    { label: 'Reports', icon: 'file-chart', route: 'Reports' },
    { label: 'Settings', icon: 'cog', route: 'Settings' },
  ],
  librarian: [
    { label: 'Dashboard', icon: 'view-dashboard', route: 'LibrarianDashboard' },
    { label: 'Books', icon: 'book-open-variant', route: 'Books' },
    { label: 'Borrow', icon: 'book-plus', route: 'Borrow' },
    { label: 'Inventory', icon: 'archive', route: 'Inventory' },
    { label: 'Overdue', icon: 'clock-alert', route: 'Overdue' },
    { label: 'Reservations', icon: 'bookmark', route: 'Reservations' },
  ],
  head_teacher: [
    { label: 'Dashboard', icon: 'view-dashboard', route: 'HeadTeacherDashboard' },
    { label: 'Headed Paper', icon: 'file-document', route: 'HeadedPaper' },
    { label: 'Comments Settings', icon: 'comment-settings', route: 'CommentsSettings' },
  ],
  owner: [
    { label: 'Dashboard', icon: 'view-dashboard', route: 'OwnerDashboard' },
    { label: 'Schools', icon: 'school', route: 'Schools' },
    { label: 'Subscriptions', icon: 'credit-card', route: 'Subscriptions' },
    { label: 'Analytics', icon: 'chart-line', route: 'Analytics' },
    { label: 'Settings', icon: 'cog', route: 'Settings' },
  ],
};

const CustomDrawer: React.FC<DrawerContentComponentProps & { role: string }> = ({
  navigation,
  role,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const menuItems = roleMenus[role] || [];

  const handleLogout = async () => {
    await dispatch(signOut());
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Avatar.Text
          size={64}
          label={user?.name?.charAt(0).toUpperCase() || 'U'}
          style={styles.avatar}
        />
        <Text variant="titleMedium" style={styles.name}>
          {user?.name || 'User'}
        </Text>
        <Text variant="bodySmall" style={styles.email}>
          {user?.email || ''}
        </Text>
        <Text variant="bodySmall" style={styles.role}>
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </Text>
      </View>

      <Divider />

      <DrawerContentScrollView>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.route)}
          >
            <Icon name={item.icon} size={24} color={theme.colors.primary} />
            <Text style={styles.menuText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </DrawerContentScrollView>

      <Divider />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="logout" size={24} color={theme.colors.error} />
        <Text style={[styles.menuText, { color: theme.colors.error }]}>
          Logout
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    padding: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: theme.colors.secondary,
    marginBottom: 12,
  },
  name: {
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    color: theme.colors.onPrimary,
    opacity: 0.8,
    marginBottom: 4,
  },
  role: {
    color: theme.colors.onPrimary,
    opacity: 0.6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingLeft: 20,
  },
  menuText: {
    marginLeft: 16,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingLeft: 20,
  },
});

export default CustomDrawer;


