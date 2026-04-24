import React from 'react'
import { View, Text, StyleSheet, Modal } from 'react-native'
import { colors, spacing, radius, fontSize } from '../../constants/theme'
import { Button } from '../ui/Button'

interface PauseModalProps {
  visible: boolean
  xp: number
  onResume: () => void
  onQuit: () => void
}

export function PauseModal({ visible, xp, onResume, onQuit }: PauseModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Game Paused</Text>
          <Text style={styles.xpText}>Current XP: {xp.toLocaleString()}</Text>

          <View style={styles.buttons}>
            <Button title="Resume" onPress={onResume} variant="primary" style={styles.button} />
            <Button title="Quit Game" onPress={onQuit} variant="secondary" style={styles.button} />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modal: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  xpText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  buttons: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  button: {
    width: '100%',
  },
})
