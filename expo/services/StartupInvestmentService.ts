import { 
  Startup, 
  Investment, 
  InvestmentPerformance, 
  StartupPerformanceMetrics,
  MonthlyMetric,
  InvestmentExit 
} from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

class StartupInvestmentService {
  private static instance: StartupInvestmentService;
  private readonly STARTUPS_KEY = 'startups';
  private readonly INVESTMENTS_KEY = 'investments';
  private readonly PERFORMANCE_KEY = 'investment_performance';

  static getInstance(): StartupInvestmentService {
    if (!StartupInvestmentService.instance) {
      StartupInvestmentService.instance = new StartupInvestmentService();
    }
    return StartupInvestmentService.instance;
  }

  // Get all available startups for investment
  async getAvailableStartups(): Promise<Startup[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STARTUPS_KEY);
      const startups: Startup[] = stored ? JSON.parse(stored) : this.getMockStartups();
      
      // Filter only active startups accepting investments
      return startups.filter(startup => 
        startup.status === 'active' && 
        startup.currentFunding < startup.targetFunding
      );
    } catch (error) {
      console.error('Failed to get available startups:', error);
      return [];
    }
  }

  // Get startup by ID with detailed information
  async getStartupById(startupId: string): Promise<Startup | null> {
    try {
      const startups = await this.getAllStartups();
      return startups.find(startup => startup.id === startupId) || null;
    } catch (error) {
      console.error('Failed to get startup by ID:', error);
      return null;
    }
  }

  // Create investment in startup
  async createInvestment(
    investorId: string,
    startupId: string,
    amount: number,
    currency: string = 'USD'
  ): Promise<{ success: boolean; investment?: Investment; error?: string }> {
    try {
      const startup = await this.getStartupById(startupId);
      if (!startup) {
        return { success: false, error: 'Startup not found' };
      }

      if (startup.status !== 'active') {
        return { success: false, error: 'Startup is not accepting investments' };
      }

      if (amount < startup.minimumInvestment) {
        return { success: false, error: `Minimum investment is ${startup.minimumInvestment} ${currency}` };
      }

      if (startup.maximumInvestment && amount > startup.maximumInvestment) {
        return { success: false, error: `Maximum investment is ${startup.maximumInvestment} ${currency}` };
      }

      // Calculate equity percentage based on current valuation
      const latestValuation = startup.valuationHistory[startup.valuationHistory.length - 1];
      const equityPercentage = latestValuation ? (amount / latestValuation.valuation) * 100 : 0;

      const investment: Investment = {
        id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        investorId,
        startupId,
        amount,
        currency,
        investmentDate: Date.now(),
        securityType: startup.investmentTerms.securityType,
        equityPercentage,
        sharePrice: latestValuation ? latestValuation.valuation / 1000000 : 1, // Assuming 1M shares
        numberOfShares: latestValuation ? amount / (latestValuation.valuation / 1000000) : amount,
        status: 'confirmed',
        investmentTerms: startup.investmentTerms,
        documents: [],
        performanceTracking: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Save investment
      await this.saveInvestment(investment);

      // Update startup funding
      startup.currentFunding += amount;
      startup.investorCount += 1;
      startup.updatedAt = Date.now();
      await this.saveStartup(startup);

      // Create initial performance record
      await this.createInitialPerformanceRecord(investment);

      return { success: true, investment };
    } catch (error) {
      console.error('Failed to create investment:', error);
      return { success: false, error: 'Failed to create investment' };
    }
  }

  // Get user's investments
  async getUserInvestments(userId: string): Promise<Investment[]> {
    try {
      const allInvestments = await this.getAllInvestments();
      return allInvestments.filter(inv => inv.investorId === userId);
    } catch (error) {
      console.error('Failed to get user investments:', error);
      return [];
    }
  }

  // Get investment performance tracking
  async getInvestmentPerformance(investmentId: string): Promise<InvestmentPerformance[]> {
    try {
      const stored = await AsyncStorage.getItem(`${this.PERFORMANCE_KEY}_${investmentId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get investment performance:', error);
      return [];
    }
  }

  // Update investment performance (monthly)
  async updateInvestmentPerformance(
    investmentId: string,
    currentValuation: number,
    currency: string = 'USD'
  ): Promise<void> {
    try {
      const investment = await this.getInvestmentById(investmentId);
      if (!investment) return;

      const startup = await this.getStartupById(investment.startupId);
      if (!startup) return;

      const now = Date.now();
      const returnOnInvestment = ((currentValuation - investment.amount) / investment.amount) * 100;
      const unrealizedGain = currentValuation - investment.amount;

      const performance: InvestmentPerformance = {
        id: `perf_${now}_${Math.random().toString(36).substr(2, 9)}`,
        investmentId,
        reportDate: now,
        currentValuation,
        currency,
        returnOnInvestment,
        unrealizedGain,
        dividendsReceived: 0, // Would be calculated based on actual dividends
        totalReturn: unrealizedGain,
        performanceNotes: `Monthly performance update for ${startup.name}`,
        marketComparables: {
          industryAverage: 15.5, // Mock data
          marketIndex: 12.3,
          peerComparison: 18.7
        }
      };

      // Save performance record
      const existingPerformance = await this.getInvestmentPerformance(investmentId);
      existingPerformance.push(performance);
      
      await AsyncStorage.setItem(
        `${this.PERFORMANCE_KEY}_${investmentId}`,
        JSON.stringify(existingPerformance)
      );

      // Update investment record
      investment.performanceTracking.push(performance);
      investment.updatedAt = now;
      await this.saveInvestment(investment);
    } catch (error) {
      console.error('Failed to update investment performance:', error);
    }
  }

  // Get startup performance metrics
  async getStartupPerformanceMetrics(startupId: string): Promise<StartupPerformanceMetrics | null> {
    try {
      const startup = await this.getStartupById(startupId);
      if (!startup) return null;

      return startup.performanceMetrics;
    } catch (error) {
      console.error('Failed to get startup performance metrics:', error);
      return null;
    }
  }

  // Calculate portfolio performance
  async calculatePortfolioPerformance(userId: string): Promise<{
    totalInvested: number;
    currentValue: number;
    totalReturn: number;
    returnPercentage: number;
    unrealizedGains: number;
    realizedGains: number;
    dividends: number;
    activeInvestments: number;
    exitedInvestments: number;
  }> {
    try {
      const investments = await this.getUserInvestments(userId);
      
      let totalInvested = 0;
      let currentValue = 0;
      let realizedGains = 0;
      let dividends = 0;
      let activeInvestments = 0;
      let exitedInvestments = 0;

      for (const investment of investments) {
        totalInvested += investment.amount;
        
        if (investment.status === 'exited' && investment.exitDetails) {
          realizedGains += investment.exitDetails.totalReturn;
          exitedInvestments++;
        } else if (investment.status === 'active') {
          // Get latest performance
          const performance = await this.getInvestmentPerformance(investment.id);
          if (performance.length > 0) {
            const latest = performance[performance.length - 1];
            currentValue += latest.currentValuation;
            dividends += latest.dividendsReceived;
          } else {
            currentValue += investment.amount; // No performance data, use original amount
          }
          activeInvestments++;
        }
      }

      const unrealizedGains = currentValue - (totalInvested - realizedGains);
      const totalReturn = realizedGains + unrealizedGains + dividends;
      const returnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

      return {
        totalInvested,
        currentValue: currentValue + realizedGains,
        totalReturn,
        returnPercentage,
        unrealizedGains,
        realizedGains,
        dividends,
        activeInvestments,
        exitedInvestments
      };
    } catch (error) {
      console.error('Failed to calculate portfolio performance:', error);
      return {
        totalInvested: 0,
        currentValue: 0,
        totalReturn: 0,
        returnPercentage: 0,
        unrealizedGains: 0,
        realizedGains: 0,
        dividends: 0,
        activeInvestments: 0,
        exitedInvestments: 0
      };
    }
  }

  // Process investment exit
  async processInvestmentExit(
    investmentId: string,
    exitDetails: InvestmentExit
  ): Promise<boolean> {
    try {
      const investment = await this.getInvestmentById(investmentId);
      if (!investment) return false;

      investment.status = 'exited';
      investment.exitDetails = exitDetails;
      investment.updatedAt = Date.now();

      await this.saveInvestment(investment);
      return true;
    } catch (error) {
      console.error('Failed to process investment exit:', error);
      return false;
    }
  }

  // Private helper methods
  private async createInitialPerformanceRecord(investment: Investment): Promise<void> {
    const initialPerformance: InvestmentPerformance = {
      id: `perf_initial_${investment.id}`,
      investmentId: investment.id,
      reportDate: investment.investmentDate,
      currentValuation: investment.amount,
      currency: investment.currency,
      returnOnInvestment: 0,
      unrealizedGain: 0,
      dividendsReceived: 0,
      totalReturn: 0,
      performanceNotes: 'Initial investment record'
    };

    await AsyncStorage.setItem(
      `${this.PERFORMANCE_KEY}_${investment.id}`,
      JSON.stringify([initialPerformance])
    );
  }

  private async getAllStartups(): Promise<Startup[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STARTUPS_KEY);
      return stored ? JSON.parse(stored) : this.getMockStartups();
    } catch (error) {
      console.error('Failed to get all startups:', error);
      return [];
    }
  }

  private async saveStartup(startup: Startup): Promise<void> {
    try {
      const allStartups = await this.getAllStartups();
      const index = allStartups.findIndex(s => s.id === startup.id);
      
      if (index >= 0) {
        allStartups[index] = startup;
      } else {
        allStartups.push(startup);
      }
      
      await AsyncStorage.setItem(this.STARTUPS_KEY, JSON.stringify(allStartups));
    } catch (error) {
      console.error('Failed to save startup:', error);
    }
  }

  private async getAllInvestments(): Promise<Investment[]> {
    try {
      const stored = await AsyncStorage.getItem(this.INVESTMENTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get all investments:', error);
      return [];
    }
  }

  private async saveInvestment(investment: Investment): Promise<void> {
    try {
      const allInvestments = await this.getAllInvestments();
      const index = allInvestments.findIndex(inv => inv.id === investment.id);
      
      if (index >= 0) {
        allInvestments[index] = investment;
      } else {
        allInvestments.push(investment);
      }
      
      await AsyncStorage.setItem(this.INVESTMENTS_KEY, JSON.stringify(allInvestments));
    } catch (error) {
      console.error('Failed to save investment:', error);
    }
  }

  private async getInvestmentById(investmentId: string): Promise<Investment | null> {
    const allInvestments = await this.getAllInvestments();
    return allInvestments.find(inv => inv.id === investmentId) || null;
  }

  // Mock data for demonstration
  private getMockStartups(): Startup[] {
    return [
      {
        id: 'startup_1',
        name: 'TechFlow AI',
        description: 'AI-powered workflow automation platform for businesses',
        industry: 'Artificial Intelligence',
        foundedYear: 2022,
        founders: [
          {
            id: 'founder_1',
            name: 'أحمد محمد',
            role: 'CEO & Co-Founder',
            bio: 'Former Google AI researcher with 10+ years experience',
            profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
            linkedin: 'https://linkedin.com/in/ahmed-mohamed',
            previousExperience: ['Google AI', 'Microsoft Research', 'Stanford AI Lab'],
            education: ['PhD Computer Science - Stanford', 'MS AI - MIT']
          }
        ],
        businessModel: 'SaaS subscription with enterprise licensing',
        marketPosition: 'Early stage with strong product-market fit',
        mission: 'Democratize AI automation for businesses of all sizes',
        vision: 'Become the leading AI workflow platform globally',
        headquarters: 'Dubai, UAE',
        employeeCount: '15-25',
        website: 'https://techflow.ai',
        logo: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=200&h=200&fit=crop',
        coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop',
        tags: ['AI', 'Automation', 'SaaS', 'Enterprise'],
        status: 'active',
        riskLevel: 'medium',
        minimumInvestment: 1000,
        maximumInvestment: 50000,
        targetFunding: 2000000,
        currentFunding: 750000,
        investorCount: 45,
        valuationHistory: [
          {
            id: 'val_1',
            startupId: 'startup_1',
            valuation: 8000000,
            currency: 'USD',
            valuationDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
            valuationMethod: 'venture_capital',
            valuationRound: 'Seed',
            leadInvestor: 'MENA Ventures'
          }
        ],
        financialDocuments: [
          {
            id: 'doc_1',
            startupId: 'startup_1',
            documentType: 'pitch_deck',
            title: 'TechFlow AI - Series A Pitch Deck',
            fileUrl: 'https://example.com/pitch-deck.pdf',
            fileName: 'techflow-pitch-deck.pdf',
            fileSize: 2500000,
            uploadDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
            isPublic: true,
            accessLevel: 'public',
            documentHash: 'abc123def456'
          }
        ],
        investmentTerms: {
          startupId: 'startup_1',
          securityType: 'equity',
          equityPercentage: 15,
          dividendRights: false,
          votingRights: true,
          liquidationPreference: 1,
          antiDilutionProvision: 'weighted_average',
          informationRights: true,
          tagAlongRights: true,
          dragAlongRights: false,
          lockupPeriod: 12,
          minimumHoldingPeriod: 6
        },
        performanceMetrics: {
          startupId: 'startup_1',
          revenue: [
            { month: '2024-01', value: 25000, currency: 'USD' },
            { month: '2024-02', value: 32000, currency: 'USD' },
            { month: '2024-03', value: 41000, currency: 'USD' }
          ],
          users: [
            { month: '2024-01', value: 150 },
            { month: '2024-02', value: 220 },
            { month: '2024-03', value: 310 }
          ],
          growth: [
            { month: '2024-01', value: 15 },
            { month: '2024-02', value: 28 },
            { month: '2024-03', value: 28 }
          ],
          expenses: [
            { month: '2024-01', value: 45000, currency: 'USD' },
            { month: '2024-02', value: 48000, currency: 'USD' },
            { month: '2024-03', value: 52000, currency: 'USD' }
          ],
          burnRate: [
            { month: '2024-01', value: 20000, currency: 'USD' },
            { month: '2024-02', value: 16000, currency: 'USD' },
            { month: '2024-03', value: 11000, currency: 'USD' }
          ],
          runway: [
            { month: '2024-01', value: 18 },
            { month: '2024-02', value: 22 },
            { month: '2024-03', value: 28 }
          ],
          keyMetrics: {
            'Customer Acquisition Cost': [
              { month: '2024-01', value: 120, currency: 'USD' },
              { month: '2024-02', value: 95, currency: 'USD' },
              { month: '2024-03', value: 85, currency: 'USD' }
            ],
            'Monthly Recurring Revenue': [
              { month: '2024-01', value: 25000, currency: 'USD' },
              { month: '2024-02', value: 32000, currency: 'USD' },
              { month: '2024-03', value: 41000, currency: 'USD' }
            ]
          },
          lastUpdated: Date.now() - 7 * 24 * 60 * 60 * 1000
        },
        createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 7 * 24 * 60 * 60 * 1000
      }
    ];
  }
}

export default StartupInvestmentService;