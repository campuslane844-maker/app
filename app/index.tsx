import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

WebBrowser.maybeCompleteAuthSession();

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '365781114531-qmnedake99h2t6rt8i936o6dbdd3pr0s.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    const loginWithBackend = async () => {
      if (response?.type !== 'success') return;

      try {
        setLoading(true);

        const accessToken = response.authentication?.accessToken;
        console.log(accessToken);
        if (!accessToken) throw new Error('No access token');

        const res = await fetch(`${API_URL}/auth/google`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ accessToken }),
        });

        if (!res.ok) throw new Error('Backend auth failed');

        const data = await res.json();
        console.log(data);
      } catch (err) {
        console.error('Google login error:', err);
      } finally {
        setLoading(false);
      }
    };

    loginWithBackend();
  }, [response]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>

      <Pressable
        disabled={!request || loading}
        style={styles.googleButton}
        onPress={() => promptAsync()}>
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.googleText}>Continue with Google</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 32,
  },
  googleButton: {
    height: 52,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
