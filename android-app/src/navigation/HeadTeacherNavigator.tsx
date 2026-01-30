import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CustomDrawer from '../components/CustomDrawer';
import HeadTeacherDashboardScreen from '../screens/head-teacher/DashboardScreen';
import HeadedPaperScreen from '../screens/head-teacher/HeadedPaperScreen';
import CommentsSettingsScreen from '../screens/head-teacher/CommentsSettingsScreen';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

const HeadTeacherStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="HeadTeacherDashboard" component={HeadTeacherDashboardScreen} options={{ headerShown: false }} />
    <Stack.Screen name="HeadedPaper" component={HeadedPaperScreen} />
    <Stack.Screen name="CommentsSettings" component={CommentsSettingsScreen} />
  </Stack.Navigator>
);

const HeadTeacherNavigator: React.FC = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} role="head_teacher" />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Drawer.Screen name="HeadTeacherMain" component={HeadTeacherStack} />
    </Drawer.Navigator>
  );
};

export default HeadTeacherNavigator;


