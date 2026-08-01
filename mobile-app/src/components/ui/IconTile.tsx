import React from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import { radius } from '../../constants/theme'

interface IconTileProps {
  children: React.ReactNode
  color: string
  size?: number
  style?: ViewStyle
}

/** A tinted, bordered square plate behind a row/card icon — the small tile pattern used across home screen cards. */
export function IconTile({ children, color, size = 40, style }: IconTileProps) {
  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          backgroundColor: `${color}22`,
          borderColor: `${color}44`,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
})
