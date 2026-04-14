import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store';

export default function LoginScreen() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('passer');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error } = useAuthStore();

  const handleLogin = async () => {
    try {
      await login(username, password);
    } catch (err) {
      // Error is handled by the store
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBg}>
            <MaterialCommunityIcons name="bus" size={48} color="white" />
          </View>
          <Text style={styles.logoText}>TranspoBot</Text>
          <Text style={styles.logoSubtext}>Sénégal 🇸🇳</Text>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Connexion</Text>
          <Text style={styles.subtitle}>Accédez à votre espace de gestion</Text>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Identifiant</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="account" size={20} color="#c4581e" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Votre identifiant"
                placeholderTextColor="#ccc"
                value={username}
                onChangeText={setUsername}
                editable={!isLoading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock" size={20} color="#c4581e" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Votre mot de passe"
                placeholderTextColor="#ccc"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <MaterialCommunityIcons
                  name={showPassword ? 'eye' : 'eye-off'}
                  size={20}
                  color="#c4581e"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialCommunityIcons name="login" size={18} color="white" />
                <Text style={styles.loginBtnText}>Connexion</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Demo Credentials */}
        <View style={styles.demoContainer}>
          <View style={styles.demoBadge}>
            <MaterialCommunityIcons name="shield-check" size={12} color="#c4581e" />
            <Text style={styles.demoBadgeText}>Accès Démo</Text>
          </View>
          <Text style={styles.demoLabel}>Identifiant</Text>
          <Text style={styles.demoValue}>admin</Text>
          <Text style={styles.demoLabel} style={{ marginTop: 8 }}>
            Mot de passe
          </Text>
          <Text style={styles.demoValue}>passer</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2026 TranspoBot Sénégal 🇸🇳 · Dakar, Sénégal</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBg: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#c4581e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#c4581e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  logoSubtext: {
    fontSize: 11,
    fontWeight: '700',
    color: '#c4581e',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  titleContainer: {
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    marginLeft: 10,
    flex: 1,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
  },
  eyeIcon: {
    padding: 8,
  },
  loginBtn: {
    flexDirection: 'row',
    backgroundColor: '#c4581e',
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    shadowColor: '#c4581e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  demoContainer: {
    backgroundColor: '#fffbf0',
    borderRadius: 10,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#c4581e',
  },
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 4,
  },
  demoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#c4581e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  demoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
  },
  demoValue: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#1a1a1a',
    fontWeight: '600',
    marginTop: 2,
  },
  footer: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerText: {
    fontSize: 10,
    color: '#ccc',
    textAlign: 'center',
  },
});
