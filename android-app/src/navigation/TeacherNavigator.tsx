import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CustomDrawer from '../components/CustomDrawer';
import TeacherDashboardScreen from '../screens/teacher/DashboardScreen';
import MyClassesScreen from '../screens/teacher/MyClassesScreen';
import MyStudentsScreen from '../screens/teacher/MyStudentsScreen';
import AttendanceScreen from '../screens/teacher/AttendanceScreen';
import ExamResultsScreen from '../screens/teacher/ExamResultsScreen';
import TimetableScreen from '../screens/teacher/TimetableScreen';
import AILessonPlannerScreen from '../screens/teacher/AILessonPlannerScreen';
import AssignmentsScreen from '../screens/teacher/AssignmentsScreen';
import ResourcesScreen from '../screens/teacher/ResourcesScreen';
import MessagesScreen from '../screens/teacher/MessagesScreen';
import NotificationsScreen from '../screens/teacher/NotificationsScreen';
import SettingsScreen from '../screens/teacher/SettingsScreen';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

const TeacherStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="TeacherDashboard" component={TeacherDashboardScreen} options={{ headerShown: false }} />
    <Stack.Screen name="MyClasses" component={MyClassesScreen} />
    <Stack.Screen name="MyStudents" component={MyStudentsScreen} />
    <Stack.Screen name="Attendance" component={AttendanceScreen} />
    <Stack.Screen name="ExamResults" component={ExamResultsScreen} />
    <Stack.Screen name="Timetable" component={TimetableScreen} />
    <Stack.Screen name="AILessonPlanner" component={AILessonPlannerScreen} />
    <Stack.Screen name="Assignments" component={AssignmentsScreen} />
    <Stack.Screen name="Resources" component={ResourcesScreen} />
    <Stack.Screen name="Messages" component={MessagesScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
  </Stack.Navigator>
);

const TeacherNavigator: React.FC = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} role="teacher" />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Drawer.Screen name="TeacherMain" component={TeacherStack} />
    </Drawer.Navigator>
  );
};

export default TeacherNavigator;


