import React from 'react';
import { useSelector } from 'react-redux';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { RootState } from '../store';
import AuthNavigator from './AuthNavigator';
import AdminNavigator from './AdminNavigator';
import TeacherNavigator from './TeacherNavigator';
import ParentNavigator from './ParentNavigator';
import StudentNavigator from './StudentNavigator';
import AccountantNavigator from './AccountantNavigator';
import LibrarianNavigator from './LibrarianNavigator';
import HeadTeacherNavigator from './HeadTeacherNavigator';
import OwnerNavigator from './OwnerNavigator';

const Stack = createNativeStackNavigator();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated || !user) {
    return <AuthNavigator />;
  }

  // Route to appropriate navigator based on user role
  const getRoleNavigator = () => {
    switch (user.role) {
      case 'admin':
        return <AdminNavigator />;
      case 'teacher':
        return <TeacherNavigator />;
      case 'parent':
        return <ParentNavigator />;
      case 'student':
        return <StudentNavigator />;
      case 'accountant':
        return <AccountantNavigator />;
      case 'librarian':
        return <LibrarianNavigator />;
      case 'head_teacher':
        return <HeadTeacherNavigator />;
      case 'owner':
        return <OwnerNavigator />;
      default:
        return <AuthNavigator />;
    }
  };

  return <>{getRoleNavigator()}</>;
};

export default AppNavigator;


