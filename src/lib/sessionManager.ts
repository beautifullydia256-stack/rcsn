import { supabase } from './supabase';

export interface SessionConfig {
  timeoutMinutes: number;
  checkIntervalMinutes: number;
  storageKey: string;
}

export interface SessionData {
  lastActivity: number;
  currentPath: string;
  isActive: boolean;
}

const DEFAULT_CONFIG: SessionConfig = {
  timeoutMinutes: 60, // 1 hour
  checkIntervalMinutes: 1, // Check every minute
  storageKey: 'pwezacore_session'
};

class SessionManager {
  private config: SessionConfig;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();
  private currentPath: string = '/';

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeSession();
  }

  private initializeSession() {
    // Load existing session data
    const savedSession = this.getSessionData();
    if (savedSession) {
      this.lastActivity = savedSession.lastActivity;
      this.currentPath = savedSession.currentPath;
    }

    // Start monitoring
    this.startMonitoring();
    
    // Track user activity
    this.trackActivity();
  }

  private getSessionData(): SessionData | null {
    try {
      const data = localStorage.getItem(this.config.storageKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading session data:', error);
      return null;
    }
  }

  private saveSessionData() {
    try {
      const sessionData: SessionData = {
        lastActivity: this.lastActivity,
        currentPath: this.currentPath,
        isActive: true
      };
      localStorage.setItem(this.config.storageKey, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Error saving session data:', error);
    }
  }

  private startMonitoring() {
    // Clear existing interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Check session every minute
    this.checkInterval = setInterval(() => {
      this.checkSession();
    }, this.config.checkIntervalMinutes * 60 * 1000);
  }

  private async checkSession() {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivity;
    const timeoutMs = this.config.timeoutMinutes * 60 * 1000;

    if (timeSinceLastActivity >= timeoutMs) {
      console.log('Session timeout detected, logging out user');
      await this.handleSessionTimeout();
    }
  }

  private async handleSessionTimeout() {
    // Save current path before logout
    this.saveCurrentPath();
    
    // Sign out user
    await supabase.auth.signOut();
    
    // Clear session data
    this.clearSessionData();
    
    // Redirect to login with return URL
    const returnUrl = encodeURIComponent(this.currentPath);
    window.location.href = `/login?returnUrl=${returnUrl}`;
  }

  public trackActivity() {
    // Update last activity time
    this.lastActivity = Date.now();
    this.saveSessionData();

    // Add event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const activityHandler = () => {
      this.lastActivity = Date.now();
      this.saveSessionData();
    };

    events.forEach(event => {
      document.addEventListener(event, activityHandler, true);
    });

    // Cleanup function
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, activityHandler, true);
      });
    };
  }

  public updateCurrentPath(path: string) {
    this.currentPath = path;
    this.saveSessionData();
  }

  public saveCurrentPath() {
    this.currentPath = window.location.pathname + window.location.search;
    this.saveSessionData();
  }

  public getReturnUrl(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('returnUrl');
  }

  public clearReturnUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete('returnUrl');
    window.history.replaceState({}, '', url.toString());
  }

  public async redirectToReturnUrl() {
    const returnUrl = this.getReturnUrl();
    if (returnUrl) {
      this.clearReturnUrl();
      window.location.href = decodeURIComponent(returnUrl);
    } else {
      // Default redirect based on user role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const role = user.user_metadata?.role;
        if (role === 'student') {
          window.location.href = '/dashboard/student';
        } else if (role === 'admin') {
          window.location.href = '/dashboard/admin';
        } else if (role === 'teacher') {
          window.location.href = '/dashboard/teacher';
        } else if (role === 'parent') {
          window.location.href = '/dashboard/parent';
        } else if (role === 'owner') {
          window.location.href = '/dashboard/owner';
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        window.location.href = '/';
      }
    }
  }

  public clearSessionData() {
    try {
      localStorage.removeItem(this.config.storageKey);
    } catch (error) {
      console.error('Error clearing session data:', error);
    }
  }

  public destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.clearSessionData();
  }

  public getTimeUntilTimeout(): number {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivity;
    const timeoutMs = this.config.timeoutMinutes * 60 * 1000;
    return Math.max(0, timeoutMs - timeSinceLastActivity);
  }

  public getMinutesUntilTimeout(): number {
    return Math.ceil(this.getTimeUntilTimeout() / (60 * 1000));
  }
}

// Create a singleton instance
let sessionManager: SessionManager | null = null;

export function getSessionManager(config?: Partial<SessionConfig>): SessionManager {
  if (!sessionManager) {
    sessionManager = new SessionManager(config);
  }
  return sessionManager;
}

export function destroySessionManager() {
  if (sessionManager) {
    sessionManager.destroy();
    sessionManager = null;
  }
}

// React hook for session management
export function useSessionManager(config?: Partial<SessionConfig>) {
  const [timeUntilTimeout, setTimeUntilTimeout] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);

  useEffect(() => {
    const manager = getSessionManager(config);
    
    // Update timeout display every minute
    const updateInterval = setInterval(() => {
      const timeLeft = manager.getMinutesUntilTimeout();
      setTimeUntilTimeout(timeLeft);
      setIsActive(timeLeft > 0);
    }, 60000); // Update every minute

    // Initial update
    const timeLeft = manager.getMinutesUntilTimeout();
    setTimeUntilTimeout(timeLeft);
    setIsActive(timeLeft > 0);

    return () => {
      clearInterval(updateInterval);
    };
  }, [config]);

  return {
    timeUntilTimeout,
    isActive,
    updateCurrentPath: (path: string) => getSessionManager().updateCurrentPath(path),
    getReturnUrl: () => getSessionManager().getReturnUrl(),
    redirectToReturnUrl: () => getSessionManager().redirectToReturnUrl()
  };
}

// Import useState and useEffect for the hook
import { useState, useEffect } from 'react';
