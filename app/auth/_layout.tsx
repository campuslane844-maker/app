import { Stack } from 'expo-router'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context';

const AuthLayout = () => {
  return (
      <Stack screenOptions={{
      headerShown: false
    }}/>
    
  )
}

export default AuthLayout;
