import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Platform, KeyboardAvoidingView, Alert, ActivityIndicator,
} from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { C, STATUS, getAvatarColor, getInitials } from '@/constants/colors';

type Employee = { id: string; name: string; dept: string; email: string; status: string };
const STATUS_OPTIONS = ['Active', 'On Leave', 'Inactive'];

export default function EmployeesScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading]           = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [addVisible, setAddVisible]     = useState(false);
  const [newName, setNewName]           = useState('');
  const [newEmail, setNewEmail]         = useState('');
  const [newDept, setNewDept]           = useState('');
  const [newPassword, setNewPassword]   = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [editVisible, setEditVisible]   = useState(false);
  const [editTarget, setEditTarget]     = useState<Employee | null>(null);
  const [editName, setEditName]         = useState('');
  const [editEmail, setEditEmail]       = useState('');
  const [editDept, setEditDept]         = useState('');
  const [editStatus, setEditStatus]     = useState('');

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setEmployees(data.map(u => ({
        id: u.id,
        name: u.full_name || 'Unknown',
        email: u.email || '',
        dept: u.department || '—',
        status: 'Active' // We'll default to Active since we don't have a status column yet
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const openEdit = (emp: Employee) => {
    setEditTarget(emp); setEditName(emp.name); setEditEmail(emp.email);
    setEditDept(emp.dept); setEditStatus(emp.status); setEditVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editEmail.trim() || !editDept.trim()) {
      Alert.alert('Error', 'Please fill out all fields.'); return;
    }
    setActionLoading(true);
    
    const { error } = await supabase
      .from('users')
      .update({
        full_name: editName.trim(),
        email: editEmail.trim(),
        department: editDept.trim()
      })
      .eq('id', editTarget?.id);

    setActionLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setEditVisible(false);
    loadEmployees();
    if (Platform.OS !== 'web') Alert.alert('Updated', 'Employee information has been saved.');
  };

  const handleDelete = async () => {
    const doDelete = async () => {
      setActionLoading(true);
      const { error } = await supabase.from('users').delete().eq('id', editTarget?.id);
      setActionLoading(false);
      
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
      setEditVisible(false);
      loadEmployees();
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Remove ${editTarget?.name}?`)) doDelete();
    } else {
      Alert.alert('Remove Employee', `Remove ${editTarget?.name} from the directory?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newEmail.trim() || !newDept.trim() || !newPassword.trim()) {
      if (Platform.OS === 'web') window.alert('Please fill out all fields.');
      else Alert.alert('Error', 'Please fill out all fields.'); return;
    }
    
    setActionLoading(true);

    // Create a temporary client so signUp doesn't log out the current admin
    const tempClient = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: authData, error: authError } = await tempClient.auth.signUp({
      email: newEmail.trim(),
      password: newPassword,
      options: {
        data: { full_name: newName.trim() }
      }
    });

    if (authError) {
      setActionLoading(false);
      Alert.alert('Signup Error', authError.message);
      return;
    }

    const newUserId = authData.user?.id;

    if (!newUserId) {
       setActionLoading(false);
       Alert.alert(
         'Account Exists', 
         'Failed to create user. This usually means an account with this email address already exists in your Supabase Authentication system.'
       );
       return;
    }

    // Now insert them into the public directory so they show up in the list
    const { error: dbError } = await supabase.from('users').insert({
      id: newUserId,
      email: newEmail.trim(),
      full_name: newName.trim(),
      department: newDept.trim(),
      role: 'employee'
    });
    
    if (dbError) {
       Alert.alert('Error', 'Failed to add employee: ' + dbError.message);
    }

    setActionLoading(false);
    setAddVisible(false); 
    setNewName(''); setNewEmail(''); setNewDept(''); setNewPassword('');
    loadEmployees();
    
    if (Platform.OS !== 'web' && !dbError) Alert.alert('Created', 'Employee added to directory!');
  };

  const total   = employees.length;
  const active  = employees.filter(e => e.status === 'Active').length;
  const onLeave = employees.filter(e => e.status === 'On Leave').length;

  return (
    <View style={s.container}>
      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { n: total,   l: 'Total Staff', color: C.primary },
          { n: active,  l: 'Active',      color: C.success },
          { n: onLeave, l: 'On Leave',    color: C.warning },
        ].map((item, i) => (
          <View key={i} style={[s.stat, { borderTopColor: item.color, borderTopWidth: 3 }]}>
            <Text style={[s.statN, { color: item.color }]}>{item.n}</Text>
            <Text style={s.statL}>{item.l}</Text>
          </View>
        ))}
      </View>

      {/* Header */}
      <View style={s.headerRow}>
        <View>
          <Text style={s.heading}>Team Directory</Text>
          <Text style={s.headingSub}>{employees.length} members · tap to edit</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setAddVisible(true)} activeOpacity={0.8}>
          <Text style={s.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
        ) : employees.map((emp, idx) => {
          const color = getAvatarColor(idx);
          const st = STATUS[emp.status as keyof typeof STATUS];
          return (
            <TouchableOpacity key={emp.id} style={s.card} activeOpacity={0.75} onPress={() => openEdit(emp)}>
              <View style={[s.avatar, { backgroundColor: color + '18', borderColor: color + '50' }]}>
                <Text style={[s.avatarText, { color }]}>{getInitials(emp.name)}</Text>
              </View>
              <View style={s.empInfo}>
                <Text style={s.empName}>{emp.name}</Text>
                <Text style={s.empMeta}>{emp.dept}  ·  {emp.id.split('-')[0]}</Text>
              </View>
              <View style={[s.badge, { backgroundColor: st.bg, borderColor: st.border }]}>
                <View style={[s.badgeDot, { backgroundColor: st.dot }]} />
                <Text style={[s.badgeText, { color: st.text }]}>{emp.status}</Text>
              </View>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.sheetHeader}>
              <View>
                <Text style={s.sheetTitle}>Edit Employee</Text>
                <Text style={s.sheetSub}>{editTarget?.id.split('-')[0]}</Text>
              </View>
              <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
                <Text style={s.deleteBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.inputLabel}>Full Name</Text>
            <TextInput style={s.input} value={editName} onChangeText={setEditName} placeholderTextColor={C.textMuted} />
            <Text style={s.inputLabel}>Email Address</Text>
            <TextInput style={s.input} value={editEmail} onChangeText={setEditEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={C.textMuted} />
            <Text style={s.inputLabel}>Department</Text>
            <TextInput style={s.input} value={editDept} onChangeText={setEditDept} placeholderTextColor={C.textMuted} />
            <Text style={s.inputLabel}>Status</Text>
            <View style={s.statusRow}>
              {STATUS_OPTIONS.map(opt => {
                const st = STATUS[opt as keyof typeof STATUS];
                const isActive = editStatus === opt;
                return (
                  <TouchableOpacity key={opt}
                    style={[s.statusChip, isActive && { backgroundColor: st.bg, borderColor: st.border }]}
                    onPress={() => setEditStatus(opt)}>
                    <Text style={[s.statusChipText, isActive && { color: st.text, fontWeight: '700' }]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={s.sheetActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setEditVisible(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.primaryBtn} onPress={handleSaveEdit} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Modal */}
      <Modal visible={addVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>New Employee</Text>
            <Text style={s.sheetSub}>Create a new team member account</Text>
            <Text style={s.inputLabel}>Full Name</Text>
            <TextInput style={s.input} placeholder="e.g. John Doe" placeholderTextColor={C.textMuted} value={newName} onChangeText={setNewName} />
            <Text style={s.inputLabel}>Email Address</Text>
            <TextInput style={s.input} placeholder="e.g. john@ems.com" placeholderTextColor={C.textMuted} value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" />
            <Text style={s.inputLabel}>Department</Text>
            <TextInput style={s.input} placeholder="e.g. Engineering" placeholderTextColor={C.textMuted} value={newDept} onChangeText={setNewDept} />
            <Text style={s.inputLabel}>Temporary Password</Text>
            <View style={s.passRow}>
              <TextInput style={s.passInput} placeholder="Set a login password" placeholderTextColor={C.textMuted} value={newPassword} onChangeText={setNewPassword} secureTextEntry={!showPassword} />
              <TouchableOpacity style={s.passEye} onPress={() => setShowPassword(p => !p)}>
                <Text style={{ fontSize: 16 }}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            <View style={s.sheetActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setAddVisible(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.primaryBtn} onPress={handleCreate} disabled={actionLoading}>
                 {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Create Account</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
  stat: {
    flex: 1, backgroundColor: C.card, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, padding: 14, alignItems: 'center',
    shadowColor: C.textSoft, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statN: { fontSize: 28, fontWeight: '900', marginTop: 4 },
  statL: { fontSize: 11, color: C.textSoft, marginTop: 4, fontWeight: '500' },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  heading: { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  headingSub: { fontSize: 12, color: C.textSoft, marginTop: 2 },
  addBtn: {
    backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border, gap: 12,
    shadowColor: C.textSoft, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800' },
  empInfo: { flex: 1 },
  empName: { fontSize: 15, fontWeight: '700', color: C.text },
  empMeta: { fontSize: 12, color: C.textSoft, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  chevron: { fontSize: 20, color: C.textMuted },

  overlay: { flex: 1, backgroundColor: '#00000055', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 36, borderTopWidth: 1, borderColor: C.border,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 22 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  sheetSub: { fontSize: 13, color: C.textSoft, marginTop: 3 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: C.textSoft, marginBottom: 8, letterSpacing: 0.8, textTransform: 'uppercase' },
  input: {
    backgroundColor: C.bg, borderRadius: 12, borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 14, height: 50, color: C.text, fontSize: 14, marginBottom: 18,
  },
  passRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, marginBottom: 28, height: 50 },
  passInput: { flex: 1, paddingHorizontal: 14, color: C.text, fontSize: 14 },
  passEye: { paddingHorizontal: 14, height: 50, justifyContent: 'center' },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  statusChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border },
  statusChipText: { fontSize: 13, color: C.textSoft, fontWeight: '500' },
  sheetActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border },
  cancelText: { color: C.textMid, fontWeight: '600', fontSize: 14 },
  primaryBtn: {
    flex: 1, padding: 14, borderRadius: 14, alignItems: 'center',
    backgroundColor: C.primary, shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  deleteBtn: { backgroundColor: C.dangerFaint, borderWidth: 1.5, borderColor: C.dangerBorder, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  deleteBtnText: { color: C.danger, fontWeight: '700', fontSize: 13 },
});
