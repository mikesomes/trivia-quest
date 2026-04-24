import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { colors, fontSize, spacing } from '../../constants/theme'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = React.useState(false)
  const translateY = useRef(new Animated.Value(-40)).current

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false
      setIsOffline(offline)
      Animated.timing(translateY, {
        toValue: offline ? 0 : -40,
        duration: 250,
        useNativeDriver: true,
      }).start()
    })
    return unsubscribe
  }, [])

  if (!isOffline) return null

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }] }]}>
      <Text style={styles.text}>No internet connection</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: colors.incorrect,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
})
