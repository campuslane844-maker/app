import {
  Modal,
  View,
  Text,
  Pressable,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ClassItem {
  _id: string;
  name: string;
}

interface ClassPickerModalProps {
  visible: boolean;
  onClose: () => void;
  classes: ClassItem[];
  selectedValue: string | null;
  onSelect: (value: string | null) => void;
}

export function ClassPickerModal({
  visible,
  onClose,
  classes,
  selectedValue,
  onSelect,
}: ClassPickerModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/40 justify-end"
      >
        {/* Bottom Sheet */}
        <Pressable className="bg-white rounded-t-3xl">
          <SafeAreaView>
            {/* Header */}
            <View className="px-6 py-4 border-b border-gray-200">
              <Text className="text-lg font-sans font-medium text-gray-900">
                Select class
              </Text>
            </View>

            {/* Options */}
            <FlatList
              data={classes}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ paddingVertical: 8 }}
              renderItem={({ item }) => {
                const selected = item._id === selectedValue;

                return (
                  <Pressable
                    onPress={() => {
                      onSelect(item._id);
                      onClose();
                    }}
                    className="px-6 py-4 flex-row justify-between items-center"
                  >
                    <Text
                      className={`text-base font-sans ${
                        selected
                          ? "text-primary font-medium"
                          : "text-gray-900"
                      }`}
                    >
                      {item.name}
                    </Text>

                   
                  </Pressable>
                );
              }}
            />

           
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
