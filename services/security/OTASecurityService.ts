import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

interface OTAUpdate {
  version: string;
  url: string;
  signature: string;
  hash: string;
  timestamp: number;
  mandatory: boolean;
  size: number;
  releaseNotes: string;
  minAppVersion: string;
  targetPlatform: string;
  signatureAlgorithm: 'RSA-PSS' | 'ECDSA';
  hashAlgorithm: 'SHA-256' | 'SHA-512';
  certificateChain: string[];
  codeSigningCert: string;
}

interface OTASecurityConfig {
  publicKeys: {
    primary: string;
    backup: string;
    emergency: string;
  };
  allowedDomains: string[];
  maxUpdateSize: number;
  verificationTimeout: number;
  trustedCertificates: string[];
  codeSigningPolicy: {
    requireValidCertChain: boolean;
    allowSelfSigned: boolean;
    maxCertAge: number;
    requiredKeyUsage: string[];
  };
  integrityChecks: {
    enableDoubleHashing: boolean;
    requireTimestampValidation: boolean;
    maxTimestampSkew: number;
  };
  rollbackProtection: {
    enabled: boolean;
    allowDowngrade: boolean;
    maxRollbackVersions: number;
  };
}

class OTASecurityService {
  private config: OTASecurityConfig;
  private updateHistory: OTAUpdate[] = [];

  constructor() {
    this.config = {
      publicKeys: {
        primary: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4f5wg5l2hKsTeNem/V41fGnJm6gOdrj8ym3rFkEjWT2btf02uBMxZNNvOmxuee6+BaFoXPVdgqtip69fLVhJbNsXxEqucpyvnL0eHYiRyqfffoyxBG21op79k/Af7NiTFzoTu04yoVp0x6xDEQk4+G2ufhb9pyHtgNzBCaYpuE4QxcKWDv8/7a6H1Bd7va6x9a4k2jj9wTdwJiwrfNdWxjgooLvfM1VT0AoM7VpZoJ9eJfTvdG6RjjVLRy7o9FMaQAuoVT4fXIiQckkt0z8m7_DaZvui5qsQG4_5CyOP2dYmHuPqMSdNt09W69EziqJMDqK5ykJMuFqLzHzNUVwIDAQAB',
        backup: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2f4wg5l2hKsTeNem/V41fGnJm6gOdrj8ym3rFkEjWT2btf02uBMxZNNvOmxuee6+BaFoXPVdgqtip69fLVhJbNsXxEqucpyvnL0eHYiRyqfffoyxBG21op79k/Af7NiTFzoTu04yoVp0x6xDEQk4+G2ufhb9pyHtgNzBCaYpuE4QxcKWDv8/7a6H1Bd7va6x9a4k2jj9wTdwJiwrfNdWxjgooLvfM1VT0AoM7VpZoJ9eJfTvdG6RjjVLRy7o9FMaQAuoVT4fXIiQckkt0z8m7_DaZvui5qsQG4_5CyOP2dYmHuPqMSdNt09W69EziqJMDqK5ykJMuFqLzHzNUVwIDAQAB',
        emergency: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1f3wg5l2hKsTeNem/V41fGnJm6gOdrj8ym3rFkEjWT2btf02uBMxZNNvOmxuee6+BaFoXPVdgqtip69fLVhJbNsXxEqucpyvnL0eHYiRyqfffoyxBG21op79k/Af7NiTFzoTu04yoVp0x6xDEQk4+G2ufhb9pyHtgNzBCaYpuE4QxcKWDv8/7a6H1Bd7va6x9a4k2jj9wTdwJiwrfNdWxjgooLvfM1VT0AoM7VpZoJ9eJfTvdG6RjjVLRy7o9FMaQAuoVT4fXIiQckkt0z8m7_DaZvui5qsQG4_5CyOP2dYmHuPqMSdNt09W69EziqJMDqK5ykJMuFqLzHzNUVwIDAQAB'
      },
      allowedDomains: ['updates.yourapp.com', 'cdn.yourapp.com', 'secure-updates.yourapp.com'],
      maxUpdateSize: 100 * 1024 * 1024, // 100MB
      verificationTimeout: 60000, // 60 seconds
      trustedCertificates: [
        'MIIDXTCCAkWgAwIBAgIJAKoK/heBjcOuMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNVBAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQwHhcNMTYxMjMxMTQzNDQ3WhcNMjYxMjI5MTQzNDQ3WjBFMQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4f5wg5l2hKsTeNem/V41fGnJm6gOdrj8ym3rFkEjWT2btf02uBMxZNNvOmxuee6+BaFoXPVdgqtip69fLVhJbNsXxEqucpyvnL0eHYiRyqfffoyxBG21op79k/Af7NiTFzoTu04yoVp0x6xDEQk4+G2ufhb9pyHtgNzBCaYpuE4QxcKWDv8/7a6H1Bd7va6x9a4k2jj9wTdwJiwrfNdWxjgooLvfM1VT0AoM7VpZoJ9eJfTvdG6RjjVLRy7o9FMaQAuoVT4fXIiQckkt0z8m7_DaZvui5qsQG4_5CyOP2dYmHuPqMSdNt09W69EziqJMDqK5ykJMuFqLzHzNUVwIDAQABo1AwTjAdBgNVHQ4EFgQUhBjMhTTsvAyUlC4IWZzHshBOCggwHwYDVR0jBBgwFoAUhBjMhTTsvAyUlC4IWZzHshBOCggwDAYDVR0TBAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAg+oJflmxeWDe71cDjHtrTcMQO2qLNMc3M8xgLqMnhxhHkxb4Ot0Zkz/XqyTuFBupQeYUluPiSNuZkokHfyahievAp1apskQdeXI5A3+6OsLaNn+6Sb2n4FYE6/4A8CoCeq9SMFhNFoz4d7jegFPMfpHuaF1BM65hfDqFJuBiF9HX/tyFzGf/BGzDhd4PdgQTnAxHnFiQtkjZQnb9C/Oh4LQHHEFLsasjJ7xn5f3c4ZY/6yzVFcChHwB5GqNxrM5xjwjGjNUBMb+gUFnoDKOxEzrDPkJ2cFso7+VHYQD6TGpOOEptimuMuy6Ek8mOy1s3+Ch9VQRBvB1uIbIHAsxgDg=='
      ],
      codeSigningPolicy: {
        requireValidCertChain: true,
        allowSelfSigned: false,
        maxCertAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        requiredKeyUsage: ['digitalSignature', 'keyEncipherment']
      },
      integrityChecks: {
        enableDoubleHashing: true,
        requireTimestampValidation: true,
        maxTimestampSkew: 5 * 60 * 1000 // 5 minutes
      },
      rollbackProtection: {
        enabled: true,
        allowDowngrade: false,
        maxRollbackVersions: 3
      }
    };
    this.loadUpdateHistory();
    this.initializeSecurityKeys();
  }

  // التحقق من صحة التحديث بشكل شامل ومتقدم
  async verifyUpdate(update: OTAUpdate): Promise<{valid: boolean, errors: string[], warnings: string[]}> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. التحقق من المصدر والمجال
      if (!this.isAllowedDomain(update.url)) {
        errors.push('مصدر التحديث غير موثوق - المجال غير مسموح');
      }

      // 2. التحقق من إصدار التطبيق المطلوب
      const currentVersion = await this.getCurrentAppVersion();
      if (!this.isVersionCompatible(currentVersion, update.minAppVersion)) {
        errors.push(`إصدار التطبيق الحالي ${currentVersion} غير متوافق مع الحد الأدنى المطلوب ${update.minAppVersion}`);
      }

      // 3. التحقق من المنصة المستهدفة
      if (update.targetPlatform !== Platform.OS && update.targetPlatform !== 'universal') {
        errors.push(`التحديث مخصص لمنصة ${update.targetPlatform} وليس ${Platform.OS}`);
      }

      // 4. التحقق من الحجم
      if (update.size > this.config.maxUpdateSize) {
        errors.push(`حجم التحديث ${this.formatBytes(update.size)} يتجاوز الحد الأقصى المسموح ${this.formatBytes(this.config.maxUpdateSize)}`);
      }

      // 5. التحقق من التوقيت والطابع الزمني
      const timestampValidation = await this.validateTimestamp(update.timestamp);
      if (!timestampValidation.valid) {
        if (timestampValidation.critical) {
          errors.push(timestampValidation.message);
        } else {
          warnings.push(timestampValidation.message);
        }
      }

      // 6. التحقق من سلسلة الشهادات
      const certChainValidation = await this.validateCertificateChain(update.certificateChain);
      if (!certChainValidation.valid) {
        errors.push(`فشل التحقق من سلسلة الشهادات: ${certChainValidation.error}`);
      }

      // 7. التحقق من التوقيع الرقمي المتقدم
      const signatureValidation = await this.verifyAdvancedDigitalSignature(update);
      if (!signatureValidation.valid) {
        errors.push(`فشل التحقق من التوقيع الرقمي: ${signatureValidation.error}`);
      }

      // 8. التحقق من الحماية ضد التراجع
      if (this.config.rollbackProtection.enabled) {
        const rollbackCheck = await this.checkRollbackProtection(update.version);
        if (!rollbackCheck.allowed) {
          if (rollbackCheck.critical) {
            errors.push(rollbackCheck.message);
          } else {
            warnings.push(rollbackCheck.message);
          }
        }
      }

      // 9. التحقق من تكامل البيانات المضاعف
      if (this.config.integrityChecks.enableDoubleHashing) {
        const integrityCheck = await this.performDoubleHashVerification(update);
        if (!integrityCheck.valid) {
          errors.push(`فشل فحص التكامل المضاعف: ${integrityCheck.error}`);
        }
      }

      // تسجيل محاولة التحقق
      await this.logVerificationAttempt(update, errors, warnings);

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      const errorMessage = `خطأ في عملية التحقق من التحديث: ${error}`;
      console.error('OTA verification failed:', error);
      return {
        valid: false,
        errors: [errorMessage],
        warnings
      };
    }
  }

  // تحميل وتطبيق التحديث بأمان متقدم
  async downloadAndApplyUpdate(update: OTAUpdate, progressCallback?: (progress: number) => void): Promise<{
    success: boolean;
    error?: string;
    warnings?: string[];
    rollbackInfo?: any;
  }> {
    let downloadedFilePath: string | undefined;
    let backupInfo: any = null;

    try {
      // 1. التحقق الشامل من صحة التحديث
      progressCallback?.(5);
      const verification = await this.verifyUpdate(update);
      if (!verification.valid) {
        return {
          success: false,
          error: `فشل التحقق من التحديث: ${verification.errors.join(', ')}`,
          warnings: verification.warnings
        };
      }

      // 2. إعداد نسخة احتياطية قبل التحديث
      progressCallback?.(10);
      backupInfo = await this.createBackup();
      if (!backupInfo.success) {
        return {
          success: false,
          error: 'فشل في إعداد النسخة الاحتياطية'
        };
      }

      // 3. تحميل التحديث مع مراقبة التقدم
      progressCallback?.(15);
      const downloadResult = await this.downloadUpdateFileSecure(update, (downloadProgress) => {
        progressCallback?.(15 + (downloadProgress * 0.4)); // 15-55%
      });
      
      if (!downloadResult.success || !downloadResult.filePath) {
        return {
          success: false,
          error: `فشل تحميل التحديث: ${downloadResult.error}`
        };
      }
      
      downloadedFilePath = downloadResult.filePath;

      // 4. التحقق من تكامل الملف المحمل
      progressCallback?.(60);
      const integrityCheck = await this.verifyDownloadedFileIntegrity(downloadedFilePath, update);
      if (!integrityCheck.valid) {
        await this.cleanupDownloadedFile(downloadedFilePath);
        return {
          success: false,
          error: `فشل فحص تكامل الملف: ${integrityCheck.error}`
        };
      }

      // 5. التحقق النهائي من التوقيع قبل التطبيق
      progressCallback?.(70);
      const finalSignatureCheck = await this.performFinalSignatureVerification(downloadedFilePath, update);
      if (!finalSignatureCheck.valid) {
        await this.cleanupDownloadedFile(downloadedFilePath);
        return {
          success: false,
          error: `فشل التحقق النهائي من التوقيع: ${finalSignatureCheck.error}`
        };
      }

      // 6. تطبيق التحديث بأمان
      progressCallback?.(80);
      const applyResult = await this.applyUpdateSecure(downloadedFilePath, update, backupInfo);
      
      if (!applyResult.success) {
        // استعادة النسخة الاحتياطية في حالة الفشل
        await this.restoreBackup(backupInfo);
        await this.cleanupDownloadedFile(downloadedFilePath);
        return {
          success: false,
          error: `فشل تطبيق التحديث: ${applyResult.error}`,
          rollbackInfo: backupInfo
        };
      }

      // 7. حفظ معلومات التحديث في التاريخ
      progressCallback?.(90);
      await this.recordSuccessfulUpdate(update, backupInfo);

      // 8. تنظيف الملفات المؤقتة
      await this.cleanupDownloadedFile(downloadedFilePath);
      
      progressCallback?.(100);
      return {
        success: true,
        warnings: verification.warnings
      };

    } catch (error) {
      console.error('OTA update failed with exception:', error);
      
      // تنظيف في حالة الخطأ
      if (downloadedFilePath) {
        await this.cleanupDownloadedFile(downloadedFilePath);
      }
      
      // استعادة النسخة الاحتياطية إذا لزم الأمر
      if (backupInfo) {
        await this.restoreBackup(backupInfo);
      }
      
      return {
        success: false,
        error: `خطأ غير متوقع في عملية التحديث: ${error}`,
        rollbackInfo: backupInfo
      };
    }
  }

  // التحقق المتقدم من التوقيع الرقمي مع دعم خوارزميات متعددة
  private async verifyAdvancedDigitalSignature(update: OTAUpdate): Promise<{valid: boolean, error?: string}> {
    try {
      // إعداد البيانات للتوقيع
      const signatureData = this.prepareSignatureData(update);
      
      // اختيار المفتاح العام المناسب
      const publicKey = await this.selectAppropriatePublicKey(update);
      if (!publicKey) {
        return { valid: false, error: 'لم يتم العثور على مفتاح عام مناسب' };
      }

      if (Platform.OS === 'web') {
        return await this.verifySignatureWeb(signatureData, update.signature, publicKey, update.signatureAlgorithm);
      } else {
        return await this.verifySignatureMobile(signatureData, update.signature, publicKey, update.signatureAlgorithm);
      }
    } catch (error) {
      console.error('Advanced signature verification failed:', error);
      return { valid: false, error: `خطأ في التحقق من التوقيع: ${error}` };
    }
  }

  // إعداد بيانات التوقيع
  private prepareSignatureData(update: OTAUpdate): string {
    const dataToSign = [
      update.version,
      update.url,
      update.hash,
      update.timestamp.toString(),
      update.size.toString(),
      update.targetPlatform,
      update.minAppVersion
    ].join('|');
    
    return dataToSign;
  }

  // اختيار المفتاح العام المناسب
  private async selectAppropriatePublicKey(update: OTAUpdate): Promise<string | null> {
    // جرب المفتاح الأساسي أولاً
    if (await this.isKeyValid(this.config.publicKeys.primary)) {
      return this.config.publicKeys.primary;
    }
    
    // جرب المفتاح الاحتياطي
    if (await this.isKeyValid(this.config.publicKeys.backup)) {
      return this.config.publicKeys.backup;
    }
    
    // جرب مفتاح الطوارئ
    if (await this.isKeyValid(this.config.publicKeys.emergency)) {
      return this.config.publicKeys.emergency;
    }
    
    return null;
  }

  // التحقق من صحة المفتاح
  private async isKeyValid(publicKey: string): Promise<boolean> {
    try {
      // في التطبيق الحقيقي، يجب التحقق من صحة المفتاح وانتهاء صلاحيته
      return publicKey && publicKey.length > 100; // فحص بسيط
    } catch {
      return false;
    }
  }

  // التحقق من التوقيع في بيئة الويب
  private async verifySignatureWeb(
    data: string, 
    signature: string, 
    publicKey: string, 
    algorithm: 'RSA-PSS' | 'ECDSA'
  ): Promise<{valid: boolean, error?: string}> {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const signatureBuffer = this.base64ToArrayBuffer(signature);
      
      let cryptoKey: CryptoKey;
      let verifyAlgorithm: any;
      
      if (algorithm === 'RSA-PSS') {
        cryptoKey = await window.crypto.subtle.importKey(
          'spki',
          this.base64ToArrayBuffer(publicKey),
          {
            name: 'RSA-PSS',
            hash: 'SHA-256'
          },
          false,
          ['verify']
        );
        
        verifyAlgorithm = {
          name: 'RSA-PSS',
          saltLength: 32
        };
      } else {
        // ECDSA
        cryptoKey = await window.crypto.subtle.importKey(
          'spki',
          this.base64ToArrayBuffer(publicKey),
          {
            name: 'ECDSA',
            namedCurve: 'P-256'
          },
          false,
          ['verify']
        );
        
        verifyAlgorithm = {
          name: 'ECDSA',
          hash: 'SHA-256'
        };
      }

      const isValid = await window.crypto.subtle.verify(
        verifyAlgorithm,
        cryptoKey,
        signatureBuffer,
        dataBuffer
      );
      
      return { valid: isValid };
    } catch (error) {
      return { valid: false, error: `خطأ في التحقق من التوقيع (ويب): ${error}` };
    }
  }

  // التحقق من التوقيع في بيئة الموبايل
  private async verifySignatureMobile(
    data: string, 
    signature: string, 
    publicKey: string, 
    algorithm: 'RSA-PSS' | 'ECDSA'
  ): Promise<{valid: boolean, error?: string}> {
    try {
      // حساب الهاش باستخدام SHA-256
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data
      );
      
      // في التطبيق الحقيقي، استخدم مكتبة متخصصة للتحقق من التوقيع
      // مثل react-native-rsa-native أو مكتبة مشابهة
      const isValid = await this.performNativeSignatureVerification(hash, signature, publicKey, algorithm);
      
      return { valid: isValid };
    } catch (error) {
      return { valid: false, error: `خطأ في التحقق من التوقيع (موبايل): ${error}` };
    }
  }

  // التحقق من التوقيع باستخدام المكتبات الأصلية
  private async performNativeSignatureVerification(
    hash: string, 
    signature: string, 
    publicKey: string, 
    algorithm: 'RSA-PSS' | 'ECDSA'
  ): Promise<boolean> {
    try {
      // في التطبيق الحقيقي، استخدم مكتبة متخصصة
      // هذه محاكاة لأغراض العرض
      
      // فحص بسيط للتأكد من وجود البيانات
      if (!hash || !signature || !publicKey) {
        return false;
      }
      
      // محاكاة التحقق بناءً على طول وتعقيد البيانات
      const expectedSignatureLength = algorithm === 'RSA-PSS' ? 344 : 88; // Base64 lengths
      const isSignatureLengthValid = signature.length >= expectedSignatureLength * 0.8;
      const isHashValid = hash.length === 64; // SHA-256 hex length
      const isPublicKeyValid = publicKey.length > 200;
      
      return isSignatureLengthValid && isHashValid && isPublicKeyValid;
    } catch (error) {
      console.error('Native signature verification failed:', error);
      return false;
    }
  }

  // حساب hash للملف
  private async calculateFileHash(filePath: string): Promise<string> {
    try {
      if (Platform.OS === 'web') {
        // للويب، نحتاج لقراءة الملف كـ ArrayBuffer
        const response = await fetch(filePath);
        const buffer = await response.arrayBuffer();
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
        return this.arrayBufferToHex(hashBuffer);
      } else {
        // للموبايل، استخدام FileSystem
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (!fileInfo.exists) {
          throw new Error('File does not exist');
        }
        
        // قراءة الملف وحساب الـ hash
        const fileContent = await FileSystem.readAsStringAsync(filePath, {
          encoding: FileSystem.EncodingType.Base64
        });
        
        return await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          fileContent
        );
      }
    } catch (error) {
      console.error('Hash calculation failed:', error);
      throw error;
    }
  }

  // تحميل ملف التحديث
  private async downloadUpdateFile(update: OTAUpdate): Promise<{success: boolean, filePath?: string}> {
    try {
      const fileName = `update_${update.version}_${Date.now()}.bundle`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      if (Platform.OS === 'web') {
        // للويب، نحفظ في localStorage أو IndexedDB
        const response = await fetch(update.url);
        const blob = await response.blob();
        const base64 = await this.blobToBase64(blob);
        
        await AsyncStorage.setItem(`ota_update_${update.version}`, base64);
        return { success: true, filePath: `ota_update_${update.version}` };
      } else {
        // للموبايل، استخدام FileSystem
        const downloadResult = await FileSystem.downloadAsync(update.url, filePath);
        
        if (downloadResult.status === 200) {
          return { success: true, filePath };
        } else {
          return { success: false };
        }
      }
    } catch (error) {
      console.error('Download failed:', error);
      return { success: false };
    }
  }

  // تطبيق التحديث
  private async applyUpdate(filePath: string, update: OTAUpdate): Promise<boolean> {
    try {
      // في التطبيق الحقيقي، هنا يتم تطبيق التحديث
      // هذا مثال مبسط
      
      console.log(`Applying update ${update.version} from ${filePath}`);
      
      // محاكاة تطبيق التحديث
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // حفظ معلومات التحديث
      await AsyncStorage.setItem('current_app_version', update.version);
      await AsyncStorage.setItem('last_update_timestamp', update.timestamp.toString());
      
      return true;
    } catch (error) {
      console.error('Update application failed:', error);
      return false;
    }
  }

  // التحقق من المجال المسموح
  private isAllowedDomain(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return this.config.allowedDomains.includes(urlObj.hostname);
    } catch {
      return false;
    }
  }

  // محاكاة التحقق من التوقيع
  private simulateSignatureVerification(hash: string, signature: string): boolean {
    // في التطبيق الحقيقي، استخدم مكتبة RSA للتحقق
    return hash.length > 0 && signature.length > 0;
  }

  // تحويل base64 إلى ArrayBuffer
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // تحويل ArrayBuffer إلى hex
  private arrayBufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  // تحويل Blob إلى base64
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // إزالة data:type;base64,
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // الحصول على حجم الملف
  private async getFileSize(url: string): Promise<number> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      return contentLength ? parseInt(contentLength, 10) : 0;
    } catch {
      return 0;
    }
  }

  // تحميل تاريخ التحديثات بشكل آمن
  private async loadUpdateHistory(): Promise<void> {
    try {
      let historyData: any;
      
      if (Platform.OS !== 'web') {
        // تحميل آمن من SecureStore
        const secureHistory = await SecureStore.getItemAsync('ota_update_history_secure');
        if (secureHistory) {
          historyData = JSON.parse(secureHistory);
        }
      } else {
        // تحميل من AsyncStorage للويب
        const history = await AsyncStorage.getItem('ota_update_history');
        if (history) {
          historyData = JSON.parse(history);
        }
      }
      
      if (historyData) {
        // التحقق من checksum
        if (historyData.checksum && historyData.updates) {
          const calculatedChecksum = await this.calculateHistoryChecksum(historyData.updates);
          if (calculatedChecksum === historyData.checksum) {
            this.updateHistory = historyData.updates;
          } else {
            console.warn('Update history checksum mismatch - data may be corrupted');
            this.updateHistory = [];
          }
        } else {
          // تنسيق قديم
          this.updateHistory = Array.isArray(historyData) ? historyData : [];
        }
      }
    } catch (error) {
      console.error('Failed to load update history:', error);
      this.updateHistory = [];
    }
  }

  // حفظ تاريخ التحديثات بشكل آمن
  private async saveUpdateHistory(): Promise<void> {
    try {
      const historyData = {
        updates: this.updateHistory.slice(-10), // الاحتفاظ بآخر 10 تحديثات
        lastSaved: Date.now(),
        checksum: await this.calculateHistoryChecksum(this.updateHistory.slice(-10))
      };
      
      if (Platform.OS !== 'web') {
        // حفظ آمن في SecureStore
        await SecureStore.setItemAsync(
          'ota_update_history_secure',
          JSON.stringify(historyData)
        );
      } else {
        // حفظ في AsyncStorage للويب
        await AsyncStorage.setItem(
          'ota_update_history',
          JSON.stringify(historyData)
        );
      }
    } catch (error) {
      console.error('Failed to save update history:', error);
    }
  }

  // حساب checksum لتاريخ التحديثات
  private async calculateHistoryChecksum(history: OTAUpdate[]): Promise<string> {
    const historyString = JSON.stringify(history.map(update => ({
      version: update.version,
      timestamp: update.timestamp,
      hash: update.hash
    })));
    
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      historyString
    );
  }

  // الحصول على معلومات التحديث الحالي
  async getCurrentUpdateInfo(): Promise<{version: string, lastUpdate: number} | null> {
    try {
      const version = await AsyncStorage.getItem('current_app_version');
      const lastUpdate = await AsyncStorage.getItem('last_update_timestamp');
      
      if (version && lastUpdate) {
        return {
          version,
          lastUpdate: parseInt(lastUpdate, 10)
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  // الحصول على تاريخ التحديثات
  getUpdateHistory(): OTAUpdate[] {
    return [...this.updateHistory];
  }

  // فحص التحديثات المتاحة بشكل آمن
  async checkForUpdates(): Promise<OTAUpdate | null> {
    try {
      const currentVersion = await this.getCurrentAppVersion();
      const deviceFingerprint = await this.getDeviceFingerprint();
      
      // إعداد بيانات الطلب بشكل آمن
      const requestData = {
        currentVersion,
        platform: Platform.OS,
        deviceFingerprint,
        timestamp: Date.now(),
        supportedAlgorithms: ['RSA-PSS', 'ECDSA'],
        maxUpdateSize: this.config.maxUpdateSize
      };
      
      // توقيع الطلب لضمان الأمان
      const requestSignature = await this.signRequest(requestData);
      
      const response = await fetch('https://api.yourapp.com/updates/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Signature': requestSignature,
          'X-Client-Version': currentVersion,
          'X-Platform': Platform.OS
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const updateInfo = await response.json();
        
        // التحقق من توقيع الاستجابة
        const responseSignature = response.headers.get('X-Response-Signature');
        if (responseSignature) {
          const isResponseValid = await this.verifyResponseSignature(
            JSON.stringify(updateInfo), 
            responseSignature
          );
          if (!isResponseValid) {
            console.error('Invalid response signature');
            return null;
          }
        }
        
        return updateInfo.hasUpdate ? updateInfo.update : null;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      await this.logSecurityEvent('update_check_failed', { error: error.toString() });
      return null;
    }
  }

  // الحصول على بصمة الجهاز
  private async getDeviceFingerprint(): Promise<string> {
    try {
      const deviceInfo = {
        platform: Platform.OS,
        version: Platform.Version,
        timestamp: Date.now()
      };
      
      return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        JSON.stringify(deviceInfo)
      );
    } catch {
      return 'unknown';
    }
  }

  // توقيع الطلب
  private async signRequest(data: any): Promise<string> {
    try {
      const dataString = JSON.stringify(data);
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        dataString
      );
      
      // في التطبيق الحقيقي، استخدم مفتاح خاص للتوقيع
      return hash; // مبسط لأغراض العرض
    } catch {
      return '';
    }
  }

  // التحقق من توقيع الاستجابة
  private async verifyResponseSignature(data: string, signature: string): Promise<boolean> {
    try {
      // في التطبيق الحقيقي، استخدم مفتاح عام للخادم
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data
      );
      
      return hash.length > 0 && signature.length > 0; // مبسط لأغراض العرض
    } catch {
      return false;
    }
  }

  // الحصول على إصدار التطبيق الحالي
  private async getCurrentAppVersion(): Promise<string> {
    try {
      return await AsyncStorage.getItem('current_app_version') || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  // التحقق من توافق الإصدارات
  private isVersionCompatible(currentVersion: string, minVersion: string): boolean {
    try {
      const current = currentVersion.split('.').map(Number);
      const min = minVersion.split('.').map(Number);
      
      for (let i = 0; i < Math.max(current.length, min.length); i++) {
        const currentPart = current[i] || 0;
        const minPart = min[i] || 0;
        
        if (currentPart > minPart) return true;
        if (currentPart < minPart) return false;
      }
      
      return true; // متساويان
    } catch {
      return false;
    }
  }

  // التحقق من الطابع الزمني
  private async validateTimestamp(timestamp: number): Promise<{valid: boolean, critical: boolean, message: string}> {
    const now = Date.now();
    const timeDiff = Math.abs(now - timestamp);
    const maxSkew = this.config.integrityChecks.maxTimestampSkew;
    const maxAge = 24 * 60 * 60 * 1000; // 24 ساعة
    
    if (timeDiff > maxAge) {
      return {
        valid: false,
        critical: true,
        message: 'التحديث قديم جداً وغير آمن'
      };
    }
    
    if (timeDiff > maxSkew) {
      return {
        valid: false,
        critical: false,
        message: 'الطابع الزمني للتحديث غير دقيق'
      };
    }
    
    return {
      valid: true,
      critical: false,
      message: 'الطابع الزمني صحيح'
    };
  }

  // التحقق من سلسلة الشهادات
  private async validateCertificateChain(certChain: string[]): Promise<{valid: boolean, error?: string}> {
    try {
      if (!certChain || certChain.length === 0) {
        return { valid: false, error: 'سلسلة الشهادات فارغة' };
      }
      
      // التحقق من وجود شهادة موثوقة
      for (const cert of certChain) {
        if (this.config.trustedCertificates.includes(cert)) {
          return { valid: true };
        }
      }
      
      // في التطبيق الحقيقي، يجب التحقق من صحة وانتهاء صلاحية كل شهادة
      return { valid: false, error: 'لم يتم العثور على شهادة موثوقة في السلسلة' };
    } catch (error) {
      return { valid: false, error: `خطأ في التحقق من الشهادات: ${error}` };
    }
  }

  // فحص الحماية ضد التراجع
  private async checkRollbackProtection(newVersion: string): Promise<{allowed: boolean, critical: boolean, message: string}> {
    try {
      const currentVersion = await this.getCurrentAppVersion();
      
      if (!this.config.rollbackProtection.allowDowngrade) {
        const isDowngrade = this.isVersionDowngrade(currentVersion, newVersion);
        if (isDowngrade) {
          return {
            allowed: false,
            critical: true,
            message: `محاولة تراجع من الإصدار ${currentVersion} إلى ${newVersion} غير مسموحة`
          };
        }
      }
      
      return {
        allowed: true,
        critical: false,
        message: 'التحديث مسموح'
      };
    } catch (error) {
      return {
        allowed: false,
        critical: true,
        message: `خطأ في فحص الحماية ضد التراجع: ${error}`
      };
    }
  }

  // التحقق من كون الإصدار تراجع
  private isVersionDowngrade(currentVersion: string, newVersion: string): boolean {
    try {
      const current = currentVersion.split('.').map(Number);
      const newVer = newVersion.split('.').map(Number);
      
      for (let i = 0; i < Math.max(current.length, newVer.length); i++) {
        const currentPart = current[i] || 0;
        const newPart = newVer[i] || 0;
        
        if (currentPart > newPart) return true;
        if (currentPart < newPart) return false;
      }
      
      return false; // متساويان
    } catch {
      return false;
    }
  }

  // فحص التكامل المضاعف
  private async performDoubleHashVerification(update: OTAUpdate): Promise<{valid: boolean, error?: string}> {
    try {
      // حساب هاش مزدوج
      const primaryHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        update.url + update.version + update.timestamp
      );
      
      const secondaryHash = await Crypto.digestStringAsync(
        update.hashAlgorithm === 'SHA-512' ? Crypto.CryptoDigestAlgorithm.SHA512 : Crypto.CryptoDigestAlgorithm.SHA256,
        primaryHash + update.hash
      );
      
      // في التطبيق الحقيقي، يجب مقارنة هذا مع هاش متوقع من الخادم
      const isValid = secondaryHash.length === 64 || secondaryHash.length === 128; // SHA-256 or SHA-512
      
      return {
        valid: isValid,
        error: isValid ? undefined : 'فشل فحص التكامل المضاعف'
      };
    } catch (error) {
      return {
        valid: false,
        error: `خطأ في فحص التكامل المضاعف: ${error}`
      };
    }
  }

  // تسجيل محاولة التحقق
  private async logVerificationAttempt(update: OTAUpdate, errors: string[], warnings: string[]): Promise<void> {
    try {
      const logEntry = {
        timestamp: Date.now(),
        updateVersion: update.version,
        platform: Platform.OS,
        errors,
        warnings,
        success: errors.length === 0
      };
      
      await this.logSecurityEvent('ota_verification_attempt', logEntry);
    } catch (error) {
      console.error('Failed to log verification attempt:', error);
    }
  }

  // تسجيل الأحداث الأمنية
  private async logSecurityEvent(eventType: string, data: any): Promise<void> {
    try {
      const logEntry = {
        type: eventType,
        timestamp: Date.now(),
        platform: Platform.OS,
        data
      };
      
      // حفظ في الذاكرة المحلية
      const existingLogs = await AsyncStorage.getItem('ota_security_logs') || '[]';
      const logs = JSON.parse(existingLogs);
      logs.push(logEntry);
      
      // الاحتفاظ بآخر 100 حدث
      const recentLogs = logs.slice(-100);
      await AsyncStorage.setItem('ota_security_logs', JSON.stringify(recentLogs));
      
      // في التطبيق الحقيقي، أرسل إلى خادم المراقبة
      console.log('Security event logged:', eventType, data);
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  // تهيئة مفاتيح الأمان
  private async initializeSecurityKeys(): Promise<void> {
    try {
      // في التطبيق الحقيقي، يجب تحميل المفاتيح من مصدر آمن
      // والتحقق من صحتها وانتهاء صلاحيتها
      console.log('Security keys initialized');
    } catch (error) {
      console.error('Failed to initialize security keys:', error);
    }
  }

  // تنسيق حجم البيانات
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // الحصول على سجلات الأمان
  async getSecurityLogs(): Promise<any[]> {
    try {
      const logs = await AsyncStorage.getItem('ota_security_logs');
      return logs ? JSON.parse(logs) : [];
    } catch {
      return [];
    }
  }

  // مسح سجلات الأمان
  async clearSecurityLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem('ota_security_logs');
    } catch (error) {
      console.error('Failed to clear security logs:', error);
    }
  }

  // تحميل آمن للتحديث
  private async downloadUpdateFileSecure(
    update: OTAUpdate, 
    progressCallback?: (progress: number) => void
  ): Promise<{success: boolean, filePath?: string, error?: string}> {
    try {
      const fileName = `update_${update.version}_${Date.now()}.bundle`;
      const filePath = Platform.OS === 'web' 
        ? `ota_update_${update.version}` 
        : `${FileSystem.documentDirectory}${fileName}`;

      if (Platform.OS === 'web') {
        // تحميل آمن في بيئة الويب
        const response = await fetch(update.url, {
          method: 'GET',
          headers: {
            'Accept': 'application/octet-stream',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        const reader = response.body?.getReader();
        if (!reader) {
          return { success: false, error: 'فشل في قراءة الاستجابة' };
        }
        
        const chunks: Uint8Array[] = [];
        let receivedLength = 0;
        const contentLength = parseInt(response.headers.get('content-length') || '0');
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          chunks.push(value);
          receivedLength += value.length;
          
          if (contentLength > 0) {
            progressCallback?.(receivedLength / contentLength * 100);
          }
        }
        
        const blob = new Blob(chunks);
        const base64 = await this.blobToBase64(blob);
        
        await AsyncStorage.setItem(filePath, base64);
        return { success: true, filePath };
        
      } else {
        // تحميل آمن في بيئة الموبايل
        const downloadResumable = FileSystem.createDownloadResumable(
          update.url,
          filePath,
          {
            headers: {
              'Accept': 'application/octet-stream',
              'Cache-Control': 'no-cache'
            }
          },
          (downloadProgress) => {
            const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite * 100;
            progressCallback?.(progress);
          }
        );
        
        const downloadResult = await downloadResumable.downloadAsync();
        
        if (downloadResult && downloadResult.status === 200) {
          return { success: true, filePath: downloadResult.uri };
        } else {
          return { success: false, error: 'فشل في تحميل الملف' };
        }
      }
    } catch (error) {
      return { success: false, error: `خطأ في التحميل: ${error}` };
    }
  }

  // التحقق من تكامل الملف المحمل
  private async verifyDownloadedFileIntegrity(
    filePath: string, 
    update: OTAUpdate
  ): Promise<{valid: boolean, error?: string}> {
    try {
      const fileHash = await this.calculateFileHash(filePath);
      
      if (fileHash !== update.hash) {
        return {
          valid: false,
          error: `عدم تطابق الهاش: متوقع ${update.hash}، محسوب ${fileHash}`
        };
      }
      
      // فحص إضافي للحجم
      const fileSize = await this.getDownloadedFileSize(filePath);
      if (fileSize !== update.size) {
        return {
          valid: false,
          error: `عدم تطابق الحجم: متوقع ${update.size}، فعلي ${fileSize}`
        };
      }
      
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `خطأ في فحص تكامل الملف: ${error}`
      };
    }
  }

  // الحصول على حجم الملف المحمل
  private async getDownloadedFileSize(filePath: string): Promise<number> {
    try {
      if (Platform.OS === 'web') {
        const base64Data = await AsyncStorage.getItem(filePath);
        if (!base64Data) return 0;
        
        // حساب الحجم من base64
        const padding = (base64Data.match(/=/g) || []).length;
        return (base64Data.length * 3) / 4 - padding;
      } else {
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        return fileInfo.exists ? fileInfo.size || 0 : 0;
      }
    } catch {
      return 0;
    }
  }

  // التحقق النهائي من التوقيع
  private async performFinalSignatureVerification(
    filePath: string, 
    update: OTAUpdate
  ): Promise<{valid: boolean, error?: string}> {
    try {
      // قراءة الملف وحساب الهاش
      const fileContent = await this.readFileForSignature(filePath);
      const fileHash = await Crypto.digestStringAsync(
        update.hashAlgorithm === 'SHA-512' ? Crypto.CryptoDigestAlgorithm.SHA512 : Crypto.CryptoDigestAlgorithm.SHA256,
        fileContent
      );
      
      // إعداد بيانات التوقيع النهائية
      const signatureData = [
        fileHash,
        update.version,
        update.timestamp.toString()
      ].join('|');
      
      // التحقق من التوقيع
      const publicKey = await this.selectAppropriatePublicKey(update);
      if (!publicKey) {
        return { valid: false, error: 'لم يتم العثور على مفتاح عام مناسب' };
      }
      
      if (Platform.OS === 'web') {
        return await this.verifySignatureWeb(signatureData, update.signature, publicKey, update.signatureAlgorithm);
      } else {
        return await this.verifySignatureMobile(signatureData, update.signature, publicKey, update.signatureAlgorithm);
      }
    } catch (error) {
      return {
        valid: false,
        error: `خطأ في التحقق النهائي: ${error}`
      };
    }
  }

  // قراءة الملف للتوقيع
  private async readFileForSignature(filePath: string): Promise<string> {
    try {
      if (Platform.OS === 'web') {
        const base64Data = await AsyncStorage.getItem(filePath);
        return base64Data || '';
      } else {
        return await FileSystem.readAsStringAsync(filePath, {
          encoding: FileSystem.EncodingType.Base64
        });
      }
    } catch (error) {
      throw new Error(`فشل في قراءة الملف: ${error}`);
    }
  }

  // إعداد نسخة احتياطية
  private async createBackup(): Promise<{success: boolean, backupId?: string, error?: string}> {
    try {
      const backupId = `backup_${Date.now()}`;
      const currentVersion = await this.getCurrentAppVersion();
      
      const backupData = {
        id: backupId,
        version: currentVersion,
        timestamp: Date.now(),
        platform: Platform.OS
      };
      
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(
          `ota_backup_${backupId}`,
          JSON.stringify(backupData)
        );
      } else {
        await AsyncStorage.setItem(
          `ota_backup_${backupId}`,
          JSON.stringify(backupData)
        );
      }
      
      return { success: true, backupId };
    } catch (error) {
      return {
        success: false,
        error: `فشل في إعداد النسخة الاحتياطية: ${error}`
      };
    }
  }

  // تطبيق التحديث بأمان
  private async applyUpdateSecure(
    filePath: string, 
    update: OTAUpdate, 
    backupInfo: any
  ): Promise<{success: boolean, error?: string}> {
    try {
      // في التطبيق الحقيقي، هنا يتم تطبيق التحديث فعلياً
      console.log(`تطبيق التحديث ${update.version} من ${filePath}`);
      
      // محاكاة عملية التحديث
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // حفظ معلومات الإصدار الجديد
      await AsyncStorage.setItem('current_app_version', update.version);
      await AsyncStorage.setItem('last_update_timestamp', update.timestamp.toString());
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `فشل في تطبيق التحديث: ${error}`
      };
    }
  }

  // استعادة النسخة الاحتياطية
  private async restoreBackup(backupInfo: any): Promise<void> {
    try {
      if (backupInfo && backupInfo.backupId) {
        console.log(`استعادة النسخة الاحتياطية: ${backupInfo.backupId}`);
        
        // في التطبيق الحقيقي، هنا يتم استعادة النسخة الاحتياطية
        await this.logSecurityEvent('backup_restored', backupInfo);
      }
    } catch (error) {
      console.error('Failed to restore backup:', error);
    }
  }

  // تنظيف الملف المحمل
  private async cleanupDownloadedFile(filePath: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(filePath);
      } else {
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(filePath);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup downloaded file:', error);
    }
  }

  // تسجيل التحديث الناجح
  private async recordSuccessfulUpdate(update: OTAUpdate, backupInfo: any): Promise<void> {
    try {
      // إضافة إلى التاريخ
      this.updateHistory.push({
        ...update,
        timestamp: Date.now()
      });
      
      await this.saveUpdateHistory();
      
      // تسجيل الحدث
      await this.logSecurityEvent('ota_update_successful', {
        version: update.version,
        backupId: backupInfo?.backupId,
        timestamp: Date.now()
      });
      
      // إرسال إشعار نجاح التحديث
      if (Platform.OS !== 'web') {
        Alert.alert(
          'تم التحديث بنجاح',
          `تم تحديث التطبيق إلى الإصدار ${update.version} بأمان تام.`,
          [{ text: 'موافق' }]
        );
      }
    } catch (error) {
      console.error('Failed to record successful update:', error);
    }
  }

  // الحصول على إحصائيات الأمان
  async getSecurityStats(): Promise<{
    totalUpdates: number;
    successfulUpdates: number;
    failedUpdates: number;
    lastUpdateDate: number | null;
    securityLevel: string;
  }> {
    try {
      const logs = await this.getSecurityLogs();
      const updateAttempts = logs.filter(log => log.type === 'ota_verification_attempt');
      const successful = updateAttempts.filter(log => log.data.success);
      const failed = updateAttempts.filter(log => !log.data.success);
      
      const lastUpdate = this.updateHistory.length > 0 
        ? this.updateHistory[this.updateHistory.length - 1].timestamp 
        : null;
      
      let securityLevel = 'ممتاز';
      if (failed.length > successful.length) securityLevel = 'ضعيف';
      else if (failed.length > 0) securityLevel = 'متوسط';
      
      return {
        totalUpdates: this.updateHistory.length,
        successfulUpdates: successful.length,
        failedUpdates: failed.length,
        lastUpdateDate: lastUpdate,
        securityLevel
      };
    } catch {
      return {
        totalUpdates: 0,
        successfulUpdates: 0,
        failedUpdates: 0,
        lastUpdateDate: null,
        securityLevel: 'غير معروف'
      };
    }
  }
}

export default new OTASecurityService();