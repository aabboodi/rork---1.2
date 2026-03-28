export type DLPCategory = 'financial' | 'personal' | 'health' | 'profanity' | 'custom';

export interface DLPViolation {
    category: DLPCategory;
    matches: string[];
    confidence: number;
    startIndex: number;
    endIndex: number;
}

export interface E2EEMessage {
    encryptedContent: string;
    iv: string;
    sessionKeyId: string;
    senderKeyFingerprint: string;
    messageMAC: string;
    timestamp: number;
    sequenceNumber: number;
    ratchetHeader?: {
        dhPublicKey: string;
        previousCounter: number;
        counter: number;
    };
    messageType: 'prekey' | 'message';
    protocolVersion: number;
}

export interface KeyExchangeSession {
    sessionId: string;
    chatId: string;
    participantId: string;
    status: 'pending' | 'key_exchange' | 'established' | 'verified' | 'failed';
    keyFingerprint?: string;
    createdAt: number;
    updatedAt: number;
}

export interface KeyVerificationResult {
    verified: boolean;
    error?: string;
    timestamp: number;
    method?: 'manual' | 'biometric' | 'automatic';
}
