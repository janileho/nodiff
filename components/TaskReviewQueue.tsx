"use client";

import { useState, useEffect } from "react";

interface TaskReviewItem {
  id: string;
  task_id: string;
  question: string;
  quality_metrics: {
    overallQuality: number;
    needsHumanReview: boolean;
    reviewPriority: 'low' | 'medium' | 'high' | 'critical';
    reviewReason: string;
    issues: string[];
  };
  created_at: any;
}

export default function TaskReviewQueue() {
  const [reviewTasks, setReviewTasks] = useState<TaskReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReviewTasks();
  }, []);

  const fetchReviewTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/tasks/review-queue');
      if (response.ok) {
        const data = await response.json();
        setReviewTasks(data.tasks);
      } else {
        setError('Failed to fetch review tasks');
      }
    } catch (err) {
      setError('Error loading review tasks');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: string): string => {
    switch (priority) {
      case 'critical': return 'Kriittinen';
      case 'high': return 'Korkea';
      case 'medium': return 'Keskitaso';
      case 'low': return 'Matala';
      default: return 'Tuntematon';
    }
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

  if (reviewTasks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Tarkistettavat tehtävät</h3>
        <div className="text-gray-500 text-center py-8">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Ei tarkistettavia tehtäviä
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Tarkistettavat tehtävät ({reviewTasks.length})
      </h3>
      
      <div className="space-y-4">
        {reviewTasks.map((task) => (
          <div key={task.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-1">
                  Tehtävä {task.task_id}
                </h4>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {task.question}
                </p>
              </div>
              <div className={`ml-4 px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.quality_metrics.reviewPriority)}`}>
                {getPriorityLabel(task.quality_metrics.reviewPriority)}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Laatu:</span>
                <span className="ml-2 font-medium">
                  {(task.quality_metrics.overallQuality * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-gray-500">Luotu:</span>
                <span className="ml-2">
                  {task.created_at?.toDate?.()?.toLocaleDateString('fi-FI') || 'Tuntematon'}
                </span>
              </div>
            </div>
            
            <div className="mt-3">
              <div className="text-sm text-gray-500 mb-1">Tarkistuksen syy:</div>
              <div className="text-sm text-gray-700 bg-gray-50 rounded p-2">
                {task.quality_metrics.reviewReason}
              </div>
            </div>
            
            {task.quality_metrics.issues.length > 0 && (
              <div className="mt-3">
                <div className="text-sm text-gray-500 mb-1">Ongelmat:</div>
                <ul className="text-sm text-gray-700 space-y-1">
                  {task.quality_metrics.issues.slice(0, 3).map((issue, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      {issue}
                    </li>
                  ))}
                  {task.quality_metrics.issues.length > 3 && (
                    <li className="text-gray-500 text-xs">
                      +{task.quality_metrics.issues.length - 3} muuta ongelmaa
                    </li>
                  )}
                </ul>
              </div>
            )}
            
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => window.open(`/admin/tasks/${task.task_id}`, '_blank')}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Muokkaa
              </button>
              <button
                onClick={() => window.open(`/app/math/solve/task/${task.task_id}`, '_blank')}
                className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Katso
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 