import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Path } from 'react-native-svg'
import {
  ArrowLeft,
  Check,
  Compass,
  Crown,
  LockSimple,
  Package,
  Sparkle,
  X,
} from 'phosphor-react-native'
import { router } from 'expo-router'
import { colors, fontSize, radius, spacing } from '../../constants/theme'
import { haptics } from '../../lib/haptics'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useProfile } from '../../hooks/useProfile'
import { useQuestMap } from '../../hooks/useQuestMap'
import { questApi } from '../../api/quest'
import { roundsApi } from '../../api/rounds'
import { useGameStore } from '../../store/gameStore'
import type { QuestMapNode } from '../../types/questMap'
import { getNextQuestFocusNode, getQuestNodePresentation } from '../../utils/questMap'
import { Button } from '../ui/Button'
import { ErrorState } from '../ui/ErrorState'
import { StarRating } from './StarRating'
import { PlayerAvatar } from '../profile/PlayerAvatar'

const MAP_ASPECT = 1672 / 941
const NODE_SIZE = 58
const MAP_BASE = require('../../../assets/quest/knowledge-isles/map-base.png')
const CLOUDS = require('../../../assets/quest/knowledge-isles/clouds-foreground.png')

function clamp(value: number, min: number, max: number) {
  'worklet'
  return Math.min(max, Math.max(min, value))
}

function NodeMarker({
  node,
  x,
  y,
  reducedMotion,
  onPress,
}: {
  node: QuestMapNode
  x: number
  y: number
  reducedMotion: boolean
  onPress: () => void
}) {
  const pulse = useSharedValue(1)
  const presentation = getQuestNodePresentation(node)
  const accent = node.visualMetadata.accent ?? presentation.difficulty.color

  useEffect(() => {
    if (!presentation.isAvailable || reducedMotion) {
      cancelAnimation(pulse)
      pulse.value = 1
      return
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 950 }),
        withTiming(1, { duration: 950 }),
      ),
      -1,
    )
    return () => cancelAnimation(pulse)
  }, [presentation.isAvailable, reducedMotion])

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }))

  const Icon = node.status === 'locked' || node.status === 'cooldown'
    ? LockSimple
    : node.status === 'completed'
      ? Check
      : node.difficulty === 'boss'
        ? Crown
        : Compass

  return (
    <View style={[styles.nodeAnchor, { left: x - NODE_SIZE / 2, top: y - NODE_SIZE / 2 }]}>
      {presentation.isAvailable && (
        <Animated.View
          pointerEvents="none"
          style={[styles.nodeHalo, { borderColor: accent, backgroundColor: `${accent}2E` }, pulseStyle]}
        />
      )}
      <Pressable
        onPress={() => {
          haptics.selection()
          onPress()
        }}
        accessibilityRole="button"
        accessibilityLabel={`${node.title}, ${presentation.difficulty.label}, ${node.status}`}
        style={({ pressed }) => [
          styles.nodeButton,
          { borderColor: accent },
          node.status === 'locked' && styles.nodeLocked,
          node.status === 'completed' && styles.nodeCompleted,
          pressed && styles.nodePressed,
        ]}
      >
        <Icon size={24} color={node.status === 'locked' ? '#8693A8' : '#FFF6D8'} weight="bold" />
      </Pressable>
      <View style={styles.nodeLabel}>
        <Text numberOfLines={1} style={styles.nodeLabelText}>
          {node.visualMetadata.mapLabel ?? node.title.toUpperCase()}
        </Text>
      </View>
    </View>
  )
}

function NodeSheet({
  node,
  loading,
  onClose,
  onPlay,
}: {
  node: QuestMapNode
  loading: boolean
  onClose: () => void
  onPlay: () => void
}) {
  const presentation = getQuestNodePresentation(node)
  const accent = node.visualMetadata.accent ?? presentation.difficulty.color
  const cooldownMinutes = node.cooldownUntil
    ? Math.max(1, Math.ceil((new Date(node.cooldownUntil).getTime() - Date.now()) / 60_000))
    : 0

  return (
    <View style={styles.sheet} accessibilityViewIsModal>
      <View style={styles.sheetHandle} />
      <View style={styles.sheetHeader}>
        <View style={styles.sheetTitleWrap}>
          <Text style={[styles.eyebrow, { color: accent }]}>{presentation.difficulty.label.toUpperCase()}</Text>
          <Text style={styles.sheetTitle}>{node.title}</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close challenge details">
          <X size={22} color={colors.textSecondary} weight="bold" />
        </Pressable>
      </View>
      <Text style={styles.sheetDescription}>{node.description}</Text>

      <View style={styles.rewardRow}>
        <View style={styles.rewardPill}>
          <Sparkle size={16} color="#FFD66B" weight="fill" />
          <Text style={styles.rewardValue}>+{node.xpReward} XP</Text>
        </View>
        <View style={styles.rewardPill}>
          <Package size={17} color={accent} weight="duotone" />
          <Text style={styles.rewardValue}>{node.rewardPreview.label}</Text>
        </View>
        {node.stars > 0 && (
          <View style={styles.rewardPill}>
            <StarRating stars={node.stars} size={13} />
          </View>
        )}
      </View>

      <Text style={styles.lootHint}>
        {node.rewardPreview.coinMin}–{node.rewardPreview.coinMax} coins or a power-up on first clear
      </Text>

      {node.status === 'locked' && (
        <Text style={styles.lockMessage}>Clear Arrival Camp to open this route.</Text>
      )}
      {node.status === 'cooldown' && (
        <Text style={styles.lockMessage}>This route recovers in about {cooldownMinutes} min.</Text>
      )}

      <Button
        title={presentation.actionLabel}
        onPress={onPlay}
        loading={loading}
        disabled={!presentation.canPlay}
        size="lg"
        style={{ backgroundColor: accent }}
      />
    </View>
  )
}

export function QuestMapScreen({
  completedNodeId,
  focusNodeId,
}: {
  completedNodeId?: string
  focusNodeId?: string
}) {
  const { width, height } = useWindowDimensions()
  const reducedMotion = useReducedMotion()
  const { data: profile } = useProfile()
  const mapQuery = useQuestMap()
  const [selectedNode, setSelectedNode] = useState<QuestMapNode | null>(null)
  const [startingNodeId, setStartingNodeId] = useState<string | null>(null)

  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const panStartX = useSharedValue(0)
  const panStartY = useSharedValue(0)
  const cloudX = useSharedValue(-7)
  const avatarX = useSharedValue(0)
  const avatarY = useSharedValue(0)
  const avatarOpacity = useSharedValue(0)
  const shimmerOpacity = useSharedValue(0.28)

  const mapWidth = Math.max(width * 1.66, 640)
  const mapHeight = mapWidth * MAP_ASPECT
  const minX = Math.min(0, width - mapWidth)
  const minY = Math.min(0, height - mapHeight)

  const nodes = useMemo(
    () => (mapQuery.data?.nodes ?? []).filter(node => node.regionId === 'knowledge_isles'),
    [mapQuery.data?.nodes],
  )
  const connections = mapQuery.data?.connections ?? []
  const completedCount = nodes.filter(node => node.status === 'completed').length

  const focusNode = (node: QuestMapNode, animated = true) => {
    const targetX = clamp(width * 0.5 - node.positionX * mapWidth, minX, 0)
    const targetY = clamp(height * 0.48 - node.positionY * mapHeight, minY, 0)
    translateX.value = animated && !reducedMotion
      ? withTiming(targetX, { duration: 720 })
      : targetX
    translateY.value = animated && !reducedMotion
      ? withTiming(targetY, { duration: 720 })
      : targetY
  }

  useEffect(() => {
    if (nodes.length === 0) return
    const explicit = focusNodeId ? nodes.find(node => node.id === focusNodeId) : undefined
    const next = explicit ?? getNextQuestFocusNode(nodes, connections, completedNodeId)
    if (next) focusNode(next, Boolean(completedNodeId))

    const completed = completedNodeId
      ? nodes.find(node => node.id === completedNodeId)
      : undefined
    const avatarTarget = next ?? nodes.find(node => node.status === 'completed') ?? nodes[0]
    if (!avatarTarget) return

    const targetX = avatarTarget.positionX * mapWidth + 30
    const targetY = avatarTarget.positionY * mapHeight - 58
    if (completed && next && !reducedMotion) {
      avatarX.value = completed.positionX * mapWidth + 30
      avatarY.value = completed.positionY * mapHeight - 58
      avatarOpacity.value = 1
      avatarX.value = withTiming(targetX, { duration: 1050 })
      avatarY.value = withTiming(targetY, { duration: 1050 })
    } else {
      avatarX.value = targetX
      avatarY.value = targetY
      avatarOpacity.value = 1
    }
  }, [nodes.length, completedNodeId, focusNodeId, width, height])

  useEffect(() => {
    if (reducedMotion) {
      cloudX.value = 0
      shimmerOpacity.value = 0.35
      return
    }
    cloudX.value = withRepeat(
      withSequence(
        withTiming(7, { duration: 8000 }),
        withTiming(-7, { duration: 8000 }),
      ),
      -1,
    )
    shimmerOpacity.value = withRepeat(
      withSequence(
        withTiming(0.78, { duration: 1300 }),
        withTiming(0.22, { duration: 1700 }),
      ),
      -1,
    )
    return () => {
      cancelAnimation(cloudX)
      cancelAnimation(shimmerOpacity)
    }
  }, [reducedMotion])

  const pan = Gesture.Pan()
    .onStart(() => {
      panStartX.value = translateX.value
      panStartY.value = translateY.value
    })
    .onUpdate(event => {
      translateX.value = clamp(panStartX.value + event.translationX, minX, 0)
      translateY.value = clamp(panStartY.value + event.translationY, minY, 0)
    })

  const mapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }))
  const cloudStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: cloudX.value }],
  }))
  const avatarStyle = useAnimatedStyle(() => ({
    opacity: avatarOpacity.value,
    transform: [
      { translateX: avatarX.value },
      { translateY: avatarY.value },
      { scale: 0.68 },
    ],
  }))
  const shimmerStyle = useAnimatedStyle(() => ({ opacity: shimmerOpacity.value }))

  const handlePlay = async (node: QuestMapNode) => {
    if (startingNodeId) return
    setStartingNodeId(node.id)
    haptics.confirm()
    try {
      const start = await questApi.startNode(node.id)
      const first = start.firstRound
      const difficulty = first.difficulty
      const isBlitz = first.gameMode === 'blitz'
      const isSurvival = first.gameMode === 'survival'
      const game = useGameStore.getState()

      game.setCategory(first.category)
      game.setDifficulty(difficulty)
      game.setIsDailyChallenge(false)
      game.setIsBlitz(isBlitz)
      game.setQuestNode(node.id, node.regionId, first.gameMode, start.runId)

      const round = await roundsApi.create({
        category: first.category,
        difficulty,
        isQuest: true,
        isBlitz,
        isSurvival,
        questNodeId: node.id,
        questRunId: start.runId ?? undefined,
      })
      const questionsData = await roundsApi.getQuestions(round.roundId)
      game.startRound(
        round.roundId,
        questionsData.questions,
        questionsData.livesRemaining,
        questionsData.streak,
        questionsData.currentPosition,
        questionsData.hammers,
        questionsData.xpEarnedInRound,
        questionsData.scoringTimerMode,
        questionsData.shields,
      )
      router.push('/game/play')
    } catch (error) {
      haptics.failure()
      Alert.alert(
        'Could not begin expedition',
        error instanceof Error ? error.message : 'Please try again.',
      )
    } finally {
      setStartingNodeId(null)
    }
  }

  if (mapQuery.isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#FFD66B" />
        <Text style={styles.loadingText}>Charting the Knowledge Isles…</Text>
      </View>
    )
  }

  if (mapQuery.isError || nodes.length === 0) {
    return (
      <View style={styles.loadingScreen}>
        <ErrorState
          message="The Knowledge Isles could not be charted."
          onRetry={() => mapQuery.refetch()}
        />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.map, { width: mapWidth, height: mapHeight }, mapStyle]}>
          <Image source={MAP_BASE} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <Svg width={mapWidth} height={mapHeight}>
              {connections.map(connection => {
                const from = nodes.find(node => node.id === connection.from)
                const to = nodes.find(node => node.id === connection.to)
                if (!from || !to) return null
                const sx = from.positionX * mapWidth
                const sy = from.positionY * mapHeight
                const tx = to.positionX * mapWidth
                const ty = to.positionY * mapHeight
                const cx = (sx + tx) / 2 + (tx - sx) * 0.08
                const cy = (sy + ty) / 2
                const active = from.status === 'completed'
                const d = `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`
                return (
                  <React.Fragment key={`${connection.from}-${connection.to}`}>
                    <Path d={d} fill="none" stroke="rgba(25,22,38,0.44)" strokeWidth={12} />
                    <Path
                      d={d}
                      fill="none"
                      stroke={active ? '#FFD66B' : 'rgba(240,236,215,0.42)'}
                      strokeWidth={active ? 5 : 3}
                      strokeDasharray={active ? undefined : '8 10'}
                      strokeLinecap="round"
                    />
                  </React.Fragment>
                )
              })}
            </Svg>
          </View>

          {nodes.map(node => (
            <NodeMarker
              key={node.id}
              node={node}
              x={node.positionX * mapWidth}
              y={node.positionY * mapHeight}
              reducedMotion={reducedMotion}
              onPress={() => {
                setSelectedNode(node)
                focusNode(node)
              }}
            />
          ))}

          <Animated.View pointerEvents="none" style={[styles.mapAvatar, avatarStyle]}>
            <PlayerAvatar level={profile?.level ?? mapQuery.data?.userLevel ?? 1} size="sm" />
          </Animated.View>

          {[
            { left: mapWidth * 0.08, top: mapHeight * 0.36 },
            { left: mapWidth * 0.87, top: mapHeight * 0.31 },
            { left: mapWidth * 0.12, top: mapHeight * 0.73 },
            { left: mapWidth * 0.91, top: mapHeight * 0.69 },
          ].map((position, index) => (
            <Animated.View
              key={`water-glint-${index}`}
              pointerEvents="none"
              style={[styles.waterGlint, position, shimmerStyle]}
            >
              <Sparkle size={index % 2 ? 13 : 17} color="#BFEFFF" weight="fill" />
            </Animated.View>
          ))}

          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, cloudStyle]}>
            <Image source={CLOUDS} resizeMode="cover" style={[StyleSheet.absoluteFillObject, styles.clouds]} />
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      <SafeAreaView pointerEvents="box-none" style={styles.safeOverlay}>
        <View style={styles.hud}>
          <Pressable
            style={styles.hudButton}
            onPress={() => router.back()}
            accessibilityLabel="Back"
          >
            <ArrowLeft size={21} color="#FFF" weight="bold" />
          </Pressable>
          <View style={styles.regionHud}>
            <Text style={styles.regionEyebrow}>QUEST MODE</Text>
            <Text style={styles.regionTitle}>Knowledge Isles</Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${nodes.length ? (completedCount / nodes.length) * 100 : 0}%` },
                ]}
              />
            </View>
          </View>
          <View style={styles.levelHud}>
            <Crown size={16} color="#FFD66B" weight="fill" />
            <Text style={styles.levelText}>{profile?.level ?? mapQuery.data?.userLevel ?? 1}</Text>
          </View>
        </View>

        <View style={styles.mapHint}>
          <Compass size={14} color="#E8EEF8" />
          <Text style={styles.mapHintText}>Drag to explore · choose your route</Text>
        </View>
      </SafeAreaView>

      {selectedNode && (
        <NodeSheet
          node={selectedNode}
          loading={startingNodeId === selectedNode.id}
          onClose={() => setSelectedNode(null)}
          onPlay={() => handlePlay(selectedNode)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden', backgroundColor: '#082B58' },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#0B2447',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: { color: '#DCE9F8', fontSize: fontSize.md, fontWeight: '700' },
  map: { position: 'absolute', left: 0, top: 0 },
  clouds: { opacity: 0.72, transform: [{ scale: 1.015 }] },
  safeOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  hud: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  hudButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(8,19,42,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  regionHud: {
    flex: 1,
    minHeight: 62,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(8,19,42,0.84)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,214,107,0.28)',
  },
  regionEyebrow: { color: '#FFD66B', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  regionTitle: { color: '#FFF', fontSize: fontSize.md, fontWeight: '900' },
  progressTrack: {
    marginTop: 6,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  progressFill: { height: 3, borderRadius: 2, backgroundColor: '#FFD66B' },
  levelHud: {
    height: 44,
    minWidth: 52,
    paddingHorizontal: spacing.sm,
    borderRadius: 22,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,19,42,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,214,107,0.35)',
  },
  levelText: { color: '#FFF', fontWeight: '900', fontSize: fontSize.sm },
  mapHint: {
    alignSelf: 'center',
    marginBottom: spacing.lg,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(8,19,42,0.72)',
  },
  mapHintText: { color: '#E8EEF8', fontSize: fontSize.xs, fontWeight: '700' },
  nodeAnchor: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapAvatar: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 64,
    height: 64,
    zIndex: 12,
  },
  waterGlint: { position: 'absolute', zIndex: 4 },
  nodeHalo: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
  },
  nodeButton: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(24,39,63,0.94)',
    shadowColor: '#000',
    shadowOpacity: 0.38,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  nodeLocked: { opacity: 0.72, backgroundColor: 'rgba(28,37,53,0.94)' },
  nodeCompleted: { backgroundColor: 'rgba(33,87,71,0.96)' },
  nodePressed: { transform: [{ scale: 0.94 }] },
  nodeLabel: {
    position: 'absolute',
    top: NODE_SIZE + 4,
    minWidth: 94,
    maxWidth: 132,
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(7,20,39,0.82)',
  },
  nodeLabelText: {
    color: '#FFF7DE',
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
    textAlign: 'center',
  },
  sheet: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    backgroundColor: 'rgba(12,22,42,0.97)',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -5 },
    elevation: 20,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  sheetTitleWrap: { flex: 1 },
  eyebrow: { fontSize: fontSize.xs, fontWeight: '900', letterSpacing: 1.2 },
  sheetTitle: { color: '#FFF', fontSize: fontSize.xl, fontWeight: '900', marginTop: 2 },
  sheetDescription: { color: '#B8C7DA', fontSize: fontSize.sm, lineHeight: 19 },
  rewardRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  rewardValue: { color: '#F7F1E5', fontSize: fontSize.xs, fontWeight: '800' },
  lootHint: { color: '#8292A8', fontSize: fontSize.xs },
  lockMessage: {
    color: '#D9B971',
    fontSize: fontSize.sm,
    fontWeight: '700',
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(217,185,113,0.10)',
  },
})
