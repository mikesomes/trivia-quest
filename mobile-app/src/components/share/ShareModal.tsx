import React, { useRef, useState } from 'react'
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import ViewShot from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import { ShareCard, type ShareCardData } from './ShareCard'
import { colors, spacing, fontSize, radius } from '../../constants/theme'

interface Props {
  visible: boolean
  data: ShareCardData
  onClose: () => void
}

export function ShareModal({ visible, data, onClose }: Props) {
  const shotRef = useRef<ViewShot>(null)
  const [sharing, setSharing] = useState(false)

  const handleShare = async () => {
    if (!shotRef.current) return
    setSharing(true)
    try {
      const uri = await (shotRef.current as any).capture()
      const canShare = await Sharing.isAvailableAsync()
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your Trivia Quest result',
          UTI: 'public.png',
        })
      }
    } catch (err) {
      console.error('Share failed:', err)
    } finally {
      setSharing(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Share Your Result</Text>

          {/* Card preview — also what gets captured */}
          <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }}>
            <ShareCard data={data} />
          </ViewShot>

          {/* Actions */}
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            disabled={sharing}
            activeOpacity={0.85}
          >
            {sharing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.shareButtonText}>Share Image</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  sheet: {
    alignItems: 'center',
    gap: spacing.lg,
    width: '100%',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  shareButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: 320,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  closeButton: {
    paddingVertical: spacing.sm,
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
})
