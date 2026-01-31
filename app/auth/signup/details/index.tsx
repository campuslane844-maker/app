'use client';

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';

import api from '@/lib/api';
import { useOnboardingStore } from '@/lib/store/onboarding';
import { useAuthStore } from '@/lib/store/auth';
import { ClassPickerModal } from '@/components/ClassPicker';

interface IClass {
  _id: string; // UI MUST use string
  name: string;
}

export default function DetailsPage() {
  const router = useRouter();

  const {
    role,
    idToken,
    name,
    phone,
    pincode,
    state,
    city,
    country,
    age,
    classLevel,
    upiId,
    classOther,
    setField,
  } = useOnboardingStore();

  const { login } = useAuthStore();

  const [classes, setClasses] = useState<IClass[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [open, setOpen] = useState(false);

  const selectedClassName = classes.find((c) => c._id === classLevel)?.name;

  const { referralCode } = useOnboardingStore.getState();

  /* ---------------------------------- */
  /* Fetch classes                      */
  /* ---------------------------------- */
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/classes');
        setClasses(res.data.data);
      } catch {
        setErrorMessage('Unable to load classes');
      }
    };

    fetchClasses();
  }, []);

  /* ---------------------------------- */
  /* Auto-fill city/state from PIN      */
  /* ---------------------------------- */
  const fetchLocation = async (pin: string) => {
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();

      if (data?.[0]?.PostOffice?.length) {
        const info = data[0].PostOffice[0];
        setField('city', info.District);
        setField('state', info.State);
        setField('country', 'India');
      }
    } catch {}
  };

  const isFormValid = (() => {
    if (!name?.trim()) return false;
    if (!phone || phone.length !== 10) return false;
    if (!pincode || pincode.length !== 6) return false;
    if (!city?.trim()) return false;
    if (!state?.trim()) return false;
    if (!country?.trim()) return false;

    if (role === 'student') {
      if (!age || age <= 0) return false;
      if (!classLevel) return false;
    }

    if (role === 'teacher') {
      if (!upiId?.trim()) return false;
    }

    return true;
  })();

  /* ---------------------------------- */
  /* Submit                             */
  /* ---------------------------------- */
  const handleSubmit = async () => {
    setErrorMessage('');
    if (!isFormValid) {
      setErrorMessage('Please fill all required fields');
      return;
    }
    if (!phone || phone.length !== 10) {
      setErrorMessage('Enter a valid 10-digit phone number');
      return;
    }

    try {
      const payload: any = {
        role,
        idToken,
        name,
        phone,
        pincode,
        state,
        city,
        upiId,
        country,
        age,
        classLevel: classLevel || null, // string | null
        classOther: classOther || undefined,
        referralCode,
      };

      if (role === 'teacher') {
        payload.upiId = (useOnboardingStore.getState() as any).upiId;
      }

      const res = await api.post('/auth/google', payload);
      const { user, token } = res.data.data;
      login(user, token);
      router.replace("/(tabs)/home")
    } catch {
      setErrorMessage('Submission failed. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 80,
          paddingBottom: 180,
        }}
        className="bg-white">
        {/* Header */}
        <View className="mb-10">
          <Text className="font-heading1 text-2xl text-gray-900">Complete your profile</Text>
          <Text className="mt-2 font-sans text-sm text-gray-500">
            We just need a few details to get you started.
          </Text>
        </View>

        {/* Error */}
        {errorMessage ? (
          <Text className="mb-6 font-sans text-sm text-red-500">{errorMessage}</Text>
        ) : null}

        {/* Form */}
        <View className="gap-6">
          {/* Name */}
          <Field label="Full name">
            <TextInput
              style={{
                backgroundColor: '#f0f0f0',
                borderRadius: 12,
                paddingHorizontal: 10,
              }}
              value={name}
              onChangeText={(v) => setField('name', v)}
              className="input font-sans"
            />
          </Field>

          {/* Phone */}
          <Field label="Phone number">
            <TextInput
              style={{
                backgroundColor: '#f0f0f0',
                borderRadius: 12,
                paddingHorizontal: 10,
              }}
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={(v) => setField('phone', v.replace(/\D/g, ''))}
              className="input font-sans"
            />
          </Field>

          {/* Teacher fields */}
          {role === 'teacher' && (
            <>
              <Field label="UPI ID">
                <TextInput
                  style={{
                    backgroundColor: '#f0f0f0',
                    borderRadius: 12,
                    paddingHorizontal: 10,
                  }}
                  value={upiId ? String(upiId) : ''}
                  onChangeText={(v) => setField('upiId', v)}
                  className="input font-sans"
                />
              </Field>
            </>
          )}

          {/* Student fields */}
          {role === 'student' && (
            <>
              <Field label="Age">
                <TextInput
                  style={{
                    backgroundColor: '#f0f0f0',
                    borderRadius: 12,
                    paddingHorizontal: 10,
                  }}
                  keyboardType="number-pad"
                  value={age ? String(age) : ''}
                  onChangeText={(v) => setField('age', Number(v))}
                  className="input font-sans"
                />
              </Field>

              <View className="gap-1">
                <Text className="text-sm text-gray-600">Class</Text>

                <Pressable
                  onPress={() => setOpen(true)}
                  className="h-14 justify-center rounded-xl border border-gray-200 px-4">
                  <Text className={selectedClassName ? 'text-gray-900' : 'text-gray-400'}>
                    {selectedClassName ?? 'Select your class'}
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {/* Location */}
          <Field label="Location">
            <View className="flex-row gap-4">
              <TextInput
                style={{
                  backgroundColor: '#f0f0f0',
                  borderRadius: 12,
                  paddingHorizontal: 10,
                }}
                keyboardType="number-pad"
                value={pincode}
                onChangeText={(v) => {
                  setField('pincode', v);
                  if (v.length === 6) fetchLocation(v);
                }}
                className="input flex-1 font-sans"
              />
              <TextInput
                style={{
                  backgroundColor: '#f0f0f0',
                  borderRadius: 12,
                  paddingHorizontal: 10,
                }}
                value={city}
                onChangeText={(v) => setField('city', v)}
                className="input flex-1 font-sans"
              />
            </View>

            <View className="mt-3 flex-row gap-4">
              <TextInput
                style={{
                  backgroundColor: '#f0f0f0',
                  borderRadius: 12,
                  paddingHorizontal: 10,
                }}
                value={state}
                onChangeText={(v) => setField('state', v)}
                className="input flex-1 font-sans"
              />
              <TextInput
                style={{
                  backgroundColor: '#f0f0f0',
                  borderRadius: 12,
                  paddingHorizontal: 10,
                }}
                value={country}
                onChangeText={(v) => setField('country', v)}
                className="input flex-1 font-sans"
              />
            </View>
          </Field>
        </View>

        {/* CTA */}
        <View className="mt-10">
          <Pressable
            onPress={handleSubmit}
            className="h-12 items-center justify-center rounded-full bg-primary">
            <Text className="font-sans text-base font-medium text-white">Save & Continue</Text>
          </Pressable>
        </View>
      </ScrollView>
      <ClassPickerModal
        visible={open}
        onClose={() => setOpen(false)}
        classes={classes}
        selectedValue={classLevel as string | null}
        onSelect={(value) => {
          if (!value) {
            setField('classLevel', null);
            setField('classOther', undefined);
          } else {
            setField('classLevel', value);
          }
        }}
      />
    </KeyboardAvoidingView>
  );
}

/* ---------------------------------- */
/* Reusable Field Wrapper              */
/* ---------------------------------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-1">
      <Text className="font-sans text-sm text-gray-600">{label}</Text>
      {children}
    </View>
  );
}
