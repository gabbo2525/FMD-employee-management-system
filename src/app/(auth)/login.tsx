import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, StatusBar, ScrollView,
} from 'react-native';
import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { C } from '@/constants/colors';

const ROLES = {
  admin:    { email: 'admin@ems.com',    password: 'admin123'    },
  employee: { email: 'employee@ems.com', password: 'employee123' },
};

export default function LoginScreen() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [focused, setFocused]           = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Platform.OS === 'web'
        ? window.alert('Please enter your email and password.')
        : Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setIsLoading(true);
    const em = email.trim().toLowerCase();

    // 1. Attempt Sign In
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: em,
      password,
    });

    if (signInError) {
      // Show the exact Supabase error message for easy debugging
      const errMsg = `Login failed: ${signInError.message}\n\nMake sure:\n• Email provider is enabled in Supabase Auth > Providers\n• "Confirm email" is turned OFF\n• The user exists in Authentication > Users`;
      Platform.OS === 'web'
        ? window.alert(errMsg)
        : Alert.alert('Login Failed', errMsg);
    }
    
    setIsLoading(false);
  };

  const fillRole = (role: 'admin' | 'employee') => {
    setEmail(ROLES[role].email);
    setPassword(ROLES[role].password);
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      
      {/* Decorative blobs safely contained */}
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
        <View style={s.blob1} />
        <View style={s.blob2} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Brand */}
          <View style={s.brand}>
            <View style={s.logoWrap}>
              <View style={s.logoInner}>
                <Text style={s.logoText}>EMS</Text>
              </View>
            </View>
            <Text style={s.brandTitle}>Falcon Memorial Garden</Text>
            <Text style={s.brandSub}>Employee Management System</Text>
          </View>

          {/* Form card */}
          <View style={s.card}>
            <Text style={s.cardHeading}>Welcome back</Text>
            <Text style={s.cardSub}>Sign in to access your account</Text>

            {/* Email */}
            <Text style={s.fieldLabel}>Email Address</Text>
            <View style={[s.inputWrap, focused === 'email' && s.inputWrapFocused]}>
              <Text style={s.inputIcon}>✉️</Text>
              <TextInput
                style={s.input}
                placeholder="you@ems.com"
                placeholderTextColor={C.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                onSubmitEditing={() => passwordRef.current?.focus()}
                accessibilityLabel="Email address"
              />
            </View>

            {/* Password */}
            <Text style={s.fieldLabel}>Password</Text>
            <View style={[s.inputWrap, focused === 'password' && s.inputWrapFocused]}>
              <Text style={s.inputIcon}>🔒</Text>
              <TextInput
                ref={passwordRef}
                style={s.input}
                placeholder="Enter your password"
                placeholderTextColor={C.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                onSubmitEditing={handleLogin}
                accessibilityLabel="Password"
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={s.eyeBtn} accessibilityLabel="Toggle password visibility">
                <Text style={{ fontSize: 16 }}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {/* Sign In */}
            <TouchableOpacity
              style={[s.signInBtn, isLoading && s.signInBtnLoading]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
              accessibilityLabel="Sign in"
            >
              {isLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.signInBtnText}>Sign In</Text>
              }
            </TouchableOpacity>

            {/* Role Buttons */}
            <View style={s.roleRow}>
              <TouchableOpacity style={[s.roleBtn, s.roleBtnEmployee]} onPress={() => fillRole('employee')} activeOpacity={0.8}>
                <Text style={s.roleEmoji}>👤</Text>
                <View>
                  <Text style={[s.roleLabel, { color: C.primaryLight }]}>Employee</Text>
                  <Text style={s.roleEmail}>employee@ems.com</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[s.roleBtn, s.roleBtnAdmin]} onPress={() => fillRole('admin')} activeOpacity={0.8}>
                <Text style={s.roleEmoji}>🛡️</Text>
                <View>
                  <Text style={[s.roleLabel, { color: C.primary }]}>Admin</Text>
                  <Text style={s.roleEmail}>admin@ems.com</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={s.footer}>© 2025 Falcon Memorial Garden · All rights reserved</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  blob1: {
    position: 'absolute', top: -80, right: -60,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: C.primaryFaint, opacity: 0.8,
  },
  blob2: {
    position: 'absolute', top: 200, left: -90,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: C.infoFaint, opacity: 0.6,
  },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 72, paddingBottom: 40 },

  // Brand
  brand: { alignItems: 'center', marginBottom: 40 },
  logoWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
    marginBottom: 20, borderWidth: 1.5, borderColor: C.primaryBorder,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 20, elevation: 12,
  },
  logoInner: {
    width: 66, height: 66, borderRadius: 33,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  brandTitle: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.3, marginBottom: 4 },
  brandSub: { fontSize: 13, color: C.textSoft, fontWeight: '400' },

  // Card
  card: {
    backgroundColor: C.card, borderRadius: 28, padding: 28,
    borderWidth: 1, borderColor: C.border, marginBottom: 28,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08, shadowRadius: 28, elevation: 14,
  },
  cardHeading: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 4, letterSpacing: -0.4 },
  cardSub: { fontSize: 13, color: C.textSoft, marginBottom: 28 },

  // Fields
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: C.textSoft,
    marginBottom: 8, letterSpacing: 0.8, textTransform: 'uppercase',
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bg, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 14, height: 52, marginBottom: 20,
  },
  inputWrapFocused: {
    borderColor: C.primary, backgroundColor: C.primaryFaint,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
  },
  inputIcon: { fontSize: 15, marginRight: 10 },
  input: { flex: 1, color: C.text, fontSize: 15 },
  eyeBtn: { padding: 6 },

  // Sign In button
  signInBtn: {
    backgroundColor: C.primary, borderRadius: 14, height: 52,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
  },
  signInBtnLoading: { opacity: 0.7 },
  signInBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },

  // Role buttons
  roleRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  roleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, padding: 14, borderWidth: 1.5,
  },
  roleBtnEmployee: { backgroundColor: C.primaryFaint, borderColor: C.primaryBorder },
  roleBtnAdmin:    { backgroundColor: '#EDE9FE', borderColor: '#C4B5FD' },
  roleEmoji: { fontSize: 20 },
  roleLabel: { fontSize: 13, fontWeight: '700' },
  roleEmail: { fontSize: 10, color: C.textSoft, marginTop: 1 },

  footer: { textAlign: 'center', color: C.textMuted, fontSize: 11, marginTop: 12 },
});
