import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, Platform, KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { C, STATUS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';

const LEAVE_TYPES = ['Sick Leave', 'Vacation Leave', 'Emergency Leave', 'Maternity Leave', 'Paternity Leave'];

const LEAVE_ICONS: Record<string, string> = {
  'Sick Leave': '🤒', 'Vacation Leave': '🏖️', 'Emergency Leave': '🚨',
  'Maternity Leave': '👶', 'Paternity Leave': '👨‍👧',
};

const LEAVE_COLORS: Record<string, string> = {
  'Sick Leave': C.warning, 'Vacation Leave': C.primary,
  'Emergency Leave': C.pink, 'Maternity Leave': C.success, 'Paternity Leave': '#7C3AED',
};

type LeaveRecord = {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
  reason?: string;
};

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  if (start === end) {
    return s.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return `${s.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}–${e.toLocaleDateString('en-PH', { day: 'numeric', year: 'numeric' })}`;
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
}

export default function LeaveScreen() {
  const { user } = useAuth();
  const [leaveHistory, setLeaveHistory] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedType, setSelectedType] = useState(LEAVE_TYPES[0]);
  const [reason, setReason]             = useState('');
  const [startDate, setStartDate]       = useState('');
  const [endDate, setEndDate]           = useState('');

  const fetchLeaves = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('leaves')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setLeaveHistory(data ?? []);
    } catch (e) {
      console.error('Failed to fetch leaves:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      if (Platform.OS === 'web') window.alert('Please enter a reason.');
      else Alert.alert('Missing Reason', 'Please enter a reason for your leave request.');
      return;
    }
    if (!startDate || !endDate) {
      if (Platform.OS === 'web') window.alert('Please enter start and end dates (YYYY-MM-DD).');
      else Alert.alert('Missing Dates', 'Please enter start and end dates.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('leaves').insert({
        user_id: user!.id,
        leave_type: selectedType,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
        status: 'pending',
      });

      if (error) throw error;

      if (Platform.OS === 'web') window.alert('Leave request submitted for approval.');
      else Alert.alert('Submitted', 'Your leave request has been submitted for approval.');

      setModalVisible(false);
      setReason('');
      setStartDate('');
      setEndDate('');
      await fetchLeaves();
    } catch (e: any) {
      if (Platform.OS === 'web') window.alert('Failed: ' + e.message);
      else Alert.alert('Error', e.message ?? 'Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  const sickBalance     = 10;
  const vacationBalance = 15;
  const emergencyBalance = 3;

  return (
    <View style={s.container}>

      {/* Balance cards */}
      <View style={s.balanceRow}>
        {[
          { n: String(sickBalance),      l: 'Sick',      sub: 'Leave', color: C.warning, icon: '🤒' },
          { n: String(vacationBalance),   l: 'Vacation',  sub: 'Leave', color: C.primary, icon: '🏖️' },
          { n: String(emergencyBalance),  l: 'Emergency', sub: 'Leave', color: C.pink,    icon: '🚨' },
        ].map((item, i) => (
          <View key={i} style={[s.balCard, { borderTopColor: item.color, borderTopWidth: 3 }]}>
            <Text style={s.balIcon}>{item.icon}</Text>
            <Text style={[s.balNum, { color: item.color }]}>{item.n}</Text>
            <Text style={s.balLabel}>{item.l}</Text>
            <Text style={s.balSub}>{item.sub}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity style={s.newBtn} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
        <Text style={s.newBtnText}>+ File a Leave Request</Text>
      </TouchableOpacity>

      {/* History */}
      <Text style={s.sectionLabel}>Leave History</Text>
      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 24 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
          {leaveHistory.length === 0 && (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📋</Text>
              <Text style={s.emptyText}>No leave requests yet.</Text>
            </View>
          )}
          {leaveHistory.map((req) => {
            const statusKey = req.status.charAt(0).toUpperCase() + req.status.slice(1);
            const st = STATUS[statusKey as keyof typeof STATUS] ?? STATUS['Pending'];
            const icon = LEAVE_ICONS[req.leave_type] ?? '📋';
            const color = LEAVE_COLORS[req.leave_type] ?? C.primary;
            const days = daysBetween(req.start_date, req.end_date);
            return (
              <View key={req.id} style={s.card}>
                <View style={[s.cardAccent, { backgroundColor: color }]} />
                <View style={s.cardBody}>
                  <View style={s.cardTop}>
                    <View style={s.cardTopLeft}>
                      <Text style={s.cardIcon}>{icon}</Text>
                      <View>
                        <Text style={s.leaveType}>{req.leave_type}</Text>
                        <Text style={s.leaveDates}>{formatDateRange(req.start_date, req.end_date)}  ·  {days} day{days > 1 ? 's' : ''}</Text>
                      </View>
                    </View>
                    <View style={[s.badge, { backgroundColor: st.bg, borderColor: st.border }]}>
                      <View style={[s.badgeDot, { backgroundColor: st.dot }]} />
                      <Text style={[s.badgeText, { color: st.text }]}>{statusKey}</Text>
                    </View>
                  </View>
                  {req.reason ? (
                    <Text style={s.leaveReason}>"{req.reason}"</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>File Leave Request</Text>
            <Text style={s.sheetSub}>Submit a new time-off request for approval</Text>

            <Text style={s.inputLabel}>Leave Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, maxHeight: 44 }}>
              <View style={s.typeRow}>
                {LEAVE_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[s.typeChip, selectedType === t && s.typeChipActive]}
                    onPress={() => setSelectedType(t)}
                  >
                    <Text style={[s.typeChipText, selectedType === t && s.typeChipTextActive]}>
                      {LEAVE_ICONS[t]}  {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={s.inputLabel}>Start Date (YYYY-MM-DD)</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. 2025-06-01"
              placeholderTextColor={C.textMuted}
              value={startDate}
              onChangeText={setStartDate}
            />

            <Text style={s.inputLabel}>End Date (YYYY-MM-DD)</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. 2025-06-03"
              placeholderTextColor={C.textMuted}
              value={endDate}
              onChangeText={setEndDate}
            />

            <Text style={s.inputLabel}>Reason</Text>
            <TextInput
              style={s.textArea}
              placeholder="Describe the reason for your leave..."
              placeholderTextColor={C.textMuted}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={s.sheetActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={submitting}>
                {submitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.submitText}>Submit Request</Text>
                }
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

  balanceRow: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 20, paddingBottom: 10 },
  balCard: {
    flex: 1, backgroundColor: C.card, borderRadius: 16, borderWidth: 1,
    borderColor: C.border, padding: 14, alignItems: 'center',
    shadowColor: C.textSoft, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  balIcon: { fontSize: 20, marginBottom: 6 },
  balNum: { fontSize: 26, fontWeight: '900' },
  balLabel: { fontSize: 11, color: C.text, fontWeight: '700', marginTop: 2 },
  balSub: { fontSize: 10, color: C.textSoft },

  newBtn: {
    marginHorizontal: 16, backgroundColor: C.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 16,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  newBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: C.textSoft,
    paddingHorizontal: 16, marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 1.4,
  },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  card: {
    flexDirection: 'row', backgroundColor: C.card, borderRadius: 16,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    shadowColor: C.textSoft, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  cardTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  cardIcon: { fontSize: 20 },
  leaveType: { fontSize: 14, fontWeight: '700', color: C.text },
  leaveDates: { fontSize: 12, color: C.textSoft, marginTop: 2 },
  leaveReason: { fontSize: 12, color: C.textSoft, fontStyle: 'italic' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { color: C.textSoft, fontSize: 13 },

  overlay: { flex: 1, backgroundColor: '#00000055', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 36, borderTopWidth: 1, borderColor: C.border,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 22 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 4, letterSpacing: -0.3 },
  sheetSub: { fontSize: 13, color: C.textSoft, marginBottom: 24 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: C.textSoft, marginBottom: 8, letterSpacing: 0.8, textTransform: 'uppercase' },
  typeRow: { flexDirection: 'row', gap: 8, height: 38 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, justifyContent: 'center' },
  typeChipActive: { backgroundColor: C.primaryFaint, borderColor: C.primary },
  typeChipText: { fontSize: 12, color: C.textSoft, fontWeight: '500' },
  typeChipTextActive: { color: C.primary, fontWeight: '700' },
  input: {
    backgroundColor: C.bg, borderRadius: 12, borderWidth: 1.5, borderColor: C.border,
    padding: 12, color: C.text, fontSize: 14, marginBottom: 14,
  },
  textArea: {
    backgroundColor: C.bg, borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    padding: 14, color: C.text, fontSize: 14, height: 80, marginBottom: 24,
  },
  sheetActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border },
  cancelText: { color: C.textMid, fontWeight: '600', fontSize: 14 },
  submitBtn: {
    flex: 1, padding: 14, borderRadius: 14, alignItems: 'center',
    backgroundColor: C.primary, shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
