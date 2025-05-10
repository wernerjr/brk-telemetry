import React from 'react';
import { StatusBar } from 'react-native';
import HomeScreen from './src/components/HomeScreen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SessionsScreen from './src/components/SessionsScreen';
import SpeedTrackingScreen from './src/screens/SpeedTrackingScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SessionDetailScreen from './src/screens/SessionDetailScreen';
import SessionSetupScreen from './src/screens/SessionSetupScreen';

const Stack = createStackNavigator();

function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Sessions" component={SessionsScreen} />
            <Stack.Screen name="SessionSetup" component={SessionSetupScreen} />
            <Stack.Screen name="SpeedTracking" component={SpeedTrackingScreen} />
            <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App; 