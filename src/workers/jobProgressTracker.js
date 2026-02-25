/**
 * JobProgressTracker - Utility for tracking and reporting job progress
 * 
 * Features:
 * - Incremental progress updates
 * - Estimated time remaining (ETA)
 * - Progress boundaries/milestones
 * - Error handling and cleanup
 */
export class JobProgressTracker {
  constructor(job, options = {}) {
    this.job = job;
    this.startTime = Date.now();
    this.currentProgress = 0;
    this.totalWork = options.totalWork || 100; // Total work units
    this.minUpdateInterval = options.minUpdateInterval || 1000; // Min time between updates (ms)
    this.lastUpdateTime = 0;
    this.milestones = new Map();
  }

  /**
   * Register a milestone at a specific progress percentage
   * Useful for major phases of work
   */
  addMilestone(name, progressPercentage) {
    this.milestones.set(name, progressPercentage);
  }

  /**
   * Increment progress by a certain amount
   * @param {number} increment - Amount to increment (0-100)
   * @param {string} description - Description of work done
   */
  async increment(increment, description = '') {
    this.currentProgress = Math.min(this.currentProgress + increment, 99); // Reserve 100% for completion
    await this.update(description);
  }

  /**
   * Set progress to an absolute value
   * @param {number} percentage - Progress percentage (0-100)
   * @param {string} description - Description of current work
   */
  async update(description = '') {
    const now = Date.now();

    // Throttle updates to avoid overloading Redis
    if (now - this.lastUpdateTime < this.minUpdateInterval) {
      return;
    }

    this.lastUpdateTime = now;

    try {
      const elapsed = now - this.startTime;
      const eta = this._calculateETA(elapsed);

      const progressData = {
        percentage: this.currentProgress,
        elapsed: Math.round(elapsed / 1000),
        eta: Math.round(eta / 1000),
        description,
        timestamp: new Date().toISOString(),
      };

      await this.job.updateProgress(progressData);
    } catch (error) {
      console.error('Failed to update job progress:', error);
    }
  }

  /**
   * Mark a milestone as reached
   */
  async reachMilestone(name) {
    if (this.milestones.has(name)) {
      const percentage = this.milestones.get(name);
      this.currentProgress = percentage;
      await this.update(`Milestone reached: ${name}`);
    }
  }

  /**
   * Complete the job (set progress to 100%)
   */
  async complete(description = 'Job completed') {
    this.currentProgress = 100;
    await this.update(description);
  }

  /**
   * Get the current progress
   */
  getProgress() {
    return {
      percentage: this.currentProgress,
      elapsed: Math.round((Date.now() - this.startTime) / 1000),
      eta: Math.round(this._calculateETA(Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * Calculate estimated time remaining based on current pace
   * @private
   */
  _calculateETA(elapsed) {
    if (this.currentProgress === 0) return 0;
    const remainingWork = 100 - this.currentProgress;
    const pace = elapsed / this.currentProgress; // ms per 1% progress
    return remainingWork * pace;
  }
}

export default JobProgressTracker;
