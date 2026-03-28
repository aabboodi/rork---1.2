import { 
  SavingCircle, 
  CircleMember, 
  CircleInvitation, 
  CircleContribution, 
  CirclePayout,
  CircleDefault,
  CircleImmutableSettings 
} from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoService from '@/services/security/CryptoService';

class SavingCircleService {
  private static instance: SavingCircleService;
  private readonly CIRCLES_KEY = 'saving_circles';
  private readonly INVITATIONS_KEY = 'circle_invitations';
  private readonly CONTRIBUTIONS_KEY = 'circle_contributions';
  private readonly PAYOUTS_KEY = 'circle_payouts';
  private readonly cryptoService = CryptoService.getInstance();

  static getInstance(): SavingCircleService {
    if (!SavingCircleService.instance) {
      SavingCircleService.instance = new SavingCircleService();
    }
    return SavingCircleService.instance;
  }

  // Create new saving circle
  async createSavingCircle(
    adminId: string,
    name: string,
    monthlyContribution: number,
    currency: string,
    gracePeriodDays: number = 3,
    memberPhoneNumbers: string[]
  ): Promise<{ success: boolean; circle?: SavingCircle; error?: string }> {
    try {
      if (memberPhoneNumbers.length < 2) {
        return { success: false, error: 'At least 2 members required' };
      }

      if (memberPhoneNumbers.length > 12) {
        return { success: false, error: 'Maximum 12 members allowed' };
      }

      const circleId = `circle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = Date.now();

      // Create immutable settings hash
      const immutableData = {
        monthlyContribution,
        currency,
        totalMembers: memberPhoneNumbers.length + 1, // +1 for admin
        gracePeriod: gracePeriodDays,
        memberList: [adminId, ...memberPhoneNumbers],
        createdAt: now
      };
      
      const settingsHash = await this.cryptoService.hash(JSON.stringify(immutableData));

      const immutableSettings: CircleImmutableSettings = {
        ...immutableData,
        settingsHash
      };

      const circle: SavingCircle = {
        id: circleId,
        name,
        adminId,
        members: [
          {
            userId: adminId,
            displayName: 'Admin', // Would be fetched from user service
            phoneNumber: '', // Would be fetched from user service
            profilePicture: '',
            joinedAt: now,
            status: 'active',
            hasReceivedPayout: false,
            contributionHistory: [],
            defaultHistory: []
          }
        ],
        monthlyContribution,
        currency,
        totalMembers: memberPhoneNumbers.length + 1,
        currentCycle: 1,
        totalCycles: memberPhoneNumbers.length + 1,
        status: 'pending',
        gracePeriod: gracePeriodDays,
        createdAt: now,
        rules: {
          autoDebitEnabled: true,
          debitDate: 1, // 1st of each month
          gracePeriodDays,
          defaultAction: 'remove_member',
          allowEarlyExit: false,
          requireUnanimousDecision: true
        },
        immutableSettings,
        payoutOrder: [],
        nextPayoutDate: this.calculateNextPayoutDate(),
        totalContributed: 0,
        totalPaidOut: 0
      };

      // Store circle
      const circles = await this.getSavingCircles();
      circles.push(circle);
      await AsyncStorage.setItem(this.CIRCLES_KEY, JSON.stringify(circles));

      // Send invitations to members
      for (const phoneNumber of memberPhoneNumbers) {
        await this.sendCircleInvitation(circleId, phoneNumber, adminId);
      }

      return { success: true, circle };
    } catch (error) {
      console.error('Error creating saving circle:', error);
      return { success: false, error: 'Failed to create saving circle' };
    }
  }

  // Send circle invitation
  async sendCircleInvitation(
    circleId: string,
    phoneNumber: string,
    invitedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const invitations = await this.getCircleInvitations();
      
      const invitation: CircleInvitation = {
        id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        circleId,
        phoneNumber,
        invitedBy,
        status: 'pending',
        createdAt: Date.now(),
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
      };

      invitations.push(invitation);
      await AsyncStorage.setItem(this.INVITATIONS_KEY, JSON.stringify(invitations));

      // In a real app, this would send SMS/push notification
      console.log(`Invitation sent to ${phoneNumber} for circle ${circleId}`);

      return { success: true };
    } catch (error) {
      console.error('Error sending invitation:', error);
      return { success: false, error: 'Failed to send invitation' };
    }
  }

  // Accept circle invitation
  async acceptCircleInvitation(
    invitationId: string,
    userId: string,
    displayName: string,
    phoneNumber: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const invitations = await this.getCircleInvitations();
      const invitation = invitations.find(inv => inv.id === invitationId);

      if (!invitation) {
        return { success: false, error: 'Invitation not found' };
      }

      if (invitation.status !== 'pending') {
        return { success: false, error: 'Invitation already processed' };
      }

      if (invitation.expiresAt < Date.now()) {
        return { success: false, error: 'Invitation expired' };
      }

      // Add member to circle
      const circles = await this.getSavingCircles();
      const circle = circles.find(c => c.id === invitation.circleId);

      if (!circle) {
        return { success: false, error: 'Circle not found' };
      }

      const newMember: CircleMember = {
        userId,
        displayName,
        phoneNumber,
        profilePicture: '',
        joinedAt: Date.now(),
        status: 'active',
        hasReceivedPayout: false,
        contributionHistory: [],
        defaultHistory: []
      };

      circle.members.push(newMember);

      // Update invitation status
      invitation.status = 'accepted';
      invitation.acceptedAt = Date.now();

      // Check if all members have joined
      if (circle.members.length === circle.totalMembers) {
        circle.status = 'active';
        circle.payoutOrder = this.generatePayoutOrder(circle.members);
        circle.nextPayoutDate = this.calculateNextPayoutDate();
      }

      // Save updates
      await AsyncStorage.setItem(this.CIRCLES_KEY, JSON.stringify(circles));
      await AsyncStorage.setItem(this.INVITATIONS_KEY, JSON.stringify(invitations));

      return { success: true };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return { success: false, error: 'Failed to accept invitation' };
    }
  }

  // Process monthly contribution
  async processContribution(
    circleId: string,
    userId: string,
    amount: number,
    paymentMethod: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const circles = await this.getSavingCircles();
      const circle = circles.find(c => c.id === circleId);

      if (!circle) {
        return { success: false, error: 'Circle not found' };
      }

      if (circle.status !== 'active') {
        return { success: false, error: 'Circle is not active' };
      }

      const member = circle.members.find(m => m.userId === userId);
      if (!member) {
        return { success: false, error: 'Member not found in circle' };
      }

      if (amount !== circle.monthlyContribution) {
        return { success: false, error: 'Invalid contribution amount' };
      }

      const contribution: CircleContribution = {
        id: `cont_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        circleId,
        userId,
        amount,
        currency: circle.currency,
        cycle: circle.currentCycle,
        paymentMethod,
        status: 'completed',
        createdAt: Date.now(),
        processedAt: Date.now()
      };

      // Store contribution
      const contributions = await this.getCircleContributions();
      contributions.push(contribution);
      await AsyncStorage.setItem(this.CONTRIBUTIONS_KEY, JSON.stringify(contributions));

      // Update member contribution history
      member.contributionHistory.push({
        cycle: circle.currentCycle,
        amount,
        date: Date.now(),
        status: 'paid'
      });

      // Update circle totals
      circle.totalContributed += amount;

      // Check if all members have contributed for this cycle
      const currentCycleContributions = contributions.filter(
        c => c.circleId === circleId && c.cycle === circle.currentCycle
      );

      if (currentCycleContributions.length === circle.totalMembers) {
        await this.processCyclePayout(circle);
      }

      await AsyncStorage.setItem(this.CIRCLES_KEY, JSON.stringify(circles));

      return { success: true };
    } catch (error) {
      console.error('Error processing contribution:', error);
      return { success: false, error: 'Failed to process contribution' };
    }
  }

  // Process cycle payout
  private async processCyclePayout(circle: SavingCircle): Promise<void> {
    try {
      const currentPayoutMember = circle.payoutOrder[circle.currentCycle - 1];
      const payoutAmount = circle.monthlyContribution * circle.totalMembers;

      const payout: CirclePayout = {
        id: `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        circleId: circle.id,
        recipientId: currentPayoutMember.userId,
        amount: payoutAmount,
        currency: circle.currency,
        cycle: circle.currentCycle,
        status: 'completed',
        createdAt: Date.now(),
        processedAt: Date.now()
      };

      // Store payout
      const payouts = await this.getCirclePayouts();
      payouts.push(payout);
      await AsyncStorage.setItem(this.PAYOUTS_KEY, JSON.stringify(payouts));

      // Update member status
      const member = circle.members.find(m => m.userId === currentPayoutMember.userId);
      if (member) {
        member.hasReceivedPayout = true;
      }

      // Update circle
      circle.totalPaidOut += payoutAmount;
      circle.currentCycle += 1;

      if (circle.currentCycle > circle.totalCycles) {
        circle.status = 'completed';
      } else {
        circle.nextPayoutDate = this.calculateNextPayoutDate();
      }

      console.log(`Payout of ${payoutAmount} ${circle.currency} sent to ${currentPayoutMember.displayName}`);
    } catch (error) {
      console.error('Error processing payout:', error);
    }
  }

  // Handle member default
  async handleMemberDefault(
    circleId: string,
    userId: string,
    cycle: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const circles = await this.getSavingCircles();
      const circle = circles.find(c => c.id === circleId);

      if (!circle) {
        return { success: false, error: 'Circle not found' };
      }

      const member = circle.members.find(m => m.userId === userId);
      if (!member) {
        return { success: false, error: 'Member not found' };
      }

      const defaultRecord: CircleDefault = {
        id: `def_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        circleId,
        userId,
        cycle,
        amount: circle.monthlyContribution,
        currency: circle.currency,
        reason: 'missed_payment',
        status: 'active',
        createdAt: Date.now(),
        gracePeriodEnds: Date.now() + (circle.gracePeriod * 24 * 60 * 60 * 1000)
      };

      // Update member status
      member.status = 'defaulted';
      member.defaultHistory.push({
        cycle,
        amount: circle.monthlyContribution,
        date: Date.now(),
        status: 'defaulted'
      });

      // Apply default action based on circle rules
      if (circle.rules.defaultAction === 'remove_member') {
        member.status = 'removed';
        // Recalculate circle dynamics
        await this.recalculateCircleAfterRemoval(circle, userId);
      }

      await AsyncStorage.setItem(this.CIRCLES_KEY, JSON.stringify(circles));

      return { success: true };
    } catch (error) {
      console.error('Error handling member default:', error);
      return { success: false, error: 'Failed to handle member default' };
    }
  }

  // Get user's saving circles
  async getUserSavingCircles(userId: string): Promise<SavingCircle[]> {
    try {
      const circles = await this.getSavingCircles();
      return circles.filter(circle => 
        circle.members.some(member => member.userId === userId) ||
        circle.adminId === userId
      );
    } catch (error) {
      console.error('Error getting user circles:', error);
      return [];
    }
  }

  // Get circle details
  async getCircleDetails(circleId: string): Promise<SavingCircle | null> {
    try {
      const circles = await this.getSavingCircles();
      return circles.find(circle => circle.id === circleId) || null;
    } catch (error) {
      console.error('Error getting circle details:', error);
      return null;
    }
  }

  // Private helper methods
  private async getSavingCircles(): Promise<SavingCircle[]> {
    try {
      const data = await AsyncStorage.getItem(this.CIRCLES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting saving circles:', error);
      return [];
    }
  }

  private async getCircleInvitations(): Promise<CircleInvitation[]> {
    try {
      const data = await AsyncStorage.getItem(this.INVITATIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting invitations:', error);
      return [];
    }
  }

  private async getCircleContributions(): Promise<CircleContribution[]> {
    try {
      const data = await AsyncStorage.getItem(this.CONTRIBUTIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting contributions:', error);
      return [];
    }
  }

  private async getCirclePayouts(): Promise<CirclePayout[]> {
    try {
      const data = await AsyncStorage.getItem(this.PAYOUTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting payouts:', error);
      return [];
    }
  }

  private generatePayoutOrder(members: CircleMember[]): CircleMember[] {
    // Shuffle members for random payout order
    const shuffled = [...members];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private calculateNextPayoutDate(): number {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.getTime();
  }

  private async recalculateCircleAfterRemoval(circle: SavingCircle, removedUserId: string): Promise<void> {
    // Remove member from payout order
    circle.payoutOrder = circle.payoutOrder.filter(member => member.userId !== removedUserId);
    
    // Recalculate total members and cycles
    const activeMembers = circle.members.filter(m => m.status === 'active');
    circle.totalMembers = activeMembers.length;
    circle.totalCycles = activeMembers.length;
    
    // If current cycle is beyond new total, complete the circle
    if (circle.currentCycle > circle.totalCycles) {
      circle.status = 'completed';
    }
  }
}

export default SavingCircleService;