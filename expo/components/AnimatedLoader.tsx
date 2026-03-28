import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import Colors from '@/constants/colors';

const { width } = Dimensions.get('window');

interface AnimatedLoaderProps {
  size?: number;
  color?: string;
  type?: 'dots' | 'pulse' | 'wave' | 'spinner' | 'bars';
  speed?: number;
}

export default function AnimatedLoader({
  size = 40,
  color = Colors.primary,
  type = 'dots',
  speed = 1000
}: AnimatedLoaderProps) {
  const animValue1 = useRef(new Animated.Value(0)).current;
  const animValue2 = useRef(new Animated.Value(0)).current;
  const animValue3 = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation;

    switch (type) {
      case 'dots':
        animation = createDotsAnimation();
        break;
      case 'pulse':
        animation = createPulseAnimation();
        break;
      case 'wave':
        animation = createWaveAnimation();
        break;
      case 'spinner':
        animation = createSpinnerAnimation();
        break;
      case 'bars':
        animation = createBarsAnimation();
        break;
      default:
        animation = createDotsAnimation();
    }

    animation.start();

    return () => {
      animation.stop();
    };
  }, [type, speed]);

  const createDotsAnimation = () => {
    return Animated.loop(
      Animated.stagger(200, [
        Animated.sequence([
          Animated.timing(animValue1, {
            toValue: 1,
            duration: speed / 3,
            useNativeDriver: true,
          }),
          Animated.timing(animValue1, {
            toValue: 0,
            duration: speed / 3,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(animValue2, {
            toValue: 1,
            duration: speed / 3,
            useNativeDriver: true,
          }),
          Animated.timing(animValue2, {
            toValue: 0,
            duration: speed / 3,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(animValue3, {
            toValue: 1,
            duration: speed / 3,
            useNativeDriver: true,
          }),
          Animated.timing(animValue3, {
            toValue: 0,
            duration: speed / 3,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
  };

  const createPulseAnimation = () => {
    return Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: speed / 2,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: speed / 2,
          useNativeDriver: true,
        }),
      ])
    );
  };

  const createWaveAnimation = () => {
    return Animated.loop(
      Animated.stagger(100, [
        Animated.sequence([
          Animated.timing(animValue1, {
            toValue: 1,
            duration: speed / 4,
            useNativeDriver: true,
          }),
          Animated.timing(animValue1, {
            toValue: 0,
            duration: speed / 4,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(animValue2, {
            toValue: 1,
            duration: speed / 4,
            useNativeDriver: true,
          }),
          Animated.timing(animValue2, {
            toValue: 0,
            duration: speed / 4,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(animValue3, {
            toValue: 1,
            duration: speed / 4,
            useNativeDriver: true,
          }),
          Animated.timing(animValue3, {
            toValue: 0,
            duration: speed / 4,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
  };

  const createSpinnerAnimation = () => {
    return Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: speed,
        useNativeDriver: true,
      })
    );
  };

  const createBarsAnimation = () => {
    return Animated.loop(
      Animated.stagger(150, [
        Animated.sequence([
          Animated.timing(animValue1, {
            toValue: 1,
            duration: speed / 3,
            useNativeDriver: true,
          }),
          Animated.timing(animValue1, {
            toValue: 0.3,
            duration: speed / 3,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(animValue2, {
            toValue: 1,
            duration: speed / 3,
            useNativeDriver: true,
          }),
          Animated.timing(animValue2, {
            toValue: 0.3,
            duration: speed / 3,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(animValue3, {
            toValue: 1,
            duration: speed / 3,
            useNativeDriver: true,
          }),
          Animated.timing(animValue3, {
            toValue: 0.3,
            duration: speed / 3,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
  };

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: color,
            width: size / 4,
            height: size / 4,
            opacity: animValue1,
            transform: [{ scale: animValue1 }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: color,
            width: size / 4,
            height: size / 4,
            opacity: animValue2,
            transform: [{ scale: animValue2 }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: color,
            width: size / 4,
            height: size / 4,
            opacity: animValue3,
            transform: [{ scale: animValue3 }],
          },
        ]}
      />
    </View>
  );

  const renderPulse = () => (
    <Animated.View
      style={[
        styles.pulse,
        {
          backgroundColor: color,
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    />
  );

  const renderWave = () => (
    <View style={styles.waveContainer}>
      <Animated.View
        style={[
          styles.bar,
          {
            backgroundColor: color,
            width: size / 8,
            height: animValue1.interpolate({
              inputRange: [0, 1],
              outputRange: [size / 4, size],
            }),
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bar,
          {
            backgroundColor: color,
            width: size / 8,
            height: animValue2.interpolate({
              inputRange: [0, 1],
              outputRange: [size / 4, size],
            }),
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bar,
          {
            backgroundColor: color,
            width: size / 8,
            height: animValue3.interpolate({
              inputRange: [0, 1],
              outputRange: [size / 4, size],
            }),
          },
        ]}
      />
    </View>
  );

  const renderSpinner = () => (
    <Animated.View
      style={[
        styles.spinner,
        {
          width: size,
          height: size,
          borderColor: color + '30',
          borderTopColor: color,
          borderWidth: size / 10,
          borderRadius: size / 2,
          transform: [
            {
              rotate: rotateAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
              }),
            },
          ],
        },
      ]}
    />
  );

  const renderBars = () => (
    <View style={styles.barsContainer}>
      <Animated.View
        style={[
          styles.bar,
          {
            backgroundColor: color,
            width: size / 6,
            height: size,
            opacity: animValue1,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bar,
          {
            backgroundColor: color,
            width: size / 6,
            height: size,
            opacity: animValue2,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bar,
          {
            backgroundColor: color,
            width: size / 6,
            height: size,
            opacity: animValue3,
          },
        ]}
      />
    </View>
  );

  const renderLoader = () => {
    switch (type) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'wave':
        return renderWave();
      case 'spinner':
        return renderSpinner();
      case 'bars':
        return renderBars();
      default:
        return renderDots();
    }
  };

  return <View style={styles.container}>{renderLoader()}</View>;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    borderRadius: 50,
    marginHorizontal: 3,
  },
  pulse: {
    // Styles applied dynamically
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bar: {
    marginHorizontal: 2,
    borderRadius: 2,
  },
  spinner: {
    // Styles applied dynamically
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});