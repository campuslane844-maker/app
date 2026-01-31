import { View, Text, Image, Pressable, ScrollView } from 'react-native';
import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import api from '@/lib/api';
import { useOnboardingStore } from '@/lib/store/onboarding';
import { useAuthStore } from '@/lib/store/auth';
import GoogleIcon from '@/assets/images/google-icon.svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AWS_URL = process.env.EXPO_PUBLIC_AWS_URL;

export default function RoleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    role?: 'student' | 'parent' | 'teacher';
    ref?: string;
  }>();

  const urlRole = params.role ?? null;
  const referralCode = params.ref ?? null;

  const { role, setField } = useOnboardingStore();
  const { login, logout, user, isAuthenticated } = useAuthStore();

  /* Redirect if logged in */
  useEffect(() => {
    if (user && isAuthenticated) {
      router.replace("/(tabs)/home")
    }
  }, [user, isAuthenticated]);

  

  /* Referral */
  useEffect(() => {
    if (referralCode) {
      setField('referralCode', referralCode);
    }
  }, [referralCode]);

  /* Sync role from URL */
  useEffect(() => {
    if (urlRole) setField('role', urlRole);
  }, [urlRole]);

  const handleGoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signOut();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (!idToken) return;
      setField("idToken", idToken);

      const res = await api.post('/auth/google', {
        idToken,
        role: urlRole || role,
        referralCode,
      });

      if (res.data.success) {
        const { user, token } = res.data.data;
        login(user, token);
        setField("idToken", idToken);
        router.replace("/(tabs)/home")
      } 
    } catch (err) {
      console.log('Google Sign-In failed', err);
      router.push('/auth/signup/details');
    } 
  };

  const rolesToRender: Array<'student' | 'teacher' | 'parent'> = urlRole
    ? [urlRole]
    : ['student', 'teacher', 'parent'];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }} className="px-4 py-24">
      <View className="items-center">
        {/* Logo */}
        <Image
          source={{
            uri: `${AWS_URL}/logos/logos/FULL LOGO HORIZONTAL COLOR.png`,
          }}
          className="mb-10 h-20 w-44"
          resizeMode="contain"
        />

        {/* Heading */}
        <View className="mb-12 items-center px-12">
          <Text className="text-center font-heading2 text-2xl text-gray-800">
            Select Your Role
          </Text>
          <Text className="mt-2 text-center font-sans text-base text-gray-500">
              Choose whether you’re a student or parent to continue
          </Text>
        </View>
        

        {/* Role Cards */}
        <View className={`flex flex-row gap-2`}>
          {rolesToRender.map((r) => (
            <Pressable
              key={r}
              onPress={() => setField('role', r)}
              className={`flex-col gap-4 items-center justify-evenly rounded-xl bg-white p-2 shadow md:flex-col ${
                role === r ? 'border border-primary' : 'border border-gray-300'
              }`}>
              <Image
                source={{ uri: `${AWS_URL}/images/${r}.png` }}
                className="h-20 w-20 md:h-28 md:w-28"
                resizeMode="contain"
              />
              <Text className="text-sm font-heading2 font-medium capitalize text-gray-600">{r}</Text>
            </Pressable>
          ))}
        </View>

        {/* Google Button */}
        {(role || urlRole) && (
          <Pressable
            onPress={handleGoogleLogin}
            className="mt-12 flex-row items-center gap-6 rounded-full border border-gray-300 bg-white px-8 py-4 shadow">
            <GoogleIcon height={25} width={25} />
            <Text className="text-md font-sans font-medium text-gray-900">Continue with Google</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}
