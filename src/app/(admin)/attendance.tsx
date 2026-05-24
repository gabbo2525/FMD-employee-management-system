import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { C, STATUS, AVATAR_COLORS, getInitials } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

const TODAY_DATE = new Date().toISOString().split('T')[0];
const TODAY = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
});

const FILTERS = ['All', 'Present', 'Late', 'Absent'];

type AttendanceRow = {
  id: string;
  user_id: string;
  date: string;
  time_in: string | null;
  time_out: string | null;
  users?: { full_name: string; email: string; department?: string };
};

type DisplayRecord = {
  id: string;
  name: string;
  dept: string;
  timeIn: string;
  timeOut: string;
  status: string;
};

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
}

function deriveStatus(timeIn: string | null): string {
  if (!timeIn) return 'Absent';
  const h = new Date(timeIn).getHours();
  const m = new Date(timeIn).getMinutes();
  if (h > 8 || (h === 8 && m > 15)) return 'Late';
  return 'Present';
}

export default function AdminAttendanceScreen() {
  const [filter, setFilter] = useState('All');
  const [records, setRecords] = useState<DisplayRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      // Get all users first
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, email, department')
        .eq('role', 'employee');

      // Get today's attendance
      const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', TODAY_DATE);

      const attendanceMap = new Map<string, AttendanceRow>();
      (attendance ?? []).forEach(a => attendanceMap.set(a.user_id, a));

      const display: DisplayRecord[] = (users ?? []).map(u => {
        const att = attendanceMap.get(u.id);
        const status = deriveStatus(att?.time_in ?? null);
        return {
          id: u.id,
          name: u.full_name,
          dept: u.department ?? u.email,
          timeIn: formatTime(att?.time_in ?? null),
          timeOut: formatTime(att?.time_out ?? null),
          status,
        };
      });

      setRecords(display);
    } catch (e) {
      console.error('Failed to fetch admin attendance:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  const filtered = records.filter(e => filter === 'All' || e.status === filter);

  const counts = {
    present: records.filter(e => e.status === 'Present').length,
    late:    records.filter(e => e.status === 'Late').length,
    absent:  records.filter(e => e.status === 'Absent').length,
  };

  return (
    <View style={s.container}>

      {/* Date banner */}
      <View style={s.dateBanner}>
        <View style={s.dateBannerLeft}>
          <Text style={s.dateBannerLabel}>Today's Attendance</Text>
          <Text style={s.dateBannerValue}>{TODAY}</Text>
        </View>
        <View style={s.dateBannerBadge}>
          <View style={s.dateBannerDot} />
          <Text style={s.dateBannerBadgeText}>Live</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { n: counts.present, l: 'Present',  color: C.success },
          { n: counts.late,    l: 'Late',      color: C.warning },
          { n: counts.absent,  l: 'Absent',    color: C.danger  },
          { n: records.length, l: 'Total',     color: C.primary },
        ].map((item, i) => (
          <View key={i} style={[s.stat, { borderTopColor: item.color, borderTopWidth: 3 }]}>
            <Text style={[s.statN, { color: item.color }]}>{item.n}</Text>
            <Text style={s.statL}>{item.l}</Text>
          </View>
        ))}
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterBar}
        contentContainerStyle={s.filterContent}
      >
        {FILTERS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.chip, filter === tab && s.chipActive]}
            onPress={() => setFilter(tab)}
            activeOpacity={0.7}
          >
            <Text style={[s.chipText, filter === tab && s.chipTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Employee list */}
      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 32 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
          {filtered.length === 0 && (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🔍</Text>
              <Text style={s.emptyTitle}>No results</Text>
              <Text style={s.emptyText}>No employees match this filter.</Text>
            </View>
          )}
          {filtered.map((emp, idx) => {
            const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            const st = STATUS[emp.status as keyof typeof STATUS] ?? STATUS['Absent'];
            return (
              <View key={emp.id} style={s.card}>
                <View style={[s.avatar, { backgroundColor: color + '18', borderColor: color + '50' }]}>
                  <Text style={[s.avatarText, { color }]}>{getInitials(emp.name)}</Text>
                </View>
                <View style={s.empInfo}>
                  <Text style={s.empName}>{emp.name}</Text>
                  <Text style={s.empMeta}>{emp.dept}</Text>
                  <View style={s.timeRow}>
                    <Text style={s.timeChip}>
                      <Text style={s.timeChipLabel}>In  </Text>
                      <Text style={[s.timeChipVal, emp.timeIn === '—' && s.timeDash]}>{emp.timeIn}</Text>
                    </Text>
                    <Text style={s.timeSep}>·</Text>
                    <Text style={s.timeChip}>
                      <Text style={s.timeChipLabel}>Out  </Text>
                      <Text style={[s.timeChipVal, emp.timeOut === '—' && s.timeDash]}>{emp.timeOut}</Text>
                    </Text>
                  </View>
                </View>
                <View style={[s.badge, { backgroundColor: st.bg, borderColor: st.border }]}>
                  <View style={[s.badgeDot, { backgroundColor: st.dot }]} />
                  <Text style={[s.badgeText, { color: st.text }]}>{emp.status}</Text>
                </View>
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

  dateBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 16, marginBottom: 4,
    backgroundColor: C.primary, borderRadius: 18, padding: 18,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 14, elevation: 8,
  },
  dateBannerLeft: { flex: 1 },
  dateBannerLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  dateBannerValue: { fontSize: 14, fontWeight: '700', color: '#fff' },
  dateBannerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  dateBannerDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  dateBannerBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  stat: {
    flex: 1, backgroundColor: C.card, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, padding: 12, alignItems: 'center',
    shadowColor: C.textSoft, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statN: { fontSize: 22, fontWeight: '900', marginTop: 4 },
  statL: { fontSize: 10, color: C.textSoft, marginTop: 3, fontWeight: '600', textAlign: 'center' },

  filterBar: { marginTop: 14 },
  filterContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
  },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 13, color: C.textSoft, fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border, gap: 12,
    shadowColor: C.textSoft, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800' },
  empInfo: { flex: 1 },
  empName: { fontSize: 14, fontWeight: '700', color: C.text },
  empMeta: { fontSize: 11, color: C.textSoft, marginTop: 1 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  timeChip: { fontSize: 11 },
  timeChipLabel: { color: C.textMuted, fontWeight: '500' },
  timeChipVal: { color: C.textMid, fontWeight: '700' },
  timeDash: { color: C.border },
  timeSep: { color: C.border, fontSize: 12 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 64 },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 4 },
  emptyText: { color: C.textSoft, fontSize: 13 },
});
