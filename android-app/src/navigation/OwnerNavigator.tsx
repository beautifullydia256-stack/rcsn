import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CustomDrawer from '../components/CustomDrawer';
import OwnerDashboardScreen from '../screens/owner/DashboardScreen';
import SchoolsScreen from '../screens/owner/SchoolsScreen';
import SubscriptionsScreen from '../screens/owner/SubscriptionsScreen';
import AnalyticsScreen from '../screens/owner/AnalyticsScreen';
import SettingsScreen from '../screens/owner/SettingsScreen';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

const OwnerStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="OwnerDashboard" component={OwnerDashboardScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Schools" component={SchoolsScreen} />
    <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} />
    <Stack.Screen name="Analytics" component={AnalyticsScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
  </Stack.Navigator>
);

const OwnerNavigator: React.FC = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} role="owner" />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Drawer.Screen name="OwnerMain" component={OwnerStack} />
    </Drawer.Navigator>
  );
};

export default OwnerNavigator;


