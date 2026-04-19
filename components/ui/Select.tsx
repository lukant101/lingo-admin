import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ViewStyle,
} from "react-native";
import { useState } from "react";
import { Text, useTheme } from "react-native-paper";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { DIALOG_MAX_WIDTH } from "@/lib/constants";

type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = {
  label?: string;
  options: SelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  containerStyle?: ViewStyle;
};

export function Select({
  label,
  options,
  value,
  onValueChange,
  placeholder = "Select an option",
  error,
  containerStyle,
}: SelectProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const theme = useTheme();

  const selectedOption = options.find((opt) => opt.value === value);

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
      <TouchableOpacity
        style={[
          styles.select,
          {
            backgroundColor: theme.colors.surface,
            borderColor: error ? theme.colors.error : theme.colors.outline,
          },
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Text
          variant="bodyLarge"
          style={{
            color: selectedOption
              ? theme.colors.onSurface
              : theme.colors.onSurfaceVariant,
          }}
        >
          {selectedOption?.label ?? placeholder}
        </Text>
        <FontAwesome
          name="chevron-down"
          size={14}
          color={theme.colors.onSurfaceVariant}
        />
      </TouchableOpacity>
      {error && (
        <Text
          variant="bodySmall"
          style={[styles.error, { color: theme.colors.error }]}
        >
          {error}
        </Text>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={[
            styles.modalOverlay,
            { backgroundColor: theme.colors.backdrop },
          ]}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text
              variant="titleMedium"
              style={[styles.modalTitle, { color: theme.colors.onSurface }]}
            >
              {label ?? "Select"}
            </Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    {
                      backgroundColor:
                        item.value === value
                          ? theme.colors.secondaryContainer
                          : "transparent",
                    },
                  ]}
                  onPress={() => {
                    onValueChange(item.value);
                    setModalVisible(false);
                  }}
                >
                  <Text
                    variant="bodyLarge"
                    style={{ color: theme.colors.onSurface }}
                  >
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <FontAwesome
                      name="check"
                      size={16}
                      color={theme.colors.primary}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
  },
  select: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  error: {
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: DIALOG_MAX_WIDTH,
    maxHeight: "70%",
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: "center",
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
