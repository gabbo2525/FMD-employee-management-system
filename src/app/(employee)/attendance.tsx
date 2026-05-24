import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { C, STATUS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

type AttendanceRecord = {
  id: string;
  date: string;
  time_in: string | null;
  time_out: string | null;
};

type AttendanceLog = {
  date: string;
  dayOfWeek: string;
  timeIn: string;
  timeOut: string;
  status: string;
};

function deriveStatus(timeIn: string | null, timeOut: string | null): string {
  if (!timeIn) return 'Absent';
  const hour = new Date(timeIn).getHours();
  const minute = new Date(timeIn).getMinutes();
  // Late if after 08:15
  if (hour > 8 || (hour === 8 && minute > 15)) return 'Late';
  return 'Present';
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
}

export default function AttendanceScreen() {
  const { user } = useAuth();
  const [now, setNow] = useState(new Date());
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Live clock — updates every second
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeNow = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  const TODAY_DISPLAY = now.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const TODAY_DATE = now.toISOString().split('T')[0]; // YYYY-MM-DD

  const fetchAttendance = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Fetch today's record
      const { data: todayData } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', TODAY_DATE)
        .maybeSingle();

      setTodayRecord(todayData);

      // Fetch last 10 records
      const { data: history } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(10);

      if (history) {
        const mapped: AttendanceLog[] = history.map(r => {
          const d = new Date(r.date + 'T00:00:00');
          return {
            date: d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
            dayOfWeek: d.toLocaleDateString('en-PH', { weekday: 'long' }),
            timeIn: formatTime(r.time_in),
            timeOut: formatTime(r.time_out),
            status: deriveStatus(r.time_in, r.time_out),
          };
        });
        setLogs(mapped);
      }
    } catch (e) {
      console.error('Failed to fetch attendance:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, TODAY_DATE]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleClockIn = async () => {
    if (!user?.id || actionLoading) return;
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      if (todayRecord) {
        // Update existing
        const { data } = await supabase
          .from('attendance')
          .update({ time_in: now })
          .eq('id', todayRecord.id)
          .select()
          .single();
        setTodayRecord(data);
      } else {
        // Insert new
        const { data } = await supabase
          .from('attendance')
          .insert({ user_id: user.id, date: TODAY_DATE, time_in: now })
          .select()
          .single();
        setTodayRecord(data);
      }
      await fetchAttendance();
    } catch (e) {
      console.error('Clock in failed:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!todayRecord || actionLoading) return;
    setActionLoading(true);
    try {
      const { data } = await supabase
        .from('attendance')
        .update({ time_out: new Date().toISOString() })
        .eq('id', todayRecord.id)
        .select()
        .single();
      setTodayRecord(data);
      await fetchAttendance();
    } catch (e) {
      console.error('Clock out failed:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const clockedIn = !!todayRecord?.time_in;
  const clockedOut = !!todayRecord?.time_out;
  const clockInTime = todayRecord?.time_in ? formatTime(todayRecord.time_in) : null;

  // Monthly stats derived from logs
  const presentCount = logs.filter(l => l.status === 'Present').length;
  const lateCount    = logs.filter(l => l.status === 'Late').length;
  const absentCount  = logs.filter(l => l.status === 'Absent').length;
  const total        = logs.length;
  const rate         = total > 0 ? Math.round(((presentCount + lateCount) / total) * 100) : 0;

  return (
    <View style={s.container}>

      {/* Hero clock card */}
      <View style={s.hero}>
        <View style={s.heroTop}>
          <Text style={s.heroDate}>{TODAY_DISPLAY}</Text>
          {clockedIn && clockInTime && (
            <View style={s.clockedBadge}>
              <View style={s.clockedDot} />
              <Text style={s.clockedText}>In at {clockInTime}</Text>
            </View>
          )}
        </View>

        <Text style={s.heroTime}>{timeNow}</Text>

        <View style={s.heroDivider} />

        <Text style={s.heroName}>{user?.name}</Text>
        <Text style={s.heroId}>{user?.employeeId ?? 'EMS Employee'}</Text>

        <View style={s.heroActions}>
          <TouchableOpacity
            style={[s.clockBtn, s.clockInBtn, (clockedIn || actionLoading) && s.btnDimmed]}
            onPress={handleClockIn}
            disabled={clockedIn || actionLoading}
            activeOpacity={0.8}
          >
            {actionLoading && !clockedIn
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.clockBtnIcon}>▶</Text>
            }
            <Text style={s.clockBtnText}>Clock In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.clockBtn, s.clockOutBtn, (!clockedIn || clockedOut || actionLoading) && s.btnDimmed]}
            onPress={handleClockOut}
            disabled={!clockedIn || clockedOut || actionLoading}
            activeOpacity={0.8}
          >
            {actionLoading && clockedIn && !clockedOut
              ? <ActivityIndicator color={C.textMuted} size="small" />
              : <Text style={[s.clockBtnIcon, { color: (!clockedIn || clockedOut) ? C.textMuted : C.text }]}>■</Text>
            }
            <Text style={[s.clockBtnText, { color: (!clockedIn || clockedOut) ? C.textMuted : C.text }]}>Clock Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Monthly summary */}
      <View style={s.statsRow}>
        {[
          { n: String(presentCount), l: 'Present', color: C.success },
          { n: String(lateCount),    l: 'Late',    color: C.warning },
          { n: String(absentCount),  l: 'Absent',  color: C.danger  },
          { n: `${rate}%`,           l: 'Rate',    color: C.primary },
        ].map((item, i) => (
          <View key={i} style={[s.stat, { borderTopColor: item.color, borderTopWidth: 3 }]}>
            <Text style={[s.statN, { color: item.color }]}>{item.n}</Text>
            <Text style={s.statL}>{item.l}</Text>
          </View>
        ))}
      </View>

      {/* Recent logs */}
      <Text style={s.sectionLabel}>Recent Attendance</Text>
      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 24 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.logs}>
          {logs.length === 0 && (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📋</Text>
              <Text style={s.emptyText}>No attendance records yet.</Text>
            </View>
          )}
          {logs.map((log, i) => {
            const sc = STATUS[log.status as keyof typeof STATUS] ?? STATUS['Absent'];
            return (
              <View key={i} style={s.logCard}>
                <View style={[s.logBar, { backgroundColor: sc.dot }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.logDay}>{log.dayOfWeek}</Text>
                  <Text style={s.logDate}>{log.date}</Text>
                </View>
                <View style={s.logTimes}>
                  <Text style={s.logTime}>
                    <Text style={s.logTimeLabel}>In  </Text>
                    <Text style={{ color: C.primary, fontWeight: '700' }}>{log.timeIn}</Text>
                  </Text>
                  <Text style={s.logTime}>
                    <Text style={s.logTimeLabel}>Out  </Text>
                    <Text style={{ color: C.primary, fontWeight: '700' }}>{log.timeOut}</Text>
                  </Text>
                </View>
                <View style={[s.badge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                  <Text style={[s.badgeText, { color: sc.text }]}>{log.status}</Text>
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

  hero: {
    backgroundColor: C.card, margin: 16, borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: C.primaryBorder, alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1, shadowRadius: 24, elevation: 10,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12 },
  heroDate: { fontSize: 12, color: C.textSoft, letterSpacing: 0.2, flex: 1 },
  clockedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.successFaint, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: C.successBorder,
  },
  clockedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.success },
  clockedText: { fontSize: 11, color: C.success, fontWeight: '700' },
  heroTime: { fontSize: 58, fontWeight: '900', color: C.text, letterSpacing: -3, lineHeight: 62 },
  heroDivider: { width: 36, height: 2, backgroundColor: C.primaryBorder, borderRadius: 1, marginVertical: 16 },
  heroName: { fontSize: 16, fontWeight: '700', color: C.primary, marginBottom: 2 },
  heroId: { fontSize: 12, color: C.textSoft, marginBottom: 20 },
  heroActions: { flexDirection: 'row', gap: 12, width: '100%' },
  clockBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14,
  },
  clockInBtn: {
    backgroundColor: C.primary,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  clockOutBtn: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border },
  btnDimmed: { opacity: 0.35 },
  clockBtnIcon: { fontSize: 12, color: '#fff' },
  clockBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  stat: {
    flex: 1, backgroundColor: C.card, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, paddingVertical: 12, alignItems: 'center',
    shadowColor: C.textSoft, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statN: { fontSize: 20, fontWeight: '900', marginTop: 4 },
  statL: { fontSize: 10, color: C.textSoft, marginTop: 3, fontWeight: '500' },

  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: C.textSoft,
    paddingHorizontal: 16, marginTop: 18, marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 1.4,
  },
  logs: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  logCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1, borderColor: C.border, padding: 14, gap: 12,
    shadowColor: C.textSoft, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  logBar: { width: 4, height: 34, borderRadius: 2 },
  logDay: { fontSize: 13, fontWeight: '700', color: C.text },
  logDate: { fontSize: 11, color: C.textSoft, marginTop: 2 },
  logTimes: { marginRight: 8, alignItems: 'flex-end', gap: 2 },
  logTime: { fontSize: 11 },
  logTimeLabel: { color: C.textMuted },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { color: C.textSoft, fontSize: 13 },
});
