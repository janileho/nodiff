"use client";

import { useState, useEffect } from "react";
import type { TaskQualityMetrics } from "@/lib/task-quality-validator";

interface TaskQualityDashboardProps {
  taskId?: string;
  showDetails?: boolean;
}

interface QualityStats {
  totalTasks: number;
  averageQuality: number;
  qualityDistribution: {
    excellent: number; // 0.8-1.0
    good: number; // 0.6-0.8
    fair: number; // 0.4-0.6
    poor: number; // 0.0-0.4
  };
  commonIssues: string[];
  recentTasks: Array<{
    taskId: string;
    quality: number;
    issues: string[];
    generatedAt: Date;
  }>;
}

export default function TaskQualityDashboard({ taskId, showDetails = false }: TaskQualityDashboardProps) {
  const [stats, setStats] = useState<QualityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQualityStats();
  }, [taskId]);

  const fetchQualityStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/tasks/quality-stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        setError('Failed to fetch quality statistics');
      }
    } catch (err) {
      setError('Error loading quality statistics');
    } finally {
      setLoading(false);
    }
  };

  const getQualityColor = (quality: number): string => {
    if (quality >= 0.8) return 'text-green-600 bg-green-50';
    if (quality >= 0.6) return 'text-blue-600 bg-blue-50';
    if (quality >= 0.4) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getQualityLabel = (quality: number): string => {
    if (quality >= 0.8) return 'Erinomainen';
    if (quality >= 0.6) return 'Hyvä';
    if (quality >= 0.4) return 'Keskitaso';
    return 'Huono';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600">
          <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-gray-500">Ei laatumittauksia saatavilla</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Tehtävien Laatu
      </h3>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.totalTasks}</div>
          <div className="text-sm text-blue-600">Yhteensä tehtäviä</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {(stats.averageQuality * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-green-600">Keskimääräinen laatu</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">
            {stats.qualityDistribution.excellent + stats.qualityDistribution.good}
          </div>
          <div className="text-sm text-purple-600">Hyvät tehtävät</div>
        </div>
      </div>

      {/* Quality Distribution */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 mb-3">Laatujakauma</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Erinomainen (80-100%)</span>
            <div className="flex items-center">
              <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${(stats.qualityDistribution.excellent / stats.totalTasks) * 100}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {stats.qualityDistribution.excellent}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Hyvä (60-80%)</span>
            <div className="flex items-center">
              <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${(stats.qualityDistribution.good / stats.totalTasks) * 100}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {stats.qualityDistribution.good}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Keskitaso (40-60%)</span>
            <div className="flex items-center">
              <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className="bg-yellow-600 h-2 rounded-full" 
                  style={{ width: `${(stats.qualityDistribution.fair / stats.totalTasks) * 100}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {stats.qualityDistribution.fair}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Huono (0-40%)</span>
            <div className="flex items-center">
              <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className="bg-red-600 h-2 rounded-full" 
                  style={{ width: `${(stats.qualityDistribution.poor / stats.totalTasks) * 100}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {stats.qualityDistribution.poor}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Common Issues */}
      {stats.commonIssues.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Yleisimmät ongelmat</h4>
          <div className="space-y-2">
            {stats.commonIssues.slice(0, 5).map((issue, index) => (
              <div key={index} className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {issue}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Tasks */}
      {showDetails && stats.recentTasks.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Viimeisimmät tehtävät</h4>
          <div className="space-y-2">
            {stats.recentTasks.slice(0, 5).map((task) => (
              <div key={task.taskId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-900">{task.taskId}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(task.generatedAt).toLocaleDateString('fi-FI')}
                  </div>
                </div>
                <div className="flex items-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getQualityColor(task.quality)}`}>
                    {getQualityLabel(task.quality)} ({(task.quality * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-6">
        <button
          onClick={fetchQualityStats}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          Päivitä tilastot
        </button>
      </div>
    </div>
  );
} 