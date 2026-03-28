import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Upload, Image as ImageIcon, Check, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import {
    compressImage,
    compressImageForPost,
    compressImageForThumbnail,
    smartCompress,
    estimateUploadTime,
    CompressionResult,
} from '@/services/media/MediaCompressionService';

interface ImageUploadProps {
    onUploadComplete: (uri: string) => void;
    onCancel?: () => void;
    uploadType?: 'post' | 'profile' | 'thumbnail';
}

export default function ImageUploadExample({ onUploadComplete, onCancel, uploadType = 'post' }: ImageUploadProps) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [compressedImage, setCompressedImage] = useState<CompressionResult | null>(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const pickImage = async () => {
        try {
            // Request permissions
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permissionResult.granted) {
                Alert.alert('خطأ', 'نحتاج إلى إذن للوصول إلى معرض الصور');
                return;
            }

            // Pick image
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: uploadType === 'profile' ? [1, 1] : [16, 9],
                quality: 1, // We'll compress it ourselves
            });

            if (!result.canceled && result.assets[0]) {
                setSelectedImage(result.assets[0].uri);
                await compressSelectedImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('خطأ', 'فشل في اختيار الصورة');
        }
    };

    const compressSelectedImage = async (imageUri: string) => {
        setIsCompressing(true);

        try {
            let result: CompressionResult;

            // Choose compression method based on upload type
            switch (uploadType) {
                case 'profile':
                    result = await compressImage(imageUri, {
                        quality: 0.8,
                        maxWidth: 500,
                        maxHeight: 500,
                    });
                    break;
                case 'thumbnail':
                    result = await compressImageForThumbnail(imageUri);
                    break;
                case 'post':
                default:
                    // Smart compression based on network (simulated as 4g)
                    result = await smartCompress(imageUri, '4g');
                    break;
            }

            setCompressedImage(result);

            // Show compression stats
            const savedMB = ((result.originalSize - result.size) / 1024 / 1024).toFixed(2);
            Alert.alert(
                'تم الضغط بنجاح',
                `تم توفير ${savedMB} ميجابايت (${result.compressionRatio.toFixed(1)}%)\n\n` +
                `الحجم الأصلي: ${(result.originalSize / 1024).toFixed(2)} كيلوبايت\n` +
                `الحجم المضغوط: ${(result.size / 1024).toFixed(2)} كيلوبايت`
            );
        } catch (error) {
            console.error('Compression error:', error);
            Alert.alert('خطأ', 'فشل في ضغط الصورة');
        } finally {
            setIsCompressing(false);
        }
    };

    const simulateUpload = async () => {
        if (!compressedImage) return;

        setIsUploading(true);
        setUploadProgress(0);

        // Estimate upload time
        const estimatedTime = estimateUploadTime(compressedImage.size, '4g');
        console.log(`Estimated upload time: ${estimatedTime} seconds`);

        // Simulate upload progress
        const interval = setInterval(() => {
            setUploadProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 10;
            });
        }, estimatedTime * 100); // Spread over estimated time

        // Simulate API call
        setTimeout(() => {
            clearInterval(interval);
            setUploadProgress(100);
            setIsUploading(false);

            Alert.alert('نجاح', 'تم رفع الصورة بنجاح', [
                {
                    text: 'موافق',
                    onPress: () => {
                        onUploadComplete(compressedImage.uri);
                    },
                },
            ]);
        }, estimatedTime * 1000);
    };

    const handleCancel = () => {
        setSelectedImage(null);
        setCompressedImage(null);
        setUploadProgress(0);
        onCancel?.();
    };

    return (
        <View style={styles.container}>
            {!selectedImage ? (
                <TouchableOpacity style={styles.pickButton} onPress={pickImage}>
                    <Upload size={40} color={Colors.primary} />
                    <Text style={styles.pickButtonText}>اختر صورة</Text>
                </TouchableOpacity>
            ) : (
                <View style={styles.previewContainer}>
                    {isCompressing ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={Colors.primary} />
                            <Text style={styles.loadingText}>جاري ضغط الصورة...</Text>
                        </View>
                    ) : (
                        <>
                            <Image
                                source={{ uri: compressedImage?.uri || selectedImage }}
                                style={styles.previewImage}
                                resizeMode="cover"
                            />

                            {compressedImage && (
                                <View style={styles.statsContainer}>
                                    <View style={styles.statRow}>
                                        <Text style={styles.statLabel}>الحجم الأصلي:</Text>
                                        <Text style={styles.statValue}>
                                            {(compressedImage.originalSize / 1024).toFixed(2)} KB
                                        </Text>
                                    </View>
                                    <View style={styles.statRow}>
                                        <Text style={styles.statLabel}>بعد الضغط:</Text>
                                        <Text style={[styles.statValue, styles.statValueSuccess]}>
                                            {(compressedImage.size / 1024).toFixed(2)} KB
                                        </Text>
                                    </View>
                                    <View style={styles.statRow}>
                                        <Text style={styles.statLabel}>تم توفير:</Text>
                                        <Text style={[styles.statValue, styles.statValueSuccess]}>
                                            {compressedImage.compressionRatio.toFixed(1)}%
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {uploadProgress > 0 && uploadProgress < 100 && (
                                <View style={styles.progressContainer}>
                                    <View style={styles.progressBar}>
                                        <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                                    </View>
                                    <Text style={styles.progressText}>{uploadProgress}%</Text>
                                </View>
                            )}

                            <View style={styles.actionsContainer}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={handleCancel}
                                    disabled={isUploading}
                                >
                                    <X size={20} color={Colors.error} />
                                    <Text style={styles.cancelButtonText}>إلغاء</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.uploadButton,
                                        (isUploading || !compressedImage) && styles.uploadButtonDisabled,
                                    ]}
                                    onPress={simulateUpload}
                                    disabled={isUploading || !compressedImage}
                                >
                                    {isUploading ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <>
                                            <Check size={20} color="white" />
                                            <Text style={styles.uploadButtonText}>رفع</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    pickButton: {
        backgroundColor: Colors.secondary,
        borderRadius: 16,
        padding: 40,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.primary,
        borderStyle: 'dashed',
    },
    pickButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.primary,
        marginTop: 12,
    },
    previewContainer: {
        backgroundColor: Colors.card,
        borderRadius: 16,
        overflow: 'hidden',
    },
    loadingContainer: {
        padding: 60,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: Colors.dark,
        marginTop: 16,
    },
    previewImage: {
        width: '100%',
        height: 300,
        backgroundColor: Colors.secondary,
    },
    statsContainer: {
        padding: 16,
        backgroundColor: Colors.background,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    statLabel: {
        fontSize: 14,
        color: Colors.medium,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.dark,
    },
    statValueSuccess: {
        color: Colors.success,
    },
    progressContainer: {
        padding: 16,
        backgroundColor: Colors.background,
    },
    progressBar: {
        height: 8,
        backgroundColor: Colors.secondary,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.primary,
    },
    progressText: {
        fontSize: 12,
        color: Colors.medium,
        textAlign: 'center',
        marginTop: 8,
    },
    actionsContainer: {
        flexDirection: 'row',
        padding: 16,
    },
    cancelButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.secondary,
        paddingVertical: 12,
        borderRadius: 12,
        marginRight: 8,
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.error,
        marginLeft: 8,
    },
    uploadButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        paddingVertical: 12,
        borderRadius: 12,
        marginLeft: 8,
    },
    uploadButtonDisabled: {
        backgroundColor: Colors.medium,
    },
    uploadButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: 'white',
        marginLeft: 8,
    },
});
