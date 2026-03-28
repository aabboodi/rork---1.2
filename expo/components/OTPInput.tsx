import React, { useRef, useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Keyboard } from 'react-native';
import Colors from '@/constants/colors';

interface OTPInputProps {
  length: number;
  value: string;
  onChange: (otp: string) => void;
}

export default function OTPInput({ length, value, onChange }: OTPInputProps) {
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [localOtpValues, setLocalOtpValues] = useState<string[]>(
    Array(length).fill('')
  );

  useEffect(() => {
    // Update local state when value prop changes
    if (value) {
      const valueArray = value.split('').slice(0, length);
      setLocalOtpValues(
        [...valueArray, ...Array(length - valueArray.length).fill('')]
      );
    }
  }, [value, length]);

  const handleChange = (text: string, index: number) => {
    const newOtpValues = [...localOtpValues];
    newOtpValues[index] = text;
    setLocalOtpValues(newOtpValues);
    
    // Combine OTP values and call onChange
    const otpValue = newOtpValues.join('');
    onChange(otpValue);

    // Auto focus next input if current input is filled
    if (text && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !localOtpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {Array(length)
        .fill(0)
        .map((_, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            style={styles.input}
            value={localOtpValues[index]}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            selectionColor={Colors.primary}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 20,
  },
  input: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
  },
});