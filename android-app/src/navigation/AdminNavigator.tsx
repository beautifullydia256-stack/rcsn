import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CustomDrawer from '../components/CustomDrawer';
import AdminDashboardScreen from '../screens/admin/DashboardScreen';
import StudentsScreen from '../screens/admin/StudentsScreen';
import AddStudentScreen from '../screens/admin/AddStudentScreen';
import StudentDetailScreen from '../screens/admin/StudentDetailScreen';
import TeachersScreen from '../screens/admin/TeachersScreen';
import AddTeacherScreen from '../screens/admin/AddTeacherScreen';
import ExamSetsScreen from '../screens/admin/ExamSetsScreen';
import ExamResultsScreen from '../screens/admin/ExamResultsScreen';
import PaymentsScreen from '../screens/admin/PaymentsScreen';
import ReportsScreen from '../screens/admin/ReportsScreen';
import SettingsScreen from '../screens/admin/SettingsScreen';
import AttendanceRecordsScreen from '../screens/admin/AttendanceRecordsScreen';
import ParentsScreen from '../screens/admin/ParentsScreen';
import AddParentScreen from '../screens/admin/AddParentScreen';
import ExpensesScreen from '../screens/admin/ExpensesScreen';
import NotificationsScreen from '../screens/admin/NotificationsScreen';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

const AdminStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Students" component={StudentsScreen} />
    <Stack.Screen name="AddStudent" component={AddStudentScreen} />
    <Stack.Screen name="StudentDetail" component={StudentDetailScreen} />
    <Stack.Screen name="Teachers" component={TeachersScreen} />
    <Stack.Screen name="AddTeacher" component={AddTeacherScreen} />
    <Stack.Screen name="ExamSets" component={ExamSetsScreen} />
    <Stack.Screen name="ExamResults" component={ExamResultsScreen} />
    <Stack.Screen name="Payments" component={PaymentsScreen} />
    <Stack.Screen name="Reports" component={ReportsScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="AttendanceRecords" component={AttendanceRecordsScreen} />
    <Stack.Screen name="Parents" component={ParentsScreen} />
    <Stack.Screen name="AddParent" component={AddParentScreen} />
    <Stack.Screen name="Expenses" component={ExpensesScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);

const AdminNavigator: React.FC = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} role="admin" />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Drawer.Screen name="AdminMain" component={AdminStack} />
    </Drawer.Navigator>
  );
};

export default AdminNavigator;


