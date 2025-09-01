import type { TaskData } from "./task-data";

export interface TaskQualityMetrics {
  mathematicalAccuracy: number; // 0-1
  structuralCompleteness: number; // 0-1
  difficultyAppropriateness: number; // 0-1
  contentRelevance: number; // 0-1
  overallQuality: number; // 0-1
  issues: string[];
  suggestions: string[];
  needsHumanReview: boolean; // Flag for manual intervention
  reviewPriority: 'low' | 'medium' | 'high' | 'critical'; // Priority level for review
  reviewReason: string; // Specific reason why human review is needed
}

export interface ValidationResult {
  valid: boolean;
  quality: TaskQualityMetrics;
  shouldRegenerate: boolean;
  needsHumanReview: boolean;
  reviewPriority: 'low' | 'medium' | 'high' | 'critical';
}

export class TaskQualityValidator {
  static validateGeneratedTask(task: TaskData, section: any): TaskQualityMetrics {
    const metrics: TaskQualityMetrics = {
      mathematicalAccuracy: 0,
      structuralCompleteness: 0,
      difficultyAppropriateness: 0,
      contentRelevance: 0,
      overallQuality: 0,
      issues: [],
      suggestions: [],
      needsHumanReview: false,
      reviewPriority: 'low',
      reviewReason: ''
    };

    // 1. Mathematical Accuracy Check
    metrics.mathematicalAccuracy = this.checkMathematicalAccuracy(task);
    
    // 2. Structural Completeness
    metrics.structuralCompleteness = this.checkStructuralCompleteness(task);
    
    // 3. Difficulty Appropriateness
    metrics.difficultyAppropriateness = this.checkDifficultyAppropriateness(task, section);
    
    // 4. Content Relevance
    metrics.contentRelevance = this.checkContentRelevance(task, section);
    
    // 5. Calculate overall quality
    metrics.overallQuality = this.calculateOverallQuality(metrics);
    
    // 6. Determine if human review is needed
    this.determineReviewNeeds(metrics);
    
    return metrics;
  }

  private static checkMathematicalAccuracy(task: TaskData): number {
    let score = 1.0;

    // Check for mathematical inconsistencies
    if (this.hasMathematicalErrors(task)) {
      score -= 0.3;
    }

    // Check solution step consistency
    if (!this.areSolutionStepsConsistent(task)) {
      score -= 0.2;
    }

    // Check final answer validity
    if (!this.isFinalAnswerValid(task)) {
      score -= 0.3;
    }

    // Check for common mathematical mistakes
    if (this.hasCommonMathematicalMistakes(task)) {
      score -= 0.2;
    }

    return Math.max(0, score);
  }

  private static checkStructuralCompleteness(task: TaskData): number {
    let score = 1.0;

    // Check minimum solution steps
    if (task.solution_steps.length < 3) {
      score -= 0.3;
    }

    // Check for missing critical steps
    if (this.hasMissingCriticalSteps(task)) {
      score -= 0.4;
    }

    // Check step clarity
    if (!this.areStepsClear(task)) {
      score -= 0.3;
    }

    // Check for logical flow
    if (!this.hasLogicalFlow(task)) {
      score -= 0.2;
    }

    return Math.max(0, score);
  }

  private static checkDifficultyAppropriateness(task: TaskData, section: any): number {
    const complexity = this.calculateTaskComplexity(task);
    const expectedComplexity = this.getExpectedComplexity(task.difficulty);
    
    const difference = Math.abs(complexity - expectedComplexity);
    
    if (difference <= 0.2) return 1.0;
    if (difference <= 0.4) return 0.7;
    if (difference <= 0.6) return 0.4;
    return 0.1;
  }

  private static checkContentRelevance(task: TaskData, section: any): number {
    const sectionKeywords = this.extractSectionKeywords(section);
    const taskContent = `${task.question} ${task.solution_steps.join(' ')}`;
    
    const relevanceScore = this.calculateKeywordRelevance(sectionKeywords, taskContent);
    return relevanceScore;
  }

  private static calculateOverallQuality(metrics: TaskQualityMetrics): number {
    // Weighted average with mathematical accuracy being most important
    const weights = {
      mathematicalAccuracy: 0.4,
      structuralCompleteness: 0.3,
      difficultyAppropriateness: 0.2,
      contentRelevance: 0.1
    };

    return (
      metrics.mathematicalAccuracy * weights.mathematicalAccuracy +
      metrics.structuralCompleteness * weights.structuralCompleteness +
      metrics.difficultyAppropriateness * weights.difficultyAppropriateness +
      metrics.contentRelevance * weights.contentRelevance
    );
  }

  private static determineReviewNeeds(metrics: TaskQualityMetrics): void {
    const reasons: string[] = [];
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Critical issues that always need review
    if (metrics.mathematicalAccuracy < 0.3) {
      reasons.push("Critical mathematical errors detected");
      priority = 'critical';
    }

    if (metrics.overallQuality < 0.4) {
      reasons.push("Overall quality below acceptable threshold");
      if (priority !== 'critical') priority = 'high';
    }

    // High priority issues
    if (metrics.mathematicalAccuracy < 0.6) {
      reasons.push("Significant mathematical accuracy issues");
      if (priority !== 'critical') priority = 'high';
    }

    if (metrics.structuralCompleteness < 0.5) {
      reasons.push("Major structural completeness problems");
      if (priority !== 'critical') priority = 'high';
    }

    // Medium priority issues
    if (metrics.difficultyAppropriateness < 0.6) {
      reasons.push("Difficulty level may not match target audience");
      if (priority === 'low') priority = 'medium';
    }

    if (metrics.contentRelevance < 0.7) {
      reasons.push("Content may not be relevant to section topic");
      if (priority === 'low') priority = 'medium';
    }

    // Low priority issues
    if (metrics.overallQuality < 0.7 && metrics.overallQuality >= 0.6) {
      reasons.push("Quality could be improved");
      if (priority === 'low') priority = 'low';
    }

    // Set the review flags
    metrics.needsHumanReview = reasons.length > 0;
    metrics.reviewPriority = priority;
    metrics.reviewReason = reasons.join('; ');
  }

  // Helper methods for mathematical accuracy
  private static hasMathematicalErrors(task: TaskData): boolean {
    const content = `${task.question} ${task.solution_steps.join(' ')} ${task.final_answer}`;
    
    // Check for common mathematical errors
    const errorPatterns = [
      /0\s*\/\s*0/, // Division by zero
      /sqrt\(-?\d+\)/, // Square root of negative number
      /log\(-?\d+\)/, // Log of negative number
      /sin\([^)]*\)\s*>\s*1/, // Sin > 1
      /cos\([^)]*\)\s*>\s*1/, // Cos > 1
      /\d+\s*=\s*[^=]*\d+\s*=\s*\d+/, // Multiple equals signs
      /[a-zA-Z]\s*=\s*[a-zA-Z]\s*=\s*[a-zA-Z]/ // Variable = variable = variable
    ];

    return errorPatterns.some(pattern => pattern.test(content));
  }

  private static areSolutionStepsConsistent(task: TaskData): boolean {
    if (task.solution_steps.length < 2) return false;

    // Check if steps build upon each other
    for (let i = 1; i < task.solution_steps.length; i++) {
      const prevStep = task.solution_steps[i - 1];
      const currentStep = task.solution_steps[i];
      
      // Check if current step references previous step
      if (!this.stepsAreConnected(prevStep, currentStep)) {
        return false;
      }
    }

    return true;
  }

  private static isFinalAnswerValid(task: TaskData): boolean {
    const lastStep = task.solution_steps[task.solution_steps.length - 1];
    const finalAnswer = task.final_answer;

    // Check if final answer is mentioned in the last step
    if (!lastStep.includes(finalAnswer) && !finalAnswer.includes(lastStep)) {
      return false;
    }

    // Check for obvious contradictions
    if (this.hasObviousContradictions(lastStep, finalAnswer)) {
      return false;
    }

    return true;
  }

  private static hasCommonMathematicalMistakes(task: TaskData): boolean {
    const content = `${task.question} ${task.solution_steps.join(' ')} ${task.final_answer}`;
    
    const mistakePatterns = [
      /sin\^2\s*\+\s*cos\^2\s*!=\s*1/, // Wrong Pythagorean identity
      /log\(a\s*\+\s*b\)\s*=\s*log\(a\)\s*\+\s*log\(b\)/, // Wrong log rule
      /\(a\s*\+\s*b\)\^2\s*=\s*a\^2\s*\+\s*b\^2/, // Wrong binomial expansion
      /sqrt\(a\s*\+\s*b\)\s*=\s*sqrt\(a\)\s*\+\s*sqrt\(b\)/ // Wrong sqrt rule
    ];

    return mistakePatterns.some(pattern => pattern.test(content));
  }

  // Helper methods for structural completeness
  private static hasMissingCriticalSteps(task: TaskData): boolean {
    const content = `${task.question} ${task.solution_steps.join(' ')}`;
    
    // Check for common missing steps based on content
    if (content.includes('sin') || content.includes('cos')) {
      if (!content.includes('arcsin') && !content.includes('arccos') && content.includes('=')) {
        return true; // Missing inverse trig step
      }
    }

    if (content.includes('log') && content.includes('=')) {
      if (!content.includes('exp') && !content.includes('^')) {
        return true; // Missing exponential step
      }
    }

    return false;
  }

  private static areStepsClear(task: TaskData): boolean {
    return task.solution_steps.every(step => {
      // Check if step is too short or too long
      if (step.length < 10 || step.length > 200) {
        return false;
      }

      // Check if step contains mathematical content
      if (!/[a-zA-Z]/.test(step) && !/\d/.test(step)) {
        return false;
      }

      return true;
    });
  }

  private static hasLogicalFlow(task: TaskData): boolean {
    const steps = task.solution_steps;
    
    // Check if steps progress logically
    for (let i = 1; i < steps.length; i++) {
      const prevStep = steps[i - 1];
      const currentStep = steps[i];
      
      // Check if current step builds on previous
      if (!this.stepsAreConnected(prevStep, currentStep)) {
        return false;
      }
    }

    return true;
  }

  // Helper methods for difficulty appropriateness
  private static calculateTaskComplexity(task: TaskData): number {
    let complexity = 0;
    const content = `${task.question} ${task.solution_steps.join(' ')}`;

    // Count mathematical operations
    const operations = (content.match(/[+\-*/^√∫]/g) || []).length;
    complexity += operations * 0.1;

    // Count functions
    const functions = (content.match(/(sin|cos|tan|log|ln|exp|sqrt)/g) || []).length;
    complexity += functions * 0.2;

    // Count variables
    const variables = (content.match(/[a-zA-Z]/g) || []).length;
    complexity += variables * 0.05;

    // Count solution steps
    complexity += task.solution_steps.length * 0.1;

    return Math.min(1, complexity);
  }

  private static getExpectedComplexity(difficulty: string): number {
    switch (difficulty) {
      case 'helppo': return 0.3;
      case 'keskitaso': return 0.6;
      case 'haastava': return 0.9;
      default: return 0.5;
    }
  }

  // Helper methods for content relevance
  private static extractSectionKeywords(section: any): string[] {
    const keywords: string[] = [];
    
    if (section.name) {
      keywords.push(...section.name.toLowerCase().split(' '));
    }
    
    if (section.description) {
      keywords.push(...section.description.toLowerCase().split(' '));
    }
    
    if (section.learning_objectives) {
      section.learning_objectives.forEach((objective: string) => {
        keywords.push(...objective.toLowerCase().split(' '));
      });
    }

    // Add section-specific keywords
    if (section.id) {
      keywords.push(section.id.toLowerCase());
    }

    return keywords.filter(word => word.length > 2);
  }

  private static calculateKeywordRelevance(sectionKeywords: string[], taskContent: string): number {
    const taskWords = taskContent.toLowerCase().split(' ');
    let matches = 0;

    sectionKeywords.forEach(keyword => {
      if (taskWords.some(word => word.includes(keyword) || keyword.includes(word))) {
        matches++;
      }
    });

    return Math.min(1, matches / Math.max(1, sectionKeywords.length));
  }

  // Utility methods
  private static stepsAreConnected(prevStep: string, currentStep: string): boolean {
    // Check if current step references something from previous step
    const prevNumbers = prevStep.match(/\d+/g) || [];
    const prevVariables = prevStep.match(/[a-zA-Z]/g) || [];
    
    const currentStepLower = currentStep.toLowerCase();
    
    // Check if current step mentions numbers or variables from previous step
    return prevNumbers.some(num => currentStepLower.includes(num)) ||
           prevVariables.some(variable => currentStepLower.includes(variable));
  }

  private static hasObviousContradictions(lastStep: string, finalAnswer: string): boolean {
    // Check for obvious mathematical contradictions
    const lastStepNumbers = lastStep.match(/\d+/g) || [];
    const finalAnswerNumbers = finalAnswer.match(/\d+/g) || [];
    
    // If both have numbers but none match, it might be a contradiction
    if (lastStepNumbers.length > 0 && finalAnswerNumbers.length > 0) {
      const hasMatchingNumber = lastStepNumbers.some(num => 
        finalAnswerNumbers.includes(num)
      );
      if (!hasMatchingNumber) {
        return true;
      }
    }

    return false;
  }

  // Public method to get validation result
  static validateTask(task: TaskData, section: any): ValidationResult {
    const quality = this.validateGeneratedTask(task, section);
    
    return {
      valid: quality.overallQuality >= 0.6,
      quality,
      shouldRegenerate: quality.overallQuality < 0.4,
      needsHumanReview: quality.needsHumanReview,
      reviewPriority: quality.reviewPriority
    };
  }
} 