import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Switch, Alert, Platform, KeyboardAvoidingView, StatusBar, Image, ActivityIndicator,
} from 'react-native';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { C } from '@/constants/colors';

// Demo passwords — matches login.tsx credentials
const DEMO_PASSWORDS: Record<string, string> = {
  'admin@ems.com':    'admin123',
  'employee@ems.com': 'emp123',
};

const ICON_COLORS: Record<string, { bg: string }> = {
  '🏢': { bg: '#EFF6FF' },
  '👨‍💻': { bg: '#F0FDF4' },
  '📅': { bg: '#FFF7ED' },
  '💼': { bg: '#FDF4FF' },
  '✉️': { bg: '#F0F9FF' },
};

export default function ProfileScreen() {
  const { user, updateUser, signOut } = useAuth();

  const [editVisible, setEditVisible]   = useState(false);
  const [editName, setEditName]         = useState(user?.name ?? '');
  const [editEmail, setEditEmail]       = useState(user?.email ?? '');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [settingsVisible, setSettingsVisible]       = useState(false);
  const [notifLeave, setNotifLeave]                 = useState(true);

  // Avatar image
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Load saved avatar from database on mount
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('users')
      .select('avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setAvatarUri(data.avatar_url);
      });
  }, [user?.id]);


  const handleAvatarPress = async () => {
    const pickAndSave = async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow access to your photo library in Settings.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.3,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        setUploadingAvatar(true);
        try {
          const asset = result.assets[0];
          const ext = (asset.uri.split('.').pop() ?? 'jpg').split('?')[0];
          const dataUri = `data:image/${ext};base64,${asset.base64}`;
          const { error } = await supabase
            .from('users')
            .update({ avatar_url: dataUri })
            .eq('id', user!.id);
          if (error) throw error;
          setAvatarUri(dataUri);
        } catch (e: any) {
          if (Platform.OS === 'web') window.alert('Failed to save photo: ' + e.message);
          else Alert.alert('Error', 'Failed to save photo: ' + e.message);
        } finally {
          setUploadingAvatar(false);
        }
      }
    };

    const removePhoto = async () => {
      setAvatarUri(null);
      await supabase.from('users').update({ avatar_url: null }).eq('id', user!.id);
    };

    if (Platform.OS === 'web') {
      if (avatarUri) {
        const remove = window.confirm('Remove current photo? Click Cancel to choose a new one.');
        if (remove) removePhoto(); else pickAndSave();
      } else {
        pickAndSave();
      }
      return;
    }

    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Choose from Library', onPress: pickAndSave },
      ...(avatarUri ? [{ text: 'Remove Photo', style: 'destructive' as const, onPress: removePhoto }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  // Change Password state
  const [pwVisible, setPwVisible]         = useState(false);
  const [currentPw, setCurrentPw]         = useState('');
  const [newPw, setNewPw]                 = useState('');
  const [confirmPw, setConfirmPw]         = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw]         = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const openChangePw = () => {
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    setShowCurrentPw(false); setShowNewPw(false); setShowConfirmPw(false);
    // Close Settings first, then open Change Password after animation completes
    setSettingsVisible(false);
    setTimeout(() => setPwVisible(true), 400);
  };

  const [actionLoading, setActionLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPw.trim() || !newPw.trim() || !confirmPw.trim()) {
      Alert.alert('Missing Fields', 'Please fill out all fields.'); return;
    }
    if (newPw.length < 6) {
      Alert.alert('Too Short', 'New password must be at least 6 characters.'); return;
    }
    if (newPw !== confirmPw) {
      Alert.alert('Mismatch', 'New password and confirmation do not match.'); return;
    }
    if (newPw === currentPw) {
      Alert.alert('Same Password', 'New password must be different from your current password.'); return;
    }

    setActionLoading(true);

    if (user?.email) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPw
      });

      if (signInError) {
        setActionLoading(false);
        Alert.alert('Incorrect Password', 'Your current password is incorrect.');
        return;
      }
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPw });
    
    setActionLoading(false);
    
    if (updateError) {
      Alert.alert('Error', updateError.message);
      return;
    }

    setPwVisible(false);
    Alert.alert('Password Changed', 'Your password has been updated successfully.');
  };

  const getInitials = (name: string) =>
    name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'EM';

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      if (Platform.OS === 'web') window.alert('Name cannot be empty.');
      else Alert.alert('Error', 'Name cannot be empty.');
      return;
    }
    await updateUser({ name: editName.trim(), email: editEmail.trim() });
    setEditVisible(false);
    if (Platform.OS !== 'web') Alert.alert('Saved', 'Your profile has been updated.');
  };

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) signOut();
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
      ]);
    }
  };

  const DETAILS = [
    { icon: '🏢', label: 'Department', value: 'Engineering' },
    { icon: '👨‍💻', label: 'Position', value: 'Senior Developer' },
    { icon: '📅', label: 'Date Hired', value: 'January 15, 2022' },
    { icon: '💼', label: 'Employment', value: 'Regular Full-Time' },
    { icon: '✉️', label: 'Email', value: user?.email || 'employee@ems.com' },
  ];

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={s.container} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        <View style={s.avatarSection}>
          <View style={s.avatarWrapper}>
            <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.85}>
              {uploadingAvatar ? (
                <View style={[s.avatarCircle, { justifyContent: 'center', alignItems: 'center' }]}>
                  <ActivityIndicator color={C.primary} />
                </View>
              ) : avatarUri ? (
                <Image source={{ uri: avatarUri }} style={s.avatarCircle} />
              ) : (
                <View style={s.avatarCircle}>
                  <Text style={s.avatarText}>{getInitials(user?.name ?? 'Employee Name')}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={s.statusDot} />
          </View>
        </View>

        {/* Name / ID */}
        <View style={s.nameBlock}>
          <Text style={s.profileName}>{user?.name || 'Employee Name'}</Text>
          <View style={s.badge}>
            <Text style={s.badgeText}>ID: {user?.employeeId ?? 'EMP-2024-001'}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={s.actionRow}>
          <TouchableOpacity style={[s.actionBtn, s.primaryBtn]} activeOpacity={0.82}
            onPress={() => { setEditName(user?.name ?? ''); setEditEmail(user?.email ?? ''); setEditVisible(true); }}>
            <Text style={s.primaryBtnIcon}>✏️</Text>
            <Text style={s.primaryBtnText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, s.secondaryBtn]} activeOpacity={0.82}
            onPress={() => setSettingsVisible(true)}>
            <Text style={s.secondaryBtnIcon}>⚙️</Text>
            <Text style={s.secondaryBtnText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Employee Information */}
        <Text style={s.sectionTitle}>Employee Information</Text>
        <View style={s.infoCard}>
          {DETAILS.map((item, i) => {
            const colors = ICON_COLORS[item.icon] ?? { bg: C.primaryFaint };
            return (
              <View key={i} style={[s.infoRow, i > 0 && s.infoRowBorder]}>
                <View style={[s.iconBox, { backgroundColor: colors.bg }]}>
                  <Text style={s.iconText}>{item.icon}</Text>
                </View>
                <View style={s.infoTextContainer}>
                  <Text style={s.infoLabel}>{item.label}</Text>
                  <Text style={s.infoValue}>{item.label === 'Email' ? (user?.email || item.value) : item.value}</Text>
                </View>
                <Text style={s.chevron}>›</Text>
              </View>
            );
          })}
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={s.signOutCard} activeOpacity={0.8} onPress={handleSignOut}>
          <Text style={s.signOutCardIcon}>🚪</Text>
          <Text style={s.signOutCardText}>Sign Out</Text>
          <Text style={s.chevron}>›</Text>
        </TouchableOpacity>

        {/* ── CHANGE PASSWORD MODAL ── */}
        <Modal visible={pwVisible} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
            <View style={s.modalCard}>
              <View style={s.handle} />
              <View style={s.modalHeader}>
                <View>
                  <Text style={s.modalTitle}>Change Password</Text>
                  <Text style={s.modalSub}>Update your login credentials</Text>
                </View>
                <TouchableOpacity style={s.modalCloseBtn} onPress={() => setPwVisible(false)}>
                  <Text style={s.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.inputLabel}>Current Password</Text>
              <View style={s.pwRow}>
                <TextInput
                  style={s.pwInput}
                  value={currentPw} onChangeText={setCurrentPw}
                  placeholder="Enter current password"
                  placeholderTextColor={C.textMuted}
                  secureTextEntry={!showCurrentPw}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={s.pwEye} onPress={() => setShowCurrentPw(v => !v)}>
                  <Text style={{ fontSize: 16 }}>{showCurrentPw ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.inputLabel}>New Password</Text>
              <View style={s.pwRow}>
                <TextInput
                  style={s.pwInput}
                  value={newPw} onChangeText={setNewPw}
                  placeholder="At least 6 characters"
                  placeholderTextColor={C.textMuted}
                  secureTextEntry={!showNewPw}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={s.pwEye} onPress={() => setShowNewPw(v => !v)}>
                  <Text style={{ fontSize: 16 }}>{showNewPw ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.inputLabel}>Confirm New Password</Text>
              <View style={[s.pwRow, { marginBottom: 24 }]}>
                <TextInput
                  style={s.pwInput}
                  value={confirmPw} onChangeText={setConfirmPw}
                  placeholder="Re-enter new password"
                  placeholderTextColor={C.textMuted}
                  secureTextEntry={!showConfirmPw}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={s.pwEye} onPress={() => setShowConfirmPw(v => !v)}>
                  <Text style={{ fontSize: 16 }}>{showConfirmPw ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>

              <View style={s.modalActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setPwVisible(false)}>
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.submitBtn} onPress={handleChangePassword} disabled={actionLoading}>
                  {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>Update Password</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── EDIT PROFILE MODAL ── */}
        <Modal visible={editVisible} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
            <View style={s.modalCard}>
              <View style={s.handle} />
              <View style={s.modalHeader}>
                <View>
                  <Text style={s.modalTitle}>Edit Profile</Text>
                  <Text style={s.modalSub}>Update your personal information</Text>
                </View>
                <TouchableOpacity style={s.modalCloseBtn} onPress={() => setEditVisible(false)}>
                  <Text style={s.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <TouchableOpacity onPress={handleAvatarPress} style={s.editAvatarWrapper} activeOpacity={0.8}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={s.editAvatarImage} />
                  ) : (
                    <View style={s.editAvatarCircle}>
                      <Text style={s.editAvatarText}>{getInitials(editName || 'EM')}</Text>
                    </View>
                  )}
                  <View style={s.editAvatarBadge}>
                    <Text style={{ fontSize: 14 }}>📷</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={s.inputLabel}>Full Name</Text>
              <TextInput
                style={[s.input, focusedField === 'name' && s.inputFocused]}
                value={editName} onChangeText={setEditName}
                placeholder="Enter your full name" placeholderTextColor={C.textMuted}
                onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)}
              />
              <Text style={s.inputLabel}>Email Address</Text>
              <TextInput
                style={[s.input, focusedField === 'email' && s.inputFocused]}
                value={editEmail} onChangeText={setEditEmail}
                placeholder="Enter your email" placeholderTextColor={C.textMuted}
                keyboardType="email-address" autoCapitalize="none"
                onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
              />
              <View style={s.modalActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setEditVisible(false)}>
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.submitBtn} onPress={handleSaveProfile}>
                  <Text style={s.submitText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── SETTINGS MODAL (full-screen) ── */}
        <Modal visible={settingsVisible} transparent={false} animationType="slide">
          <View style={ss.screen}>
            <StatusBar barStyle="dark-content" />
            <View style={ss.topBar}>
              <TouchableOpacity style={ss.backBtn} onPress={() => setSettingsVisible(false)}>
                <Text style={ss.backIcon}>‹</Text>
              </TouchableOpacity>
              <Text style={ss.topBarTitle}>Settings</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ss.scrollContent}>

              {/* Profile mini-card */}
              <View style={ss.profileCard}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={ss.miniAvatar} />
                ) : (
                  <View style={ss.miniAvatar}>
                    <Text style={ss.miniAvatarText}>{getInitials(user?.name ?? 'EM')}</Text>
                  </View>
                )}
                <View style={ss.profileCardText}>
                  <Text style={ss.profileCardName}>{user?.name || 'Employee Name'}</Text>
                  <Text style={ss.profileCardSub}>{user?.email || 'employee@ems.com'}</Text>
                </View>
                <View style={ss.activePill}>
                  <View style={ss.activeDot} />
                  <Text style={ss.activePillText}>Active</Text>
                </View>
              </View>

              {/* NOTIFICATIONS */}
              <Text style={ss.groupLabel}>Notifications</Text>
              <View style={ss.group}>
                <View style={ss.row}>
                  <View style={[ss.rowIcon, { backgroundColor: '#EFF6FF' }]}><Text style={ss.rowEmoji}>🔔</Text></View>
                  <View style={ss.rowBody}>
                    <Text style={ss.rowTitle}>Leave Updates</Text>
                    <Text style={ss.rowSub}>Approval & rejection alerts</Text>
                  </View>
                  <Switch value={notifLeave} onValueChange={setNotifLeave}
                    trackColor={{ false: C.border, true: C.primaryLight }} thumbColor="#fff" ios_backgroundColor={C.border} />
                </View>
              </View>

              {/* SECURITY */}
              <Text style={ss.groupLabel}>Security</Text>
              <View style={ss.group}>
                <TouchableOpacity style={ss.row} activeOpacity={0.7}
                  onPress={openChangePw}>
                  <View style={[ss.rowIcon, { backgroundColor: '#FDF4FF' }]}><Text style={ss.rowEmoji}>🔒</Text></View>
                  <View style={ss.rowBody}>
                    <Text style={ss.rowTitle}>Change Password</Text>
                    <Text style={ss.rowSub}>Update your login credentials</Text>
                  </View>
                  <Text style={ss.chevronRight}>›</Text>
                </TouchableOpacity>
              </View>

              {/* ABOUT */}
              <Text style={ss.groupLabel}>About</Text>
              <View style={ss.group}>
                <View style={ss.row}>
                  <View style={[ss.rowIcon, { backgroundColor: C.primaryFaint }]}><Text style={ss.rowEmoji}>ℹ️</Text></View>
                  <View style={ss.rowBody}>
                    <Text style={ss.rowTitle}>App Version</Text>
                    <Text style={ss.rowSub}>v1.0.0 · Build 2024</Text>
                  </View>
                  <View style={ss.versionBadge}>
                    <Text style={ss.versionBadgeText}>Latest</Text>
                  </View>
                </View>
              </View>

              {/* Sign Out */}
              <TouchableOpacity style={ss.signOutBtn} activeOpacity={0.8} onPress={handleSignOut}>
                <Text style={ss.signOutIcon}>🚪</Text>
                <Text style={ss.signOutText}>Sign Out</Text>
              </TouchableOpacity>

              <Text style={ss.footerNote}>Employee Management System · © 2024</Text>

            </ScrollView>
          </View>
        </Modal>

      </ScrollView>
    </>
  );
}

// ─── Profile screen styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEEEF3' },
  content: { paddingBottom: 48 },

  avatarSection: { backgroundColor: '#EEEEF3', alignItems: 'center', paddingTop: 40, paddingBottom: 24 },
  avatarWrapper: { position: 'relative' },
  avatarCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: C.primary,
  },
  avatarText: { fontSize: 36, fontWeight: '900', color: C.primary },
  statusDot: {
    position: 'absolute', bottom: 6, right: 6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: C.success, borderWidth: 3, borderColor: '#EEEEF3',
  },

  nameBlock: { alignItems: 'center', paddingHorizontal: 24, marginBottom: 24 },
  profileName: { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 10, letterSpacing: -0.3 },
  badge: {
    backgroundColor: '#F5F3FF', paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: C.primaryBorder,
  },
  badgeText: { color: C.primary, fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },

  actionRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 28 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 16, gap: 6, borderWidth: 1,
  },
  primaryBtn: {
    backgroundColor: C.primary, borderColor: '#6D28D9',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  primaryBtnIcon: { fontSize: 15 },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: C.card, borderColor: C.border,
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  secondaryBtnIcon: { fontSize: 15 },
  secondaryBtnText: { color: C.textMid, fontSize: 14, fontWeight: '700' },

  sectionTitle: {
    fontSize: 11, fontWeight: '800', color: C.textSoft,
    paddingHorizontal: 24, marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 1.4,
  },
  infoCard: {
    backgroundColor: C.card, marginHorizontal: 20,
    borderRadius: 20, padding: 6, borderWidth: 1, borderColor: C.border,
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 4, marginBottom: 16,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 12 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: C.borderLight },
  iconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  iconText: { fontSize: 19 },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 11, color: C.textSoft, marginBottom: 2, fontWeight: '600' },
  infoValue: { fontSize: 14, fontWeight: '700', color: C.text },
  chevron: { fontSize: 20, color: C.textMuted },

  signOutCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.dangerFaint, marginHorizontal: 20,
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: C.dangerBorder, gap: 10, marginBottom: 8,
  },
  signOutCardIcon: { fontSize: 18 },
  signOutCardText: { flex: 1, color: C.danger, fontWeight: '700', fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: '#00000050', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: C.card, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 28, paddingBottom: 36, borderTopWidth: 1, borderColor: C.border,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 2 },
  modalSub: { fontSize: 13, color: C.textSoft },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.borderLight, alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { color: C.textSoft, fontSize: 13, fontWeight: '700' },
  editAvatarWrapper: { position: 'relative' },
  editAvatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.primary,
  },
  editAvatarImage: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 2, borderColor: C.primary,
  },
  editAvatarText: { fontSize: 28, fontWeight: '900', color: C.primary },
  editAvatarBadge: {
    position: 'absolute', bottom: 0, right: -4,
    backgroundColor: '#fff', borderRadius: 16, width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  inputLabel: { fontSize: 11, fontWeight: '700', color: C.textSoft, marginBottom: 8, letterSpacing: 0.8, textTransform: 'uppercase' },
  input: {
    backgroundColor: C.bg, borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    padding: 14, color: C.text, fontSize: 15, marginBottom: 18,
  },
  inputFocused: { borderColor: C.primaryLight, backgroundColor: C.primaryFaint },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border },
  cancelText: { color: C.textMid, fontWeight: '600', fontSize: 14 },
  submitBtn: {
    flex: 1, padding: 14, borderRadius: 14, alignItems: 'center',
    backgroundColor: C.primary, shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Password field row
  pwRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bg, borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    marginBottom: 18,
  },
  pwInput: { flex: 1, padding: 14, color: C.text, fontSize: 15 },
  pwEye: { paddingHorizontal: 14, paddingVertical: 14 },
});
// ─── Settings full-screen styles ─────────────────────────────────────────────
const ss = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 48 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  backIcon: { fontSize: 26, color: C.primary, fontWeight: '300', lineHeight: 30 },
  topBarTitle: { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.2 },

  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, marginHorizontal: 16, marginTop: 20, marginBottom: 8,
    borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.border,
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  miniAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.primaryFaint, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.primaryBorder, marginRight: 14,
  },
  miniAvatarText: { fontSize: 18, fontWeight: '900', color: C.primary },
  profileCardText: { flex: 1 },
  profileCardName: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 2 },
  profileCardSub: { fontSize: 12, color: C.textSoft },
  activePill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, borderColor: '#A7F3D0', gap: 5,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success },
  activePillText: { fontSize: 11, fontWeight: '700', color: C.success },

  groupLabel: {
    fontSize: 11, fontWeight: '800', color: C.textSoft,
    letterSpacing: 1.4, textTransform: 'uppercase',
    marginHorizontal: 24, marginTop: 24, marginBottom: 8,
  },
  group: {
    backgroundColor: C.card, marginHorizontal: 16,
    borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16, backgroundColor: C.card,
  },
  divider: { height: 1, backgroundColor: C.borderLight, marginLeft: 68 },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  rowEmoji: { fontSize: 18 },
  rowBody: { flex: 1, marginRight: 8 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  rowSub: { fontSize: 12, color: C.textSoft, marginTop: 1 },
  chevronRight: { fontSize: 22, color: C.textMuted, fontWeight: '300' },

  versionBadge: {
    backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1, borderColor: '#A7F3D0',
  },
  versionBadgeText: { fontSize: 11, fontWeight: '700', color: C.success },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, marginTop: 28,
    backgroundColor: C.dangerFaint, borderWidth: 1.5, borderColor: C.dangerBorder,
    borderRadius: 18, paddingVertical: 16, gap: 10,
    shadowColor: C.danger, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
  },
  signOutIcon: { fontSize: 18 },
  signOutText: { fontSize: 15, fontWeight: '800', color: C.danger },
  footerNote: { textAlign: 'center', fontSize: 12, color: C.textMuted, marginTop: 20, fontWeight: '500' },
});
