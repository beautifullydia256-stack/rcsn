import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CustomDrawer from '../components/CustomDrawer';
import StudentDashboardScreen from '../screens/student/DashboardScreen';
import MyReportsScreen from '../screens/student/MyReportsScreen';
import MyFeesScreen from '../screens/student/MyFeesScreen';
import NotificationsScreen from '../screens/student/NotificationsScreen';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

const StudentStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="StudentDashboard" component={StudentDashboardScreen} options={{ headerShown: false }} />
    <Stack.Screen name="MyReports" component={MyReportsScreen} />
    <Stack.Screen name="MyFees" component={MyFeesScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);

const StudentNavigator: React.FC = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} role="student" />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Drawer.Screen name="StudentMain" component={StudentStack} />
    </Drawer.Navigator>
  );
};

export default StudentNavigator;


