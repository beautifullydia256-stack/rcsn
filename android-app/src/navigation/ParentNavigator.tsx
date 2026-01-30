import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CustomDrawer from '../components/CustomDrawer';
import ParentDashboardScreen from '../screens/parent/DashboardScreen';
import StudentReportsScreen from '../screens/parent/StudentReportsScreen';
import PaymentsScreen from '../screens/parent/PaymentsScreen';
import ReceiptsScreen from '../screens/parent/ReceiptsScreen';
import NotificationsScreen from '../screens/parent/NotificationsScreen';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

const ParentStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="ParentDashboard" component={ParentDashboardScreen} options={{ headerShown: false }} />
    <Stack.Screen name="StudentReports" component={StudentReportsScreen} />
    <Stack.Screen name="Payments" component={PaymentsScreen} />
    <Stack.Screen name="Receipts" component={ReceiptsScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);

const ParentNavigator: React.FC = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} role="parent" />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Drawer.Screen name="ParentMain" component={ParentStack} />
    </Drawer.Navigator>
  );
};

export default ParentNavigator;


