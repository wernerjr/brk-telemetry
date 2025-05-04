import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import HomeScreen from './src/components/HomeScreen';

function App(): React.JSX.Element {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <HomeScreen />
    </SafeAreaView>
  );
}

export default App; 