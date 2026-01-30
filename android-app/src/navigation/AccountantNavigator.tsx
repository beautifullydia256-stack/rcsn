import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CustomDrawer from '../components/CustomDrawer';
import AccountantDashboardScreen from '../screens/accountant/DashboardScreen';
import PaymentsScreen from '../screens/accountant/PaymentsScreen';
import ReceiptsScreen from '../screens/accountant/ReceiptsScreen';
import ExpensesScreen from '../screens/accountant/ExpensesScreen';
import BalancesScreen from '../screens/accountant/BalancesScreen';
import ReportsScreen from '../screens/accountant/ReportsScreen';
import SettingsScreen from '../screens/accountant/SettingsScreen';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

const AccountantStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="AccountantDashboard" component={AccountantDashboardScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Payments" component={PaymentsScreen} />
    <Stack.Screen name="Receipts" component={ReceiptsScreen} />
    <Stack.Screen name="Expenses" component={ExpensesScreen} />
    <Stack.Screen name="Balances" component={BalancesScreen} />
    <Stack.Screen name="Reports" component={ReportsScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
  </Stack.Navigator>
);

const AccountantNavigator: React.FC = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} role="accountant" />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Drawer.Screen name="AccountantMain" component={AccountantStack} />
    </Drawer.Navigator>
  );
};

export default AccountantNavigator;


