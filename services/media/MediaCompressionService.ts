import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export interface CompressionOptions {
    quality?: number; // 0-1, default 0.7
    maxWidth?: number; // default 1920
    maxHeight?: number; // default 1080
    format?: 'jpeg' | 'png'; // default 'jpeg'
}

export interface CompressionResult {
    uri: string;
    width: number;
    height: number;
    size: number; // bytes
    originalSize: number; // bytes
    compressionRatio: number; // percentage
}

/**
 * Compress image with aggressive optimization for low-bandwidth scenarios
 */
export const compressImage = async (
    imageUri: string,
    options: CompressionOptions = {}
): Promise<CompressionResult> => {
    try {
        const {
            quality = 0.7,
            maxWidth = 1920,
            maxHeight = 1080,
            format = 'jpeg',
        } = options;

        console.log('[MediaCompression] Starting image compression:', imageUri);

        // Get original file info
        const originalInfo = await FileSystem.getInfoAsync(imageUri);
        if (!originalInfo.exists) {
            throw new Error('File does not exist');
        }
        const originalSize = originalInfo.size;

        // Compress and resize image
        const manipulatedImage = await ImageManipulator.manipulateAsync(
            imageUri,
            [
                {
                    resize: {
                        width: maxWidth,
                        height: maxHeight,
                    },
                },
            ],
            {
                compress: quality,
                format: format === 'jpeg' ? ImageManipulator.SaveFormat.JPEG : ImageManipulator.SaveFormat.PNG,
            }
        );

        // Get compressed file info
        const compressedInfo = await FileSystem.getInfoAsync(manipulatedImage.uri);
        if (!compressedInfo.exists) {
            throw new Error('Compressed file does not exist');
        }
        const compressedSize = compressedInfo.size;

        const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

        console.log('[MediaCompression] Image compressed:', {
            original: `${(originalSize / 1024).toFixed(2)} KB`,
            compressed: `${(compressedSize / 1024).toFixed(2)} KB`,
            ratio: `${compressionRatio.toFixed(1)}%`,
        });

        return {
            uri: manipulatedImage.uri,
            width: manipulatedImage.width,
            height: manipulatedImage.height,
            size: compressedSize,
            originalSize,
            compressionRatio,
        };
    } catch (error) {
        console.error('[MediaCompression] Image compression failed:', error);
        throw error;
    }
};

/**
 * Compress image for thumbnail (very aggressive)
 */
export const compressImageForThumbnail = async (
    imageUri: string
): Promise<CompressionResult> => {
    return compressImage(imageUri, {
        quality: 0.5,
        maxWidth: 400,
        maxHeight: 400,
        format: 'jpeg',
    });
};

/**
 * Compress image for profile picture
 */
export const compressImageForProfile = async (
    imageUri: string
): Promise<CompressionResult> => {
    return compressImage(imageUri, {
        quality: 0.8,
        maxWidth: 500,
        maxHeight: 500,
        format: 'jpeg',
    });
};

/**
 * Compress image for post (balanced quality/size)
 */
export const compressImageForPost = async (
    imageUri: string
): Promise<CompressionResult> => {
    return compressImage(imageUri, {
        quality: 0.7,
        maxWidth: 1920,
        maxHeight: 1080,
        format: 'jpeg',
    });
};

/**
 * Smart compression based on network conditions
 */
export const smartCompress = async (
    imageUri: string,
    networkType: 'wifi' | '4g' | '3g' | '2g' | 'unknown'
): Promise<CompressionResult> => {
    const compressionProfiles: Record<string, CompressionOptions> = {
        wifi: { quality: 0.85, maxWidth: 2560, maxHeight: 1440 },
        '4g': { quality: 0.75, maxWidth: 1920, maxHeight: 1080 },
        '3g': { quality: 0.6, maxWidth: 1280, maxHeight: 720 },
        '2g': { quality: 0.5, maxWidth: 854, maxHeight: 480 },
        unknown: { quality: 0.6, maxWidth: 1280, maxHeight: 720 },
    };

    const profile = compressionProfiles[networkType] || compressionProfiles.unknown;
    console.log(`[MediaCompression] Using ${networkType} profile:`, profile);

    return compressImage(imageUri, profile);
};

/**
 * Batch compress multiple images
 */
export const batchCompressImages = async (
    imageUris: string[],
    options: CompressionOptions = {}
): Promise<CompressionResult[]> => {
    console.log(`[MediaCompression] Batch compressing ${imageUris.length} images`);

    const results = await Promise.all(
        imageUris.map((uri) => compressImage(uri, options))
    );

    const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalCompressedSize = results.reduce((sum, r) => sum + r.size, 0);
    const totalRatio = ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100;

    console.log('[MediaCompression] Batch compression complete:', {
        images: results.length,
        originalSize: `${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`,
        compressedSize: `${(totalCompressedSize / 1024 / 1024).toFixed(2)} MB`,
        saved: `${totalRatio.toFixed(1)}%`,
    });

    return results;
};

/**
 * Video compression placeholder (requires native module)
 * In production, use react-native-compressor or similar
 */
export const compressVideo = async (
    videoUri: string,
    options: {
        quality?: 'low' | 'medium' | 'high';
        bitrate?: number;
    } = {}
): Promise<CompressionResult> => {
    console.log('[MediaCompression] Video compression requested:', videoUri);

    // Placeholder - in production, integrate with react-native-compressor
    // For now, return original video info
    const videoInfo = await FileSystem.getInfoAsync(videoUri);
    if (!videoInfo.exists) {
        throw new Error('Video file does not exist');
    }

    console.warn('[MediaCompression] Video compression not fully implemented - requires native module');

    return {
        uri: videoUri,
        width: 1920,
        height: 1080,
        size: videoInfo.size,
        originalSize: videoInfo.size,
        compressionRatio: 0,
    };
};

/**
 * Calculate optimal compression based on file size and network
 */
export const getOptimalCompressionSettings = (
    fileSizeBytes: number,
    networkType: 'wifi' | '4g' | '3g' | '2g' | 'unknown'
): CompressionOptions => {
    const fileSizeMB = fileSizeBytes / 1024 / 1024;

    // For very large files (>10MB), always compress aggressively
    if (fileSizeMB > 10) {
        return {
            quality: 0.5,
            maxWidth: 1280,
            maxHeight: 720,
            format: 'jpeg',
        };
    }

    // For medium files (5-10MB), use network-based compression
    if (fileSizeMB > 5) {
        const profiles: Record<string, CompressionOptions> = {
            wifi: { quality: 0.8, maxWidth: 1920, maxHeight: 1080 },
            '4g': { quality: 0.7, maxWidth: 1920, maxHeight: 1080 },
            '3g': { quality: 0.6, maxWidth: 1280, maxHeight: 720 },
            '2g': { quality: 0.5, maxWidth: 854, maxHeight: 480 },
            unknown: { quality: 0.6, maxWidth: 1280, maxHeight: 720 },
        };
        return profiles[networkType] || profiles.unknown;
    }

    // For small files (<5MB), minimal compression
    return {
        quality: 0.85,
        maxWidth: 1920,
        maxHeight: 1080,
        format: 'jpeg',
    };
};

/**
 * Estimate upload time based on file size and network speed
 */
export const estimateUploadTime = (
    fileSizeBytes: number,
    networkType: 'wifi' | '4g' | '3g' | '2g' | 'unknown'
): number => {
    // Estimated speeds in Mbps
    const networkSpeeds = {
        wifi: 50, // 50 Mbps
        '4g': 10, // 10 Mbps
        '3g': 2, // 2 Mbps
        '2g': 0.1, // 0.1 Mbps
        unknown: 2, // Assume 3G
    };

    const speedMbps = networkSpeeds[networkType] || networkSpeeds.unknown;
    const fileSizeMb = (fileSizeBytes * 8) / 1024 / 1024; // Convert to megabits
    const timeSeconds = fileSizeMb / speedMbps;

    return Math.ceil(timeSeconds);
};
