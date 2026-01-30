import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CustomDrawer from '../components/CustomDrawer';
import LibrarianDashboardScreen from '../screens/librarian/DashboardScreen';
import BooksScreen from '../screens/librarian/BooksScreen';
import BorrowScreen from '../screens/librarian/BorrowScreen';
import InventoryScreen from '../screens/librarian/InventoryScreen';
import OverdueScreen from '../screens/librarian/OverdueScreen';
import ReservationsScreen from '../screens/librarian/ReservationsScreen';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

const LibrarianStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="LibrarianDashboard" component={LibrarianDashboardScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Books" component={BooksScreen} />
    <Stack.Screen name="Borrow" component={BorrowScreen} />
    <Stack.Screen name="Inventory" component={InventoryScreen} />
    <Stack.Screen name="Overdue" component={OverdueScreen} />
    <Stack.Screen name="Reservations" component={ReservationsScreen} />
  </Stack.Navigator>
);

const LibrarianNavigator: React.FC = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} role="librarian" />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Drawer.Screen name="LibrarianMain" component={LibrarianStack} />
    </Drawer.Navigator>
  );
};

export default LibrarianNavigator;


