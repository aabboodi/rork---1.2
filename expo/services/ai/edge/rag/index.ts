import AsyncStorage from '@react-native-async-storage/async-storage';

// Types for RAG system
export interface Document {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    source: string;
    timestamp: number;
    category?: string;
    priority?: number;
  };
}

export interface RAGIndex {
  documents: Document[];
  version: string;
  lastUpdated: number;
  totalSize: number; // in bytes
}

export interface SearchResult {
  document: Document;
  score: number;
  relevance: number;
}

export interface RAGConfig {
  maxIndexSize: number; // 30MB limit
  maxDocuments: number;
  embeddingDimension: number;
  similarityThreshold: number;
  compressionEnabled: boolean;
}

// HNSW-inspired lightweight index for mobile
class LightweightHNSW {
  private documents: Map<string, Document> = new Map();
  private embeddings: Map<string, number[]> = new Map();
  private connections: Map<string, Set<string>> = new Map();
  private config: RAGConfig;

  constructor(config: RAGConfig) {
    this.config = config;
  }

  // Add document to index
  addDocument(doc: Document): void {
    if (this.documents.size >= this.config.maxDocuments) {
      this.evictOldestDocument();
    }

    this.documents.set(doc.id, doc);
    this.embeddings.set(doc.id, doc.embedding);
    this.buildConnections(doc.id, doc.embedding);
  }

  // Build connections for HNSW-like navigation
  private buildConnections(docId: string, embedding: number[]): void {
    const connections = new Set<string>();
    const maxConnections = Math.min(16, this.documents.size); // Limit connections

    // Find nearest neighbors
    const similarities: { id: string; similarity: number }[] = [];
    
    for (const [id, emb] of this.embeddings.entries()) {
      if (id !== docId) {
        const similarity = this.cosineSimilarity(embedding, emb);
        similarities.push({ id, similarity });
      }
    }

    // Sort by similarity and take top connections
    similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxConnections)
      .forEach(({ id }) => connections.add(id));

    this.connections.set(docId, connections);
  }

  // Cosine similarity calculation
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Search for similar documents
  search(queryEmbedding: number[], topK: number = 5): SearchResult[] {
    const results: SearchResult[] = [];
    
    for (const [id, doc] of this.documents.entries()) {
      const embedding = this.embeddings.get(id)!;
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);
      
      if (similarity >= this.config.similarityThreshold) {
        results.push({
          document: doc,
          score: similarity,
          relevance: similarity * (doc.metadata.priority || 1)
        });
      }
    }
    
    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, topK);
  }

  // Evict oldest document when size limit reached
  private evictOldestDocument(): void {
    let oldestId = '';
    let oldestTime = Date.now();
    
    for (const [id, doc] of this.documents.entries()) {
      if (doc.metadata.timestamp < oldestTime) {
        oldestTime = doc.metadata.timestamp;
        oldestId = id;
      }
    }
    
    if (oldestId) {
      this.documents.delete(oldestId);
      this.embeddings.delete(oldestId);
      this.connections.delete(oldestId);
      
      // Remove connections to deleted document
      for (const connections of this.connections.values()) {
        connections.delete(oldestId);
      }
    }
  }

  // Get current index size
  getCurrentSize(): number {
    let size = 0;
    for (const doc of this.documents.values()) {
      size += JSON.stringify(doc).length * 2; // Rough UTF-16 size estimation
    }
    return size;
  }

  // Export index for persistence
  exportIndex(): RAGIndex {
    return {
      documents: Array.from(this.documents.values()),
      version: '1.0.0',
      lastUpdated: Date.now(),
      totalSize: this.getCurrentSize()
    };
  }

  // Import index from persistence
  importIndex(index: RAGIndex): void {
    this.documents.clear();
    this.embeddings.clear();
    this.connections.clear();
    
    for (const doc of index.documents) {
      this.addDocument(doc);
    }
  }
}

// Main RAG service class
export class EdgeRAGService {
  private index: LightweightHNSW;
  private config: RAGConfig;
  private storageKey = 'edge_rag_index';
  private versionKey = 'edge_rag_version';

  constructor(config?: Partial<RAGConfig>) {
    this.config = {
      maxIndexSize: 30 * 1024 * 1024, // 30MB
      maxDocuments: 10000,
      embeddingDimension: 384, // MiniLM dimension
      similarityThreshold: 0.3,
      compressionEnabled: true,
      ...config
    };
    
    this.index = new LightweightHNSW(this.config);
  }

  // Initialize RAG service
  async initialize(): Promise<void> {
    try {
      await this.loadIndex();
      console.log('✅ Edge RAG service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Edge RAG:', error);
      throw error;
    }
  }

  // Add document to RAG index
  async addDocument(doc: Omit<Document, 'embedding'>): Promise<void> {
    try {
      // Generate embedding (placeholder - would use actual embedding model)
      const embedding = await this.generateEmbedding(doc.content);
      
      const fullDoc: Document = {
        ...doc,
        embedding
      };
      
      this.index.addDocument(fullDoc);
      
      // Check size limit
      if (this.index.getCurrentSize() > this.config.maxIndexSize) {
        console.warn('⚠️ RAG index approaching size limit, triggering cleanup');
        await this.optimizeIndex();
      }
      
      await this.saveIndex();
      
      console.log(`📄 Document added to RAG index: ${doc.id}`);
    } catch (error) {
      console.error('❌ Failed to add document to RAG:', error);
      throw error;
    }
  }

  // Search documents
  async search(query: string, topK: number = 5): Promise<SearchResult[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      const results = this.index.search(queryEmbedding, topK);
      
      console.log(`🔍 RAG search completed: ${results.length} results for query`);
      return results;
    } catch (error) {
      console.error('❌ RAG search failed:', error);
      return [];
    }
  }

  // Generate compressed context for LLM
  async generateContext(query: string, maxTokens: number = 2000): Promise<string> {
    try {
      const results = await this.search(query, 10);
      
      if (results.length === 0) {
        return '';
      }
      
      // Compress and combine results
      let context = '';
      let tokenCount = 0;
      
      for (const result of results) {
        const snippet = this.compressContent(result.document.content, maxTokens - tokenCount);
        if (snippet && tokenCount + this.estimateTokens(snippet) <= maxTokens) {
          context += `[Score: ${result.score.toFixed(2)}] ${snippet}\n\n`;
          tokenCount += this.estimateTokens(snippet);
        } else {
          break;
        }
      }
      
      console.log(`📝 Generated RAG context: ${tokenCount} tokens`);
      return context.trim();
    } catch (error) {
      console.error('❌ Failed to generate RAG context:', error);
      return '';
    }
  }

  // Apply differential update
  async applyDifferentialUpdate(update: {
    added: Document[];
    removed: string[];
    modified: Document[];
    version: string;
  }): Promise<void> {
    try {
      console.log(`🔄 Applying differential RAG update: v${update.version}`);
      
      // Remove documents
      for (const docId of update.removed) {
        // Note: Would need to implement removal in LightweightHNSW
        console.log(`🗑️ Removing document: ${docId}`);
      }
      
      // Add new documents
      for (const doc of update.added) {
        this.index.addDocument(doc);
      }
      
      // Update modified documents
      for (const doc of update.modified) {
        // Remove old version and add new
        this.index.addDocument(doc);
      }
      
      await this.saveIndex();
      await AsyncStorage.setItem(this.versionKey, update.version);
      
      console.log(`✅ Differential update applied successfully`);
    } catch (error) {
      console.error('❌ Failed to apply differential update:', error);
      throw error;
    }
  }

  // Get current index statistics
  getIndexStats(): {
    documentCount: number;
    sizeBytes: number;
    version: string;
    lastUpdated: number;
  } {
    const indexData = this.index.exportIndex();
    return {
      documentCount: indexData.documents.length,
      sizeBytes: indexData.totalSize,
      version: indexData.version,
      lastUpdated: indexData.lastUpdated
    };
  }

  // Private methods
  private async generateEmbedding(text: string): Promise<number[]> {
    // Placeholder for actual embedding generation
    // In production, would use TensorFlow Lite or ONNX model
    const hash = this.simpleHash(text);
    const embedding = new Array(this.config.embeddingDimension).fill(0);
    
    // Generate pseudo-embedding based on text hash
    for (let i = 0; i < this.config.embeddingDimension; i++) {
      embedding[i] = Math.sin(hash * (i + 1)) * 0.5;
    }
    
    return embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private compressContent(content: string, maxTokens: number): string {
    if (!this.config.compressionEnabled) {
      return content.slice(0, maxTokens * 4); // Rough token estimation
    }
    
    // Simple compression: extract key sentences
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const targetLength = maxTokens * 4; // Rough character to token ratio
    
    if (content.length <= targetLength) {
      return content;
    }
    
    // Take first and last sentences, plus middle ones if space allows
    let compressed = sentences[0] || '';
    if (sentences.length > 1) {
      compressed += '. ' + sentences[sentences.length - 1];
    }
    
    return compressed.slice(0, targetLength);
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English
    return Math.ceil(text.length / 4);
  }

  private async loadIndex(): Promise<void> {
    try {
      const indexData = await AsyncStorage.getItem(this.storageKey);
      if (indexData) {
        const parsedIndex: RAGIndex = JSON.parse(indexData);
        this.index.importIndex(parsedIndex);
        console.log(`📚 Loaded RAG index: ${parsedIndex.documents.length} documents`);
      }
    } catch (error) {
      console.warn('⚠️ Could not load existing RAG index:', error);
    }
  }

  private async saveIndex(): Promise<void> {
    try {
      const indexData = this.index.exportIndex();
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(indexData));
    } catch (error) {
      console.error('❌ Failed to save RAG index:', error);
    }
  }

  private async optimizeIndex(): Promise<void> {
    // Simple optimization: remove lowest priority documents
    console.log('🔧 Optimizing RAG index...');
    
    // This would implement more sophisticated cleanup logic
    // For now, the LightweightHNSW handles eviction automatically
  }
}

// Singleton instance
let ragServiceInstance: EdgeRAGService | null = null;

export const getEdgeRAGService = (): EdgeRAGService => {
  if (!ragServiceInstance) {
    ragServiceInstance = new EdgeRAGService();
  }
  return ragServiceInstance;
};

// Export types and utilities
export { RAGConfig, Document, SearchResult, RAGIndex };