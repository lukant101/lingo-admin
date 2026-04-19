import { View, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { TextInput, Text, HelperText, useTheme } from "react-native-paper";

type InputProps = {
  label?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  error?: string;
  containerStyle?: ViewStyle;
  style?: TextStyle;
  multiline?: boolean;
  numberOfLines?: number;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad" | "url";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoComplete?:
    | "off"
    | "email"
    | "password"
    | "new-password"
    | "name"
    | "username";
  editable?: boolean;
  maxLength?: number;
  onBlur?: () => void;
};

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  containerStyle,
  style,
  multiline,
  numberOfLines,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoComplete,
  editable,
  maxLength,
  onBlur,
}: InputProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          variant="bodySmall"
          style={[styles.label, { color: theme.colors.onSurfaceVariant }]}
        >
          {label}
        </Text>
      )}
      <TextInput
        mode="outlined"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        error={!!error}
        multiline={multiline}
        numberOfLines={numberOfLines}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        editable={editable}
        maxLength={maxLength}
        onBlur={onBlur}
        style={[
          multiline && numberOfLines
            ? { height: numberOfLines * 24 }
            : undefined,
          style,
        ]}
        outlineStyle={styles.outline}
      />
      {error && (
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  label: {
    marginBottom: 6,
  },
  outline: {
    borderRadius: 8,
  },
});
