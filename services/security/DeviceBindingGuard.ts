import { Platform } from 'react-native';
import * as Constants from 'expo-constants';
import DeviceBindingService from './DeviceBindingService';

export async function validateDeviceBinding(sessionId: string): Promise<boolean> {
  try {
    const isExpoGo = (Constants as any)?.appOwnership === 'expo';

    if (__DEV__ || Platform.OS === 'web' || isExpoGo) {
      console.warn('[DEV] Skip device binding validation');
      return true;
    }

    return await realDeviceBindingCheck(sessionId);
  } catch (error) {
    console.error('validateDeviceBinding error:', error);
    return false;
  }
}

async function realDeviceBindingCheck(sessionId: string): Promise<boolean> {
  const service = DeviceBindingService.getInstance();

  const result = await service.validateSessionBinding(sessionId);
  console.log('Device binding validation result', {
    valid: result.valid,
    riskScore: result.riskScore,
    anomalies: result.anomalies,
    bindingStrength: result.bindingStrength,
  });

  return result.valid === true;
}
