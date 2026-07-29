import React, { useRef, useState } from 'react'
import {
  View, Text, TextInput, StyleSheet,
  FlatList, Animated, KeyboardAvoidingView, Platform,
  ActivityIndicator, useWindowDimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { haptics } from '../src/lib/haptics'
import { colors, spacing, fontSize, radius } from '../src/constants/theme'
import { AnimatedPressable } from '../src/components/ui/AnimatedPressable'
import { profileApi } from '../src/api/profile'
import { storage } from '../src/utils/storage'
import { useAuthStore } from '../src/store/authStore'
import { GameIcon, type GameIconName } from '../src/components/icons'

// ─── Slide definitions ────────────────────────────────────────────────────────

const SLIDES = [
  {
    key: 'welcome',
    icon: 'brain' as GameIconName,
    accentColor: '#6c63ff',
    gradientColors: ['#1a1040', '#0f0f1a'] as const,
    title: 'Welcome to\nTrivia Quest',
    body: 'Test your knowledge across dozens of categories. Compete globally, conquer daily challenges, and see how far your brain takes you.',
    extras: null,
  },
  {
    key: 'xp',
    icon: 'xp' as GameIconName,
    accentColor: '#FFD700',
    gradientColors: ['#1a1500', '#0f0f1a'] as const,
    title: 'Earn XP.\nLevel Up.',
    body: 'Every correct answer earns XP. Harder questions and fast answers earn bonus XP. Climb from Novice all the way to Immortal.',
    extras: [
      { icon: 'seedling' as GameIconName, label: 'Novice',     color: '#4CAF50' },
      { icon: 'star' as GameIconName, label: 'Scholar',    color: '#FFC107' },
      { icon: 'flame' as GameIconName, label: 'Master',     color: '#FF5722' },
      { icon: 'xp' as GameIconName, label: 'Champion',   color: '#9C27B0' },
      { icon: 'crown' as GameIconName, label: 'Immortal',   color: '#B71C1C' },
    ],
  },
  {
    key: 'quest',
    icon: 'target' as GameIconName,
    accentColor: '#4CAF50',
    gradientColors: ['#0a1a0a', '#0f0f1a'] as const,
    title: 'Conquer the\nQuest Map',
    body: 'Journey through 6 category zones. Master each one to unlock the next, building up to the ultimate Trivia Gauntlet.',
    extras: [
      { icon: 'brain' as GameIconName, label: 'General',       color: '#7B68EE' },
      { icon: 'trophy' as GameIconName, label: 'History',        color: '#FF9800' },
      { icon: 'idea' as GameIconName, label: 'Science',        color: '#2196F3' },
      { icon: 'trophy' as GameIconName, label: 'Sports',         color: '#4CAF50' },
      { icon: 'games' as GameIconName, label: 'Entertainment',  color: '#9C27B0' },
      { icon: 'star' as GameIconName, label: 'Special',        color: '#FFD700' },
    ],
  },
] as const

type SlideKey = typeof SLIDES[number]['key'] | 'name'
const TOTAL = SLIDES.length + 1 // slides + name entry

// ─── Info slide ───────────────────────────────────────────────────────────────

function InfoSlide({ slide, width }: { slide: typeof SLIDES[number]; width: number }) {
  return (
    <View style={[styles.slide, { width }]}>
      <LinearGradient
        colors={slide.gradientColors}
        style={StyleSheet.absoluteFill}
      />

      {/* Emoji glow */}
      <View style={styles.markWrap}>
        <View style={[styles.markGlow, { backgroundColor: `${slide.accentColor}22` }]} />
        <GameIcon name={slide.icon} size={72} color={slide.accentColor} />
      </View>

      {/* Text */}
      <Text style={styles.title}>{slide.title}</Text>
      <Text style={styles.body}>{slide.body}</Text>

      {/* Extras: level pills or zone pills */}
      {slide.extras && (
        <View style={styles.pills}>
          {slide.extras.map((item) => (
            <View key={item.label} style={[styles.pill, { borderColor: `${item.color}66`, backgroundColor: `${item.color}18` }]}>
              <GameIcon name={item.icon} size={14} color={item.color} />
              <Text style={[styles.pillLabel, { color: item.color }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

// ─── Name slide ───────────────────────────────────────────────────────────────

const NAME_RE = /^[a-zA-Z0-9_. -]+$/
const MIN = 2, MAX = 20

function NameSlide({ width, onDone }: { width: number; onDone: () => void }) {
  const setDisplayName = useAuthStore((s) => s.setDisplayName)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function validate(v: string) {
    const t = v.trim()
    if (t.length < MIN) return `At least ${MIN} characters`
    if (t.length > MAX) return `Max ${MAX} characters`
    if (!NAME_RE.test(t)) return 'Letters, numbers, _ . - only'
    return ''
  }

  async function handleSubmit() {
    const trimmed = name.trim()
    const err = validate(trimmed)
    if (err) { setError(err); return }
    setLoading(true)
    setError('')
    try {
      await profileApi.setDisplayName(trimmed)
      setDisplayName(trimmed)
      await storage.setOnboardingDone()
      haptics.reward()
      onDone()
    } catch {
      setError('Could not save your name. Try again.')
      setLoading(false)
    }
  }

  const charCount = name.trim().length
  const isValid = charCount >= MIN && charCount <= MAX && NAME_RE.test(name.trim())

  return (
    <KeyboardAvoidingView
      style={[styles.slide, { width }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={['#110d2e', '#0f0f1a']} style={StyleSheet.absoluteFill} />

      <GameIcon name="games" size={64} />
      <Text style={styles.title}>{'What\'s your\nplayer name?'}</Text>
      <Text style={styles.body}>
        This is how you'll appear on leaderboards. You can change it later in your profile.
      </Text>

      <View style={styles.inputBlock}>
        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          placeholder="e.g. QuizWizard99"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={(t) => { setName(t); if (error) setError('') }}
          maxLength={MAX}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
        <Text style={[styles.charCount, charCount > MAX && { color: colors.incorrect }]}>
          {charCount}/{MAX}
        </Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <AnimatedPressable
        style={[styles.ctaButton, { backgroundColor: colors.primary }, (!isValid || loading) && styles.buttonDisabled]}
        onPress={handleSubmit}
        activeOpacity={0.85}
        disabled={!isValid || loading}
      >
        {loading
          ? <ActivityIndicator color={colors.textOnAccent} size="small" />
          : <Text style={styles.ctaText}>Let's Play →</Text>
        }
      </AnimatedPressable>
    </KeyboardAvoidingView>
  )
}

// ─── Dot indicator ────────────────────────────────────────────────────────────

function Dots({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }, (_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            i === current
              ? { width: 20, backgroundColor: colors.primary }
              : { width: 6, backgroundColor: colors.border },
          ]}
        />
      ))}
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { width } = useWindowDimensions()
  const flatRef = useRef<FlatList>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const isLastInfoSlide = currentIndex === SLIDES.length - 1
  const isNameSlide = currentIndex === SLIDES.length

  function goNext() {
    if (isNameSlide) return
    haptics.selection()
    const next = currentIndex + 1
    flatRef.current?.scrollToIndex({ index: next, animated: true })
    setCurrentIndex(next)
  }

  function onDone() {
    router.replace('/(tabs)/home')
  }

  const data = [...SLIDES.map(s => s.key), 'name'] as SlideKey[]

  return (
    <View style={styles.root}>
      <FlatList
        ref={flatRef}
        data={data}
        keyExtractor={(item) => item}
        horizontal
        pagingEnabled
        scrollEnabled={!isNameSlide} // lock scroll on name slide so keyboard doesn't fight it
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width)
          setCurrentIndex(idx)
        }}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        renderItem={({ item }) => {
          if (item === 'name') {
            return <NameSlide width={width} onDone={onDone} />
          }
          const slide = SLIDES.find(s => s.key === item)!
          return <InfoSlide slide={slide} width={width} />
        }}
      />

      {/* Bottom nav — hidden on name slide (it has its own CTA) */}
      {!isNameSlide && (
        <View style={styles.bottomNav}>
          <Dots current={currentIndex} total={TOTAL} />

          <View style={styles.navRow}>
            <AnimatedPressable
              onPress={() => {
                flatRef.current?.scrollToIndex({ index: SLIDES.length, animated: true })
                setCurrentIndex(SLIDES.length)
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.skipText}>Skip</Text>
            </AnimatedPressable>

            <AnimatedPressable style={[styles.nextButton, { backgroundColor: colors.primary }]} onPress={goNext} activeOpacity={0.85}>
              <Text style={styles.nextText}>{isLastInfoSlide ? 'Get Started' : 'Next'}</Text>
            </AnimatedPressable>
          </View>
        </View>
      )}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 140, // room for bottom nav
    gap: spacing.lg,
  },

  markWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  markGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },

  title: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 44,
  },
  body: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },

  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pillLabel: { fontSize: fontSize.sm, fontWeight: '700' },

  // Name slide
  inputBlock: { width: '100%', gap: spacing.xs },
  input: {
    width: '100%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },
  inputError: { borderColor: colors.incorrect },
  charCount: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'right' },
  errorText: { fontSize: fontSize.sm, color: colors.incorrect, textAlign: 'center', fontWeight: '600' },
  ctaButton: {
    width: '100%',
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: { opacity: 0.4 },
  ctaText: { fontSize: fontSize.lg, fontWeight: '800', color: '#fff' },

  // Bottom nav
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  nextButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  nextText: { fontSize: fontSize.md, fontWeight: '800', color: '#fff' },
})
