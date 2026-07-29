import React, { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'

/** Keeps old deep links and result bookmarks working after the world-map launch. */
export default function LegacyCategoryQuestRedirect() {
  useEffect(() => {
    router.replace('/quest')
  }, [])

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#FFD66B" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B2447',
  },
})
