import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ThemeProvider, useThemeSafe } from '../providers/ThemeProvider';
import { useAssertThemeReady, validateThemeStructure } from '../utils/assertTheme';
import { DEFAULT_LIGHT, DEFAULT_DARK } from '../constants/theme';

// Test component that uses theme
const TestComponent: React.FC = () => {
  const { theme } = useAssertThemeReady();
  return <Text testID="theme-text" style={{ color: theme.colors.text }}>Test</Text>;
};

// Test component that validates theme structure
const ThemeValidationComponent: React.FC = () => {
  const { theme } = useThemeSafe();
  const isValid = validateThemeStructure(theme);
  return <Text testID="validation-result">{isValid ? 'valid' : 'invalid'}</Text>;
};

describe('Theme System', () => {
  it('should provide default light theme', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const textElement = getByTestId('theme-text');
    expect(textElement).toBeTruthy();
    expect(textElement.props.style.color).toBe(DEFAULT_LIGHT.colors.text);
  });

  it('should validate theme structure correctly', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeValidationComponent />
      </ThemeProvider>
    );

    const validationResult = getByTestId('validation-result');
    expect(validationResult.props.children).toBe('valid');
  });

  it('should have valid default light theme structure', () => {
    expect(validateThemeStructure(DEFAULT_LIGHT)).toBe(true);
  });

  it('should have valid default dark theme structure', () => {
    expect(validateThemeStructure(DEFAULT_DARK)).toBe(true);
  });

  it('should detect invalid theme structure', () => {
    const invalidTheme = {
      colors: {
        background: '#FFFFFF',
        // Missing required properties
      }
    };
    expect(validateThemeStructure(invalidTheme)).toBe(false);
  });

  it('should provide theme context without undefined values', () => {
    const TestContextComponent: React.FC = () => {
      const { theme, ready } = useThemeSafe();
      return (
        <>
          <Text testID="background">{theme.colors.background}</Text>
          <Text testID="ready">{ready ? 'true' : 'false'}</Text>
        </>
      );
    };

    const { getByTestId } = render(
      <ThemeProvider>
        <TestContextComponent />
      </ThemeProvider>
    );

    const backgroundElement = getByTestId('background');
    const readyElement = getByTestId('ready');
    
    expect(backgroundElement.props.children).toBeTruthy();
    expect(backgroundElement.props.children).not.toBe('undefined');
    expect(readyElement.props.children).toBe('true');
  });
});