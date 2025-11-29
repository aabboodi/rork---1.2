import os

file_path = r'c:\Users\engah\rork---1.2\types\index.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the end of TransactionLimit
limit_end_index = -1
for i, line in enumerate(lines):
    if 'export interface TransactionLimit' in line:
        # Find the closing brace for this interface
        for j in range(i, len(lines)):
            if lines[j].strip() == '}':
                limit_end_index = j
                break
        break

if limit_end_index != -1:
    # Keep content up to TransactionLimit end
    new_content = lines[:limit_end_index+1]
    
    # Append new types
    new_types = """
export interface AntiFraudRule {
  ruleId: string;
  ruleName: string;
  keyFingerprint?: string;
  createdAt: number;
  expiresAt?: number;
}

export interface KeyVerificationResult {
  verified: boolean;
  error?: string;
  timestamp: number;
  method?: 'manual' | 'biometric' | 'automatic';
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

export type DLPCategory = 'financial' | 'personal' | 'health' | 'profanity' | 'custom';

export interface DLPViolation {
  category: DLPCategory;
  matches: string[];
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export interface E2EEMessage {
  id: string;
  senderId: string;
  content: string; // Encrypted content
  timestamp: number;
  protocolVersion: number;
  iv: string;
  senderKeyId?: number;
  receiverKeyId?: number;
  signature?: string;
}
"""
    new_content.append(new_types)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_content)
    print("File fixed successfully.")
else:
    print("TransactionLimit not found.")
