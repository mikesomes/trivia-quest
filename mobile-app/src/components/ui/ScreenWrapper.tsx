import React from 'react'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'

interface Props {
  children: React.ReactNode
}

export function ScreenWrapper({ children }: Props) {
  return (
    <LinearGradient colors={['#0f0f1a', '#16103a']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
})
