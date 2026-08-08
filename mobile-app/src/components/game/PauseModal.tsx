import React from 'react'
import { View, Text, StyleSheet, Modal, Switch } from 'react-native'
import { colors, spacing, radius, fontSize, surfaces } from '../../constants/theme'
import { Button } from '../ui/Button'
import { AppIcon } from '../ui/AppIcon'
import { tabularNums } from '../ui/Typography'
import { useSoundMuted } from '../../hooks/useSoundMuted'
import { setSoundMuted } from '../../lib/sound'

interface PauseModalProps {
  visible: boolean
  xp: number
  onResume: () => void
  onQuit: () => void
}

export function PauseModal({ visible, xp, onResume, onQuit }: PauseModalProps) {
  const muted = useSoundMuted()

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Game Paused</Text>
          <Text style={styles.xpText}>Current XP: {xp.toLocaleString()}</Text>

          <View style={styles.soundRow}>
            <View style={styles.soundLabel}>
              <AppIcon name={muted ? 'soundOff' : 'soundOn'} size="sm" />
              <Text style={styles.soundLabelText}>Sound</Text>
            </View>
            <Switch
              value={!muted}
              onValueChange={(enabled) => setSoundMuted(!enabled)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.textPrimary}
            />
          </View>

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
    backgroundColor: surfaces.surface3,
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
  xpText: { ...tabularNums,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  soundLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  soundLabelText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  buttons: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  button: {
    width: '100%',
  },
})
