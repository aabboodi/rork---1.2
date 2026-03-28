import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  countryCode: string;
  onCountryCodeChange: (code: string) => void;
  placeholder?: string;
}

export default function PhoneInput({
  value,
  onChangeText,
  countryCode,
  onCountryCodeChange,
  placeholder = 'Phone Number'
}: PhoneInputProps) {
  const handleCountryCodeChange = (text: string) => {
    // Ensure country code starts with +
    let formattedCode = text;
    if (!formattedCode.startsWith('+')) {
      formattedCode = '+' + formattedCode.replace(/[^0-9]/g, '');
    } else {
      formattedCode = '+' + formattedCode.substring(1).replace(/[^0-9]/g, '');
    }
    if (onCountryCodeChange) {
      onCountryCodeChange(formattedCode);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.countryCodeInput}
          value={countryCode}
          onChangeText={handleCountryCodeChange}
          placeholder="+966"
          keyboardType="phone-pad"
          maxLength={5}
        />
        <View style={styles.separator} />
        <TextInput
          style={styles.phoneInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType="phone-pad"
          maxLength={15}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  countryCodeInput: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.dark,
    minWidth: 80,
    textAlign: 'center',
  },
  separator: {
    width: 1,
    backgroundColor: Colors.border,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.dark,
  },
});