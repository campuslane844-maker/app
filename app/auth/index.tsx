import { View, Text, Pressable, Image, ImageBackground } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import GoogleIcon from '@/assets/images/google-icon.svg';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WEB_CLIENT_ID = '365781114531-qmnedake99h2t6rt8i936o6dbdd3pr0s.apps.googleusercontent.com';

export default function LoginScreen() {
  const router = useRouter();
  const { login, logout } = useAuthStore();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      offlineAccess: true,
    });
  }, []);

  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signOut();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      const res = await api.post('/auth/google', {
        idToken: idToken,
      });
      if (res.data.success) {
        const { user, token } = res.data.data;
        login(user, token);
        router.replace("/(tabs)/home")
      }
    } catch (err: any) {
      console.log('Google Sign-In error', err);
      router.push("/auth/signup")
    }
  };

  return (
    <View className="flex-1">
      {/* Top Half */}
      <ImageBackground
        source={require('@/assets/images/hero.png')}
        resizeMode="cover"
        className="h-2/3">
      </ImageBackground>

      {/* Bottom Half */}
      <View className="bg-white h-1/3 flex w-screen flex-col gap-4 p-10">
        {/* Login CTA */}
        <Pressable
          onPress={signIn}
          className="flex flex-row items-center justify-center gap-4 rounded-full border border-gray-300 py-3">
          <GoogleIcon height={25} width={25} />
          <Text className="text-md font-sans font-medium text-gray-900">Login with Google</Text>
        </Pressable>

        {/* Signup CTA */}
        <Pressable
          onPress={() => router.push('/auth/signup')}
          className="items-center rounded-full bg-orange-500 py-4 font-sans">
          <Text className="text-md font-sans font-medium text-white">Create Account</Text>
        </Pressable>
      </View>
    </View>
  );
}
