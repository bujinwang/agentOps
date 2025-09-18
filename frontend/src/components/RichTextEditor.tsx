import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

interface RichTextEditorProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  showToolbar?: boolean;
}

interface TextFormat {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  color: string;
  backgroundColor: string;
  fontSize: number;
  alignment: 'left' | 'center' | 'right' | 'justify';
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChangeText,
  placeholder = 'Start typing...',
  maxLength,
  showToolbar = true,
}) => {
  const [formats, setFormats] = useState<TextFormat>({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    color: '#000000',
    backgroundColor: 'transparent',
    fontSize: 16,
    alignment: 'left',
  });

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const textInputRef = useRef<TextInput>(null);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000',
    '#808080', '#FFC0CB', '#A52A2A', '#000080', '#008080'
  ];

  const fontSizes = [12, 14, 16, 18, 20, 24, 28, 32];

  const applyFormat = (formatType: keyof TextFormat, value?: any) => {
    const newFormats = { ...formats };

    if (typeof value !== 'undefined') {
      (newFormats as any)[formatType] = value;
    } else if (typeof formats[formatType] === 'boolean') {
      (newFormats as any)[formatType] = !formats[formatType];
    }

    setFormats(newFormats);
  };

  const insertText = (text: string) => {
    const beforeText = value.substring(0, selection.start);
    const afterText = value.substring(selection.end);
    const newText = beforeText + text + afterText;

    onChangeText(newText);

    // Update selection to after inserted text
    setTimeout(() => {
      setSelection({
        start: selection.start + text.length,
        end: selection.start + text.length,
      });
    }, 100);
  };

  const insertLink = () => {
    Alert.prompt(
      'Insert Link',
      'Enter the URL:',
      (url) => {
        if (url) {
          const linkText = `[Link Text](${url})`;
          insertText(linkText);
        }
      }
    );
  };

  const insertList = (type: 'bullet' | 'numbered') => {
    const listItem = type === 'bullet' ? '• ' : '1. ';
    insertText(listItem);
  };

  const insertHeading = (level: number) => {
    const heading = '#'.repeat(level) + ' ';
    insertText(heading);
  };

  const insertTable = () => {
    const table = `| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |`;

    insertText(table);
  };

  const insertVariable = () => {
    const variables = [
      '{{leadName}}',
      '{{leadEmail}}',
      '{{leadPhone}}',
      '{{propertyAddress}}',
      '{{propertyPrice}}',
      '{{agentName}}',
      '{{currentDate}}',
    ];

    Alert.alert(
      'Insert Variable',
      'Choose a variable to insert:',
      variables.map(variable => ({
        text: variable,
        onPress: () => insertText(variable),
      })).concat([{ text: 'Cancel', onPress: () => {} }])
    );
  };

  const renderToolbar = () => {
    if (!showToolbar) return null;

    return (
      <View style={styles.toolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {/* Text Formatting */}
          <TouchableOpacity
            style={[styles.toolbarButton, formats.bold && styles.toolbarButtonActive]}
            onPress={() => applyFormat('bold')}
          >
            <MaterialIcons name="format-bold" size={20} color={formats.bold ? '#007bff' : '#666'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolbarButton, formats.italic && styles.toolbarButtonActive]}
            onPress={() => applyFormat('italic')}
          >
            <MaterialIcons name="format-italic" size={20} color={formats.italic ? '#007bff' : '#666'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolbarButton, formats.underline && styles.toolbarButtonActive]}
            onPress={() => applyFormat('underline')}
          >
            <MaterialIcons name="format-underline" size={20} color={formats.underline ? '#007bff' : '#666'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolbarButton, formats.strikethrough && styles.toolbarButtonActive]}
            onPress={() => applyFormat('strikethrough')}
          >
            <MaterialIcons name="strikethrough-s" size={20} color={formats.strikethrough ? '#007bff' : '#666'} />
          </TouchableOpacity>

          {/* Lists */}
          <View style={styles.separator} />
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => insertList('bullet')}
          >
            <MaterialIcons name="format-list-bulleted" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => insertList('numbered')}
          >
            <MaterialIcons name="format-list-numbered" size={20} color="#666" />
          </TouchableOpacity>

          {/* Headings */}
          <View style={styles.separator} />
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => insertHeading(1)}
          >
            <MaterialIcons name="format-size" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => insertHeading(2)}
          >
            <Text style={styles.headingButton}>H2</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => insertHeading(3)}
          >
            <Text style={styles.headingButton}>H3</Text>
          </TouchableOpacity>

          {/* Links and Media */}
          <View style={styles.separator} />
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={insertLink}
          >
            <MaterialIcons name="link" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={insertTable}
          >
            <MaterialCommunityIcons name="table" size={20} color="#666" />
          </TouchableOpacity>

          {/* Variables */}
          <View style={styles.separator} />
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={insertVariable}
          >
            <MaterialIcons name="code" size={20} color="#666" />
          </TouchableOpacity>

          {/* Color Picker */}
          <View style={styles.separator} />
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => setShowColorPicker(!showColorPicker)}
          >
            <View style={[styles.colorIndicator, { backgroundColor: formats.color }]} />
          </TouchableOpacity>

          {/* Font Size */}
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => setShowFontSizePicker(!showFontSizePicker)}
          >
            <Text style={styles.fontSizeText}>{formats.fontSize}</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Color Picker */}
        {showColorPicker && (
          <View style={styles.colorPicker}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {colors.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorOption, { backgroundColor: color }]}
                  onPress={() => {
                    applyFormat('color', color);
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Font Size Picker */}
        {showFontSizePicker && (
          <View style={styles.fontSizePicker}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {fontSizes.map(size => (
                <TouchableOpacity
                  key={size}
                  style={[styles.fontSizeOption, formats.fontSize === size && styles.fontSizeOptionActive]}
                  onPress={() => {
                    applyFormat('fontSize', size);
                    setShowFontSizePicker(false);
                  }}
                >
                  <Text style={[styles.fontSizeOptionText, { fontSize: size }]}>
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  const renderCharacterCount = () => {
    if (!maxLength) return null;

    const remaining = maxLength - value.length;
    const isNearLimit = remaining < 50;
    const isOverLimit = remaining < 0;

    return (
      <View style={styles.charCountContainer}>
        <Text style={[
          styles.charCount,
          isNearLimit && styles.charCountWarning,
          isOverLimit && styles.charCountError,
        ]}>
          {remaining} characters remaining
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {renderToolbar()}

      <View style={styles.editorContainer}>
        <TextInput
          ref={textInputRef}
          style={[
            styles.textInput,
            {
              fontSize: formats.fontSize,
              color: formats.color,
              textAlign: formats.alignment,
              fontWeight: formats.bold ? 'bold' : 'normal',
              fontStyle: formats.italic ? 'italic' : 'normal',
              textDecorationLine: formats.underline
                ? 'underline'
                : formats.strikethrough
                  ? 'line-through'
                  : 'none',
              backgroundColor: formats.backgroundColor,
            },
          ]}
          multiline
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
          selection={selection}
          textAlignVertical="top"
          maxLength={maxLength}
          autoCapitalize="sentences"
          autoCorrect
          spellCheck
        />
      </View>

      {renderCharacterCount()}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  toolbar: {
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  toolbarButton: {
    padding: 10,
    marginHorizontal: 2,
    borderRadius: 6,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarButtonActive: {
    backgroundColor: '#e3f2fd',
  },
  separator: {
    width: 1,
    height: 30,
    backgroundColor: '#ddd',
    marginHorizontal: 8,
  },
  headingButton: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  fontSizeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  colorPicker: {
    backgroundColor: '#fff',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  colorOption: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  fontSizePicker: {
    backgroundColor: '#fff',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  fontSizeOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  fontSizeOptionActive: {
    backgroundColor: '#007bff',
  },
  fontSizeOptionText: {
    color: '#666',
    fontWeight: '500',
  },
  editorContainer: {
    flex: 1,
    padding: 16,
  },
  textInput: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    minHeight: 200,
    textAlignVertical: 'top',
  },
  charCountContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: 'flex-end',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
  },
  charCountWarning: {
    color: '#ffc107',
  },
  charCountError: {
    color: '#dc3545',
  },
});

export default RichTextEditor;