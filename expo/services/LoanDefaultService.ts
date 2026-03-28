import { LoanDefault, DefaultReminder, DefaultResolution, Loan } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

class LoanDefaultService {
  private static instance: LoanDefaultService;
  private readonly STORAGE_KEY = 'loan_defaults';
  private readonly REMINDERS_KEY = 'default_reminders';
  private readonly GRACE_PERIOD_DAYS = 2;
  private readonly REMINDER_DAYS = [3, 2, 1]; // Days before debit to send reminders

  static getInstance(): LoanDefaultService {
    if (!LoanDefaultService.instance) {
      LoanDefaultService.instance = new LoanDefaultService();
    }
    return LoanDefaultService.instance;
  }

  // Check for insufficient funds and create default if needed
  async checkForDefault(loan: Loan, borrowerBalance: number): Promise<LoanDefault | null> {
    try {
      if (borrowerBalance >= loan.monthlyAmount) {
        return null; // Sufficient funds
      }

      const now = Date.now();
      const gracePeriodEnd = now + (this.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

      // Check if default already exists for this loan
      const existingDefault = await this.getDefaultByLoanId(loan.id);
      if (existingDefault && existingDefault.status === 'active') {
        return existingDefault;
      }

      // Create new default
      const loanDefault: LoanDefault = {
        loanId: loan.id,
        borrowerId: loan.borrowerId,
        lenderId: loan.lenderId,
        defaultDate: now,
        gracePeriodEnd,
        amount: loan.monthlyAmount,
        currency: loan.currency,
        status: 'active',
        reminders: [],
        visibilitySettings: {
          visibleToLenders: false, // Not visible until grace period ends
          visibleFromDate: gracePeriodEnd,
          canBeRemoved: false,
          removalEligibleDate: gracePeriodEnd + (3 * 24 * 60 * 60 * 1000) // 3 days after grace period
        }
      };

      await this.saveDefault(loanDefault);
      
      // Schedule reminders during grace period
      await this.scheduleGracePeriodReminders(loanDefault);

      return loanDefault;
    } catch (error) {
      console.error('Failed to check for default:', error);
      return null;
    }
  }

  // Schedule pre-debit reminders
  async schedulePreDebitReminders(loan: Loan): Promise<void> {
    try {
      const now = Date.now();
      const debitDate = loan.nextPaymentDate;

      for (const daysBefore of this.REMINDER_DAYS) {
        const reminderDate = debitDate - (daysBefore * 24 * 60 * 60 * 1000);
        
        if (reminderDate > now) {
          const reminder: DefaultReminder = {
            id: `reminder_${loan.id}_${daysBefore}d`,
            loanId: loan.id,
            reminderDate,
            reminderType: 'pre_debit',
            sent: false,
            method: 'in_app'
          };

          await this.saveReminder(reminder);
        }
      }
    } catch (error) {
      console.error('Failed to schedule pre-debit reminders:', error);
    }
  }

  // Schedule grace period reminders
  private async scheduleGracePeriodReminders(loanDefault: LoanDefault): Promise<void> {
    try {
      const gracePeriodStart = loanDefault.defaultDate;
      const gracePeriodEnd = loanDefault.gracePeriodEnd;
      const gracePeriodDuration = gracePeriodEnd - gracePeriodStart;

      // Send reminders at 25%, 50%, 75% of grace period
      const reminderPercentages = [0.25, 0.5, 0.75];

      for (const percentage of reminderPercentages) {
        const reminderDate = gracePeriodStart + (gracePeriodDuration * percentage);
        
        const reminder: DefaultReminder = {
          id: `grace_${loanDefault.loanId}_${percentage}`,
          loanId: loanDefault.loanId,
          reminderDate,
          reminderType: 'grace_period',
          sent: false,
          method: 'push_notification'
        };

        await this.saveReminder(reminder);
      }

      // Final notice at end of grace period
      const finalNotice: DefaultReminder = {
        id: `final_${loanDefault.loanId}`,
        loanId: loanDefault.loanId,
        reminderDate: gracePeriodEnd,
        reminderType: 'default_notice',
        sent: false,
        method: 'in_app'
      };

      await this.saveReminder(finalNotice);
    } catch (error) {
      console.error('Failed to schedule grace period reminders:', error);
    }
  }

  // Process pending reminders
  async processPendingReminders(): Promise<void> {
    try {
      const now = Date.now();
      const reminders = await this.getAllReminders();
      
      for (const reminder of reminders) {
        if (!reminder.sent && reminder.reminderDate <= now) {
          await this.sendReminder(reminder);
        }
      }
    } catch (error) {
      console.error('Failed to process pending reminders:', error);
    }
  }

  // Send reminder to borrower
  private async sendReminder(reminder: DefaultReminder): Promise<void> {
    try {
      // This would integrate with your notification system
      console.log(`Sending ${reminder.reminderType} reminder for loan ${reminder.loanId}`);
      
      // Mark as sent
      reminder.sent = true;
      reminder.sentAt = Date.now();
      
      await this.saveReminder(reminder);
    } catch (error) {
      console.error('Failed to send reminder:', error);
    }
  }

  // Finalize default after grace period
  async finalizeDefault(loanDefaultId: string): Promise<void> {
    try {
      const loanDefault = await this.getDefaultById(loanDefaultId);
      if (!loanDefault || loanDefault.status !== 'active') {
        return;
      }

      const now = Date.now();
      if (now < loanDefault.gracePeriodEnd) {
        return; // Grace period not yet ended
      }

      // Make default visible to lenders
      loanDefault.visibilitySettings.visibleToLenders = true;
      loanDefault.visibilitySettings.canBeRemoved = true;

      await this.saveDefault(loanDefault);
    } catch (error) {
      console.error('Failed to finalize default:', error);
    }
  }

  // Lender confirms payment received
  async lenderConfirmPayment(
    loanDefaultId: string, 
    lenderId: string, 
    paymentDetails: {
      amount: number;
      currency: string;
      paymentDate: number;
      method: string;
    }
  ): Promise<boolean> {
    try {
      const loanDefault = await this.getDefaultById(loanDefaultId);
      if (!loanDefault || loanDefault.lenderId !== lenderId) {
        return false;
      }

      const resolution: DefaultResolution = {
        resolvedAt: Date.now(),
        resolvedBy: 'lender_confirmation',
        resolverUserId: lenderId,
        notes: 'Payment confirmed by lender',
        paymentConfirmation: paymentDetails
      };

      loanDefault.status = 'resolved';
      loanDefault.resolution = resolution;

      await this.saveDefault(loanDefault);
      return true;
    } catch (error) {
      console.error('Failed to confirm payment:', error);
      return false;
    }
  }

  // Lender requests default removal
  async lenderRequestRemoval(
    loanDefaultId: string, 
    lenderId: string, 
    notes?: string
  ): Promise<boolean> {
    try {
      const loanDefault = await this.getDefaultById(loanDefaultId);
      if (!loanDefault || loanDefault.lenderId !== lenderId) {
        return false;
      }

      const now = Date.now();
      if (now < loanDefault.visibilitySettings.removalEligibleDate) {
        return false; // Not yet eligible for removal
      }

      const resolution: DefaultResolution = {
        resolvedAt: now,
        resolvedBy: 'lender_removal',
        resolverUserId: lenderId,
        notes: notes || 'Default removed by lender'
      };

      loanDefault.status = 'resolved';
      loanDefault.resolution = resolution;

      await this.saveDefault(loanDefault);
      return true;
    } catch (error) {
      console.error('Failed to request removal:', error);
      return false;
    }
  }

  // Get defaults for a borrower (visible to lenders)
  async getBorrowerDefaults(borrowerId: string): Promise<LoanDefault[]> {
    try {
      const allDefaults = await this.getAllDefaults();
      const now = Date.now();
      
      return allDefaults.filter(def => 
        def.borrowerId === borrowerId && 
        def.status === 'active' &&
        def.visibilitySettings.visibleToLenders &&
        now >= def.visibilitySettings.visibleFromDate
      );
    } catch (error) {
      console.error('Failed to get borrower defaults:', error);
      return [];
    }
  }

  // Get defaults for a lender
  async getLenderDefaults(lenderId: string): Promise<LoanDefault[]> {
    try {
      const allDefaults = await this.getAllDefaults();
      
      return allDefaults.filter(def => 
        def.lenderId === lenderId && 
        def.status === 'active'
      );
    } catch (error) {
      console.error('Failed to get lender defaults:', error);
      return [];
    }
  }

  // Storage methods
  private async saveDefault(loanDefault: LoanDefault): Promise<void> {
    try {
      const allDefaults = await this.getAllDefaults();
      const index = allDefaults.findIndex(def => def.loanId === loanDefault.loanId);
      
      if (index >= 0) {
        allDefaults[index] = loanDefault;
      } else {
        allDefaults.push(loanDefault);
      }
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(allDefaults));
    } catch (error) {
      console.error('Failed to save default:', error);
    }
  }

  private async getAllDefaults(): Promise<LoanDefault[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get all defaults:', error);
      return [];
    }
  }

  private async getDefaultById(id: string): Promise<LoanDefault | null> {
    const allDefaults = await this.getAllDefaults();
    return allDefaults.find(def => def.loanId === id) || null;
  }

  private async getDefaultByLoanId(loanId: string): Promise<LoanDefault | null> {
    const allDefaults = await this.getAllDefaults();
    return allDefaults.find(def => def.loanId === loanId) || null;
  }

  private async saveReminder(reminder: DefaultReminder): Promise<void> {
    try {
      const allReminders = await this.getAllReminders();
      const index = allReminders.findIndex(rem => rem.id === reminder.id);
      
      if (index >= 0) {
        allReminders[index] = reminder;
      } else {
        allReminders.push(reminder);
      }
      
      await AsyncStorage.setItem(this.REMINDERS_KEY, JSON.stringify(allReminders));
    } catch (error) {
      console.error('Failed to save reminder:', error);
    }
  }

  private async getAllReminders(): Promise<DefaultReminder[]> {
    try {
      const stored = await AsyncStorage.getItem(this.REMINDERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get all reminders:', error);
      return [];
    }
  }
}

export default LoanDefaultService;