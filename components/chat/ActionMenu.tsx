import React from 'react';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

export interface ActionMenuProps {
  visible: boolean;
  options: string[];
  onSelect: (index: number, option: string) => void;
  onClose: () => void;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({ visible, options, onSelect, onClose }) => {
  React.useEffect(() => {
    if (!visible) return;
    const cancelButtonIndex = options.indexOf('Cancel');
    const destructiveButtonIndex = options.indexOf('Delete');
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({
        options,
        cancelButtonIndex,
        destructiveButtonIndex,
      }, (buttonIndex) => {
        onSelect(buttonIndex, options[buttonIndex]);
        onClose();
      });
    } else {
      Alert.alert('Message Actions', '',
        options.map((opt, idx) => ({
          text: opt,
          onPress: () => { onSelect(idx, opt); onClose(); },
          style: opt === 'Delete' ? 'destructive' : opt === 'Cancel' ? 'cancel' : 'default',
        }))
      );
    }
  }, [visible]);
  return null;
}; 
import React from 'react';
import { Modal, TouchableOpacity, View, Text, StyleSheet } from 'react-native';

interface ActionMenuProps {
  visible: boolean;
  options: string[];
  onSelect: (index: number, option: string) => void;
  onClose: () => void;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  visible,
  options,
  onSelect,
  onClose,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} onPress={onClose}>
        <View style={styles.menu}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={option}
              style={styles.option}
              onPress={() => onSelect(index, option)}
            >
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    minWidth: 150,
  },
  option: {
    padding: 12,
    borderRadius: 4,
  },
  optionText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
