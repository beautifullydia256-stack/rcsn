import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0f0f16',
    secondary: '#6366f1',
    tertiary: '#8b5cf6',
    background: '#ffffff',
    surface: '#f8f9fa',
    error: '#ef4444',
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
    onBackground: '#1a1a1a',
    onSurface: '#1a1a1a',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#6366f1',
    secondary: '#8b5cf6',
    tertiary: '#a78bfa',
    background: '#0f0f16',
    surface: '#1a1a2e',
    error: '#ef4444',
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
    onBackground: '#ffffff',
    onSurface: '#ffffff',
  },
};


