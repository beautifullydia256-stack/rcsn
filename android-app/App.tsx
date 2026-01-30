import React, { useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { DatabaseService } from './src/services/DatabaseService';
import { SyncService } from './src/services/SyncService';
import { theme } from './src/theme';
import 'react-native-url-polyfill/auto';

const App: React.FC = () => {
  useEffect(() => {
    // Initialize database on app start
    const initApp = async () => {
      try {
        await DatabaseService.initialize();
        console.log('Database initialized successfully');
        
        // Start sync service
        SyncService.initialize();
        console.log('Sync service initialized');
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initApp();
  }, []);

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <PaperProvider theme={theme}>
            <StatusBar
              barStyle="light-content"
              backgroundColor={theme.colors.primary}
            />
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </PaperProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Provider>
  );
};

export default App;


