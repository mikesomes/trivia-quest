import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface Props {
  stars: number
  maxStars?: number
  size?: number
}

export function StarRating({ stars, maxStars = 3, size = 14 }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: maxStars }, (_, i) => (
        <Text key={i} style={{ fontSize: size, opacity: i < stars ? 1 : 0.2 }}>⭐</Text>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 1 },
})
