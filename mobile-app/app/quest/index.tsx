import React from 'react'
import { useLocalSearchParams } from 'expo-router'
import { QuestMapScreen } from '../../src/components/quest/QuestMapScreen'

export default function QuestHubScreen() {
  const { completed, focus } = useLocalSearchParams<{ completed?: string; focus?: string }>()
  return <QuestMapScreen completedNodeId={completed} focusNodeId={focus} />
}
