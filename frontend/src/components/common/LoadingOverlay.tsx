import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  backgroundColor?: string;
  overlayColor?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Loading...',
  size = 'large',
  color = '#007AFF',
  backgroundColor = 'rgba(0, 0, 0, 0.5)',
  overlayColor = 'rgba(255, 255, 255, 0.9)',
}) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={[styles.overlay, { backgroundColor }]}>
        <View style={[styles.container, { backgroundColor: overlayColor }]}>
          <ActivityIndicator
            size={size}
            color={color}
            style={styles.indicator}
          />
          {message && (
            <Text style={[styles.message, { color }]}>
              {message}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 120,
    minHeight: 80,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  indicator: {
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 200,
  },
});

export default LoadingOverlay;