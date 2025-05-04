import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import HomeScreen from './src/components/HomeScreen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <HomeScreen />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

export default App; 