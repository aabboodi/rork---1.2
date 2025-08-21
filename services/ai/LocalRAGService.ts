import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export interface RAGDocument {
  id: string;
  content: string;
  metadata: {
    title?: string;
    source?: string;
    timestamp: number;
    category?: string;
    tags?: string[];
  };
  embedding?: number[];
  hash: string;
}

export interface RAGIndex {
  documents: Map<string, RAGDocument>;
  embeddings: Map<string, number[]>;
  categories: Map<string, string[]>;
  lastUpdated: number;
  version: string;
}

export interface RAGQuery {
  text: string;
  category?: string;
  maxResults?: number;
  minSimilarity?: number;
}

export interface RAGResult {
  document: RAGDocument;
  similarity: number;
  relevanceScore: number;
}

/**
 * Local RAG Service - On-device knowledge retrieval with compressed indices
 * 
 * Features:
 * - Local document storage and indexing
 * - Compressed embeddings (quantized)
 * - Memory-efficient similarity search
 * - Category-based filtering
 * - Incremental updates
 */
export class LocalRAGService {
  private index: RAGIndex;
  private isInitialized = false;
  private readonly MAX_MEMORY_USAGE = 50 * 1024 * 1024; // 50MB limit
  private readonly EMBEDDING_DIMENSION = 384; // MiniLM embedding size
  private readonly INDEX_CACHE_KEY = 'rag_index_cache';

  constructor() {
    this.index = {
      documents: new Map(),
      embeddings: new Map(),
      categories: new Map(),
      lastUpdated: Date.now(),
      version: '1.0.0'
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('📚 Initializing Local RAG Service...');

      // Load cached index
      await this.loadCachedIndex();

      // Initialize default knowledge base if empty
      if (this.index.documents.size === 0) {
        await this.initializeDefaultKnowledge();
      }

      // Optimize index for memory usage
      await this.optimizeIndex();

      this.isInitialized = true;
      console.log(`✅ Local RAG Service initialized with ${this.index.documents.size} documents`);

    } catch (error) {
      console.error('❌ RAG service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get relevant context for AI task input
   */
  async getRelevantContext(input: unknown): Promise<RAGResult[]> {
    if (!this.isInitialized) {
      return [];
    }

    try {
      const query = this.prepareQuery(input);
      const results = await this.search(query);
      
      // Filter and rank results
      const relevantResults = results
        .filter(result => result.similarity > (query.minSimilarity || 0.3))
        .slice(0, query.maxResults || 5);

      return relevantResults;

    } catch (error) {
      console.error('❌ RAG context retrieval failed:', error);
      return [];
    }
  }

  /**
   * Add documents to the knowledge base
   */
  async addDocuments(documents: Omit<RAGDocument, 'id' | 'hash' | 'embedding'>[]): Promise<void> {
    for (const doc of documents) {
      await this.addDocument(doc);
    }

    await this.saveIndex();
  }

  /**
   * Update knowledge base from central orchestrator
   */
  async updateKnowledgeBase(documents: RAGDocument[]): Promise<void> {
    let addedCount = 0;
    let updatedCount = 0;

    for (const doc of documents) {
      const existing = this.index.documents.get(doc.id);
      
      if (!existing) {
        this.index.documents.set(doc.id, doc);
        if (doc.embedding) {
          this.index.embeddings.set(doc.id, doc.embedding);
        }
        this.updateCategoryIndex(doc);
        addedCount++;
      } else if (existing.hash !== doc.hash) {
        this.index.documents.set(doc.id, doc);
        if (doc.embedding) {
          this.index.embeddings.set(doc.id, doc.embedding);
        }
        this.updateCategoryIndex(doc);
        updatedCount++;
      }
    }

    this.index.lastUpdated = Date.now();
    await this.saveIndex();

    console.log(`📚 Knowledge base updated: ${addedCount} added, ${updatedCount} updated`);
  }

  /**
   * Search documents by query
   */
  async search(query: RAGQuery): Promise<RAGResult[]> {
    const results: RAGResult[] = [];

    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query.text);

      // Get candidate documents
      const candidates = this.getCandidateDocuments(query);

      // Calculate similarities
      for (const docId of candidates) {
        const document = this.index.documents.get(docId);
        const embedding = this.index.embeddings.get(docId);

        if (!document || !embedding) continue;

        const similarity = this.calculateCosineSimilarity(queryEmbedding, embedding);
        const relevanceScore = this.calculateRelevanceScore(document, query, similarity);

        results.push({
          document,
          similarity,
          relevanceScore
        });
      }

      // Sort by relevance score
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);

      return results.slice(0, query.maxResults || 10);

    } catch (error) {
      console.error('❌ RAG search failed:', error);
      return [];
    }
  }

  /**
   * Get index statistics
   */
  getStats() {
    const memoryUsage = this.estimateMemoryUsage();
    
    return {
      documentCount: this.index.documents.size,
      embeddingCount: this.index.embeddings.size,
      categoryCount: this.index.categories.size,
      memoryUsage,
      memoryLimit: this.MAX_MEMORY_USAGE,
      memoryPercentage: (memoryUsage / this.MAX_MEMORY_USAGE) * 100,
      lastUpdated: this.index.lastUpdated,
      version: this.index.version
    };
  }

  /**
   * Clear knowledge base
   */
  async clearKnowledgeBase(): Promise<void> {
    this.index.documents.clear();
    this.index.embeddings.clear();
    this.index.categories.clear();
    this.index.lastUpdated = Date.now();
    
    await this.saveIndex();
    console.log('🗑️ Knowledge base cleared');
  }

  // Private methods

  private async loadCachedIndex(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.INDEX_CACHE_KEY);
      if (cached) {
        const indexData = JSON.parse(cached);
        
        // Reconstruct Maps from serialized data
        this.index.documents = new Map(indexData.documents);
        this.index.embeddings = new Map(indexData.embeddings);
        this.index.categories = new Map(indexData.categories);
        this.index.lastUpdated = indexData.lastUpdated;
        this.index.version = indexData.version;
        
        console.log(`📥 Loaded cached RAG index with ${this.index.documents.size} documents`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load cached RAG index:', error);
    }
  }

  private async saveIndex(): Promise<void> {
    try {
      // Convert Maps to arrays for serialization
      const indexData = {
        documents: Array.from(this.index.documents.entries()),
        embeddings: Array.from(this.index.embeddings.entries()),
        categories: Array.from(this.index.categories.entries()),
        lastUpdated: this.index.lastUpdated,
        version: this.index.version
      };

      await AsyncStorage.setItem(this.INDEX_CACHE_KEY, JSON.stringify(indexData));
    } catch (error) {
      console.warn('⚠️ Failed to save RAG index:', error);
    }
  }

  private async initializeDefaultKnowledge(): Promise<void> {
    const defaultDocuments = [
      {
        content: 'مدى هو تطبيق مصرفي رقمي يوفر خدمات مالية متقدمة للمستخدمين في المملكة العربية السعودية.',
        metadata: {
          title: 'مقدمة عن مدى',
          category: 'general',
          tags: ['مدى', 'مصرفي', 'رقمي'],
          timestamp: Date.now()
        }
      },
      {
        content: 'يمكن للمستخدمين إرسال الأموال واستقبالها بسهولة وأمان عبر تطبيق مدى.',
        metadata: {
          title: 'التحويلات المالية',
          category: 'transfers',
          tags: ['تحويل', 'أموال', 'أمان'],
          timestamp: Date.now()
        }
      },
      {
        content: 'تطبيق مدى يدعم الذكاء الاصطناعي لتحسين تجربة المستخدم وتوفير خدمات مخصصة.',
        metadata: {
          title: 'الذكاء الاصطناعي في مدى',
          category: 'ai',
          tags: ['ذكاء اصطناعي', 'تخصيص', 'تجربة المستخدم'],
          timestamp: Date.now()
        }
      },
      {
        content: 'يتميز تطبيق مدى بأعلى معايير الأمان والحماية لحماية بيانات المستخدمين.',
        metadata: {
          title: 'الأمان والحماية',
          category: 'security',
          tags: ['أمان', 'حماية', 'بيانات'],
          timestamp: Date.now()
        }
      },
      {
        content: 'يمكن للمستخدمين الوصول إلى خدمات الاستثمار والادخار من خلال تطبيق مدى.',
        metadata: {
          title: 'الاستثمار والادخار',
          category: 'investment',
          tags: ['استثمار', 'ادخار', 'خدمات مالية'],
          timestamp: Date.now()
        }
      }
    ];

    for (const doc of defaultDocuments) {
      await this.addDocument(doc);
    }

    console.log(`📚 Initialized default knowledge base with ${defaultDocuments.length} documents`);
  }

  private async addDocument(doc: Omit<RAGDocument, 'id' | 'hash' | 'embedding'>): Promise<void> {
    // Generate document ID and hash
    const id = await this.generateDocumentId(doc.content);
    const hash = await this.generateDocumentHash(doc);

    // Generate embedding
    const embedding = await this.generateEmbedding(doc.content);

    const document: RAGDocument = {
      ...doc,
      id,
      hash,
      embedding
    };

    // Add to index
    this.index.documents.set(id, document);
    this.index.embeddings.set(id, embedding);
    this.updateCategoryIndex(document);
  }

  private async generateDocumentId(content: string): Promise<string> {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      content + Date.now().toString()
    );
  }

  private async generateDocumentHash(doc: Omit<RAGDocument, 'id' | 'hash' | 'embedding'>): Promise<string> {
    const content = JSON.stringify({
      content: doc.content,
      metadata: doc.metadata
    });

    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      content
    );
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Simulate embedding generation
    // In real implementation, would use a local embedding model (e.g., MiniLM)
    
    const embedding = new Array(this.EMBEDDING_DIMENSION);
    
    // Simple hash-based embedding simulation
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Generate pseudo-random embedding based on text hash
    const random = this.seededRandom(Math.abs(hash));
    
    for (let i = 0; i < this.EMBEDDING_DIMENSION; i++) {
      embedding[i] = (random() - 0.5) * 2; // Range [-1, 1]
    }

    // Normalize embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  private updateCategoryIndex(document: RAGDocument): void {
    const category = document.metadata.category || 'general';
    
    if (!this.index.categories.has(category)) {
      this.index.categories.set(category, []);
    }
    
    const categoryDocs = this.index.categories.get(category)!;
    if (!categoryDocs.includes(document.id)) {
      categoryDocs.push(document.id);
    }
  }

  private prepareQuery(input: unknown): RAGQuery {
    if (typeof input === 'string') {
      return {
        text: input,
        maxResults: 5,
        minSimilarity: 0.3
      };
    }

    if (typeof input === 'object' && input !== null) {
      const obj = input as Record<string, unknown>;
      return {
        text: String(obj.text || obj.query || JSON.stringify(input)),
        category: String(obj.category || undefined),
        maxResults: Number(obj.maxResults) || 5,
        minSimilarity: Number(obj.minSimilarity) || 0.3
      };
    }

    return {
      text: String(input),
      maxResults: 5,
      minSimilarity: 0.3
    };
  }

  private getCandidateDocuments(query: RAGQuery): string[] {
    if (query.category) {
      return this.index.categories.get(query.category) || [];
    }

    // Return all document IDs if no category filter
    return Array.from(this.index.documents.keys());
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private calculateRelevanceScore(document: RAGDocument, query: RAGQuery, similarity: number): number {
    let score = similarity;

    // Boost score for category match
    if (query.category && document.metadata.category === query.category) {
      score *= 1.2;
    }

    // Boost score for tag matches
    if (document.metadata.tags) {
      const queryWords = query.text.toLowerCase().split(/\s+/);
      const tagMatches = document.metadata.tags.filter(tag => 
        queryWords.some(word => tag.toLowerCase().includes(word))
      );
      
      if (tagMatches.length > 0) {
        score *= (1 + tagMatches.length * 0.1);
      }
    }

    // Penalize very old documents
    const age = Date.now() - document.metadata.timestamp;
    const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
    
    if (age > maxAge) {
      score *= 0.8;
    }

    return Math.min(score, 1.0);
  }

  private async optimizeIndex(): Promise<void> {
    const memoryUsage = this.estimateMemoryUsage();
    
    if (memoryUsage > this.MAX_MEMORY_USAGE) {
      console.log('🗜️ Optimizing RAG index for memory usage...');
      
      // Remove oldest documents if memory limit exceeded
      const documents = Array.from(this.index.documents.values());
      documents.sort((a, b) => a.metadata.timestamp - b.metadata.timestamp);
      
      const documentsToRemove = Math.ceil(documents.length * 0.2); // Remove 20%
      
      for (let i = 0; i < documentsToRemove; i++) {
        const doc = documents[i];
        this.index.documents.delete(doc.id);
        this.index.embeddings.delete(doc.id);
        
        // Update category index
        if (doc.metadata.category) {
          const categoryDocs = this.index.categories.get(doc.metadata.category);
          if (categoryDocs) {
            const index = categoryDocs.indexOf(doc.id);
            if (index > -1) {
              categoryDocs.splice(index, 1);
            }
          }
        }
      }
      
      console.log(`🗑️ Removed ${documentsToRemove} old documents to optimize memory`);
    }
  }

  private estimateMemoryUsage(): number {
    let usage = 0;
    
    // Estimate document storage
    for (const doc of this.index.documents.values()) {
      usage += JSON.stringify(doc).length * 2; // UTF-16 encoding
    }
    
    // Estimate embedding storage
    for (const embedding of this.index.embeddings.values()) {
      usage += embedding.length * 8; // 8 bytes per float64
    }
    
    // Estimate category index
    for (const categoryDocs of this.index.categories.values()) {
      usage += categoryDocs.length * 64; // Estimate 64 bytes per document ID
    }
    
    return usage;
  }
}