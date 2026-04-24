import React, { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native'
import { CalendarStar } from 'phosphor-react-native'
import { colors, fontSize, radius, spacing } from '../../constants/theme'
import { useDailyChallengeStatus, useStartDailyChallenge } from '../../hooks/useDailyChallenge'
import { GradientCard } from '../ui/GradientCard'

/**
 * Returns the UTC timestamp (ms) of the next midnight in America/New_York.
 * Uses Intl.DateTimeFormat.formatToParts to derive the Eastern offset at that
 * moment — handles EST (UTC-5) and EDT (UTC-4) automatically.
 */
function getNextEasternMidnightMs(): number {
  const now = new Date()
  // Today's date string in Eastern time
  const easternToday = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const [y, m, d] = easternToday.split('-').map(Number)

  // UTC midnight of the next Eastern calendar day (used as a reference point)
  const approx = new Date(Date.UTC(y, m - 1, d + 1))

  // Derive the ET offset at that UTC instant via formatToParts.
  // offset = UTC_timestamp − (ET parts interpreted as UTC)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false,
  }).formatToParts(approx)
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0', 10)
  let h = get('hour')
  if (h === 24) h = 0
  const tzAsUTC = Date.UTC(get('year'), get('month') - 1, get('day'), h, get('minute'), get('second'))
  const offsetMs = approx.getTime() - tzAsUTC

  // UTC time of ET midnight on the next Eastern day:
  // when ET clock shows 00:00:00 → UTC = Date.UTC(next Eastern day) + offsetMs
  return Date.UTC(y, m - 1, d + 1) + offsetMs
}

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    function tick() {
      const diff = getNextEasternMidnightMs() - Date.now()
      if (diff <= 0) { setTimeLeft('00:00:00'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return timeLeft
}

export function DailyChallengeCard() {
  const { data: status, isLoading } = useDailyChallengeStatus()
  const startChallenge = useStartDailyChallenge()
  const pulseAnim = useRef(new Animated.Value(1)).current
  const timeLeft = useCountdown()

  // Pulse the play button when challenge is available
  useEffect(() => {
    if (!status || status.alreadyCompleted) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [status?.alreadyCompleted])

  if (isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.primary} size="small" />
      </View>
    )
  }

  const completed = status?.alreadyCompleted ?? false
  const streak = status?.streak ?? 0

  return (
    <GradientCard
      accentColor={completed ? colors.correct : colors.primary}
      style={completed ? styles.cardCompleted : styles.card}
      contentStyle={styles.cardContent}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconBox}>
              <CalendarStar weight="duotone" size={22} color={colors.primary} />
            </View>
          <View>
            <Text style={styles.title}>Daily Challenge</Text>
            <Text style={styles.subtitle}>Same 10 questions for everyone</Text>
          </View>
        </View>
        {streak > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakFire}>🔥</Text>
            <Text style={styles.streakCount}>{streak}</Text>
          </View>
        )}
      </View>

      {completed ? (
        // Completed state
        <View style={styles.completedBody}>
          <View style={styles.completedRow}>
            <Text style={styles.checkmark}>✓</Text>
            <View>
              <Text style={styles.completedText}>Completed!</Text>
              {status?.correctCount !== undefined && (
                <Text style={styles.completedXp}>
                  {status.correctCount}/10 correct · {(status.xpEarned ?? 0).toLocaleString()} XP
                </Text>
              )}
            </View>
          </View>
          <View style={styles.nextRow}>
            <Text style={styles.nextLabel}>Next challenge in</Text>
            <Text style={styles.countdown}>{timeLeft}</Text>
          </View>
        </View>
      ) : (
        // Available state
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => startChallenge.mutate()}
            disabled={startChallenge.isPending}
            activeOpacity={0.85}
          >
            {startChallenge.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.playText}>Play Today's Challenge</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
    </GradientCard>
  )
}

const styles = StyleSheet.create({
  card: {
    borderColor: `${colors.primary}55`,
  },
  cardCompleted: {
    borderColor: `${colors.correct}55`,
  },
  cardContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: `${colors.primary}22`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${colors.primary}44`,
  },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.streakActive}22`,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 2,
    borderWidth: 1,
    borderColor: `${colors.streakActive}44`,
  },
  streakFire: { fontSize: 14 },
  streakCount: { fontSize: fontSize.md, fontWeight: '800', color: colors.streakActive },
  playButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  playText: { fontSize: fontSize.md, fontWeight: '700', color: '#fff' },
  completedBody: { gap: spacing.sm },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkmark: {
    fontSize: 22,
    color: colors.correct,
    fontWeight: '800',
    width: 32,
    textAlign: 'center',
  },
  completedText: { fontSize: fontSize.md, fontWeight: '700', color: colors.correct },
  completedXp: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  nextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: `${colors.border}88`,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  nextLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  countdown: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary, fontVariant: ['tabular-nums'] },
})
