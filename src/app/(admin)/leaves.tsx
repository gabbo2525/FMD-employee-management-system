import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { C, STATUS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

const LEAVE_ICONS: Record<string, string> = {
  'Sick Leave': '🤒',
  'Vacation Leave': '🏖️',
  'Emergency Leave': '🚨',
  'Maternity Leave': '👶',
  'Paternity Leave': '👨‍👧',
};

type LeaveRequest = {
  id: string;
  user_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
  reason?: string;
  created_at: string;
  users?: { full_name: string; email: string };
};

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ['#F59E0B', '#7C3AED', '#EC4899', '#10B981', '#3B82F6', '#EF4444'];

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  if (start === end) {
    return s.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return `${s.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}–${e.toLocaleDateString('en-PH', { day: 'numeric', year: 'numeric' })}`;
}

function daysBetween(start: string, end: string): number {
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1);
}

export default function LeavesScreen() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leaves')
        .select('*, users(full_name, email)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRequests(data ?? []);
    } catch (e: any) {
      console.error('Failed to fetch leaves:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    setActionLoading(id + action);
    try {
      const { error } = await supabase
        .from('leaves')
        .update({ status: action })
        .eq('id', id);
      if (error) throw error;
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));
    } catch (e: any) {
      if (Platform.OS === 'web') window.alert('Error: ' + e.message);
      else Alert.alert('Error', e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const pending  = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;
  const rejected = requests.filter(r => r.status === 'rejected').length;

  return (
    <View style={s.container}>
      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { n: pending,  l: 'Pending',  color: C.warning },
          { n: approved, l: 'Approved', color: C.success },
          { n: rejected, l: 'Rejected', color: C.danger  },
        ].map((item, i) => (
          <View key={i} style={[s.stat, { borderTopColor: item.color, borderTopWidth: 3 }]}>
            <Text style={[s.statN, { color: item.color }]}>{item.n}</Text>
            <Text style={s.statL}>{item.l}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 32 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
          {requests.length === 0 && (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📋</Text>
              <Text style={s.emptyTitle}>No leave requests</Text>
              <Text style={s.emptyText}>All employee leave requests will appear here.</Text>
            </View>
          )}
          {requests.map((req, idx) => {
            const statusKey = req.status.charAt(0).toUpperCase() + req.status.slice(1);
            const sc = STATUS[statusKey as keyof typeof STATUS] ?? STATUS['Pending'];
            const icon = LEAVE_ICONS[req.leave_type] ?? '📋';
            const name = req.users?.full_name ?? 'Unknown';
            const initials = getInitials(name);
            const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            const days = daysBetween(req.start_date, req.end_date);
            const isLoading = actionLoading?.startsWith(req.id);
            return (
              <View key={req.id} style={s.card}>
                {/* Top row */}
                <View style={s.cardTop}>
                  <View style={[s.avatar, { backgroundColor: color + '18', borderColor: color + '50' }]}>
                    <Text style={[s.avatarText, { color }]}>{initials}</Text>
                  </View>
                  <View style={s.cardInfo}>
                    <View style={s.cardInfoRow}>
                      <Text style={s.name}>{name}</Text>
                      <View style={[s.badge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                        <View style={[s.dot, { backgroundColor: sc.dot }]} />
                        <Text style={[s.badgeText, { color: sc.text }]}>{statusKey}</Text>
                      </View>
                    </View>
                    <View style={s.leaveTypeRow}>
                      <Text style={s.leaveTypeIcon}>{icon}</Text>
                      <Text style={s.leaveType}>{req.leave_type}</Text>
                    </View>
                    <Text style={s.dates}>{formatDateRange(req.start_date, req.end_date)}  ·  {days} day{days > 1 ? 's' : ''}</Text>
                    {req.reason ? (
                      <Text style={s.reason}>"{req.reason}"</Text>
                    ) : null}
                  </View>
                </View>

                {/* Actions — only for pending */}
                {req.status === 'pending' && (
                  <View style={s.actions}>
                    <TouchableOpacity
                      style={s.rejectBtn}
                      onPress={() => handleAction(req.id, 'rejected')}
                      disabled={!!isLoading}
                      activeOpacity={0.8}
                    >
                      {actionLoading === req.id + 'rejected'
                        ? <ActivityIndicator color={C.textMid} size="small" />
                        : <Text style={s.rejectTxt}>Reject</Text>
                      }
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.approveBtn}
                      onPress={() => handleAction(req.id, 'approved')}
                      disabled={!!isLoading}
                      activeOpacity={0.8}
                    >
                      {actionLoading === req.id + 'approved'
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={s.approveTxt}>Approve</Text>
                      }
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  statsRow: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 8 },
  stat: {
    flex: 1, backgroundColor: C.card, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, padding: 14, alignItems: 'center',
    shadowColor: C.textSoft, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statN: { fontSize: 28, fontWeight: '900', marginTop: 4 },
  statL: { fontSize: 11, color: C.textSoft, marginTop: 4, fontWeight: '500' },

  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 12, paddingTop: 8 },
  card: {
    backgroundColor: C.card, borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.textSoft, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800' },
  cardInfo: { flex: 1 },
  cardInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  name: { fontSize: 15, fontWeight: '700', color: C.text },
  leaveTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  leaveTypeIcon: { fontSize: 13 },
  leaveType: { fontSize: 13, color: C.textMid, fontWeight: '600' },
  dates: { fontSize: 12, color: C.textSoft },
  reason: { fontSize: 12, color: C.textSoft, fontStyle: 'italic', marginTop: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  actions: { flexDirection: 'row', gap: 10, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.borderLight },
  approveBtn: {
    flex: 1, backgroundColor: C.success, borderRadius: 12, paddingVertical: 12,
    alignItems: 'center',
    shadowColor: C.success, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  approveTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rejectBtn: {
    flex: 1, backgroundColor: C.bg, borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', borderWidth: 1.5, borderColor: C.border,
  },
  rejectTxt: { color: C.textMid, fontWeight: '600', fontSize: 14 },

  empty: { alignItems: 'center', paddingTop: 64 },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 4 },
  emptyText: { color: C.textSoft, fontSize: 13 },
});
