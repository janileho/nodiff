"use client";

import { useState, useEffect } from "react";

interface DownvotedTask {
  id: string;
  taskId: string;
  question: string;
  section: string;
  module: string;
  created_at: any;
  downvoted_at: any;
  first_reason: string;
  first_message: string;
  vote_count: number;
  last_vote_at?: any;
}

export default function TaskVoteManagement() {
  const [downvotedTasks, setDownvotedTasks] = useState<DownvotedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    fetchDownvotedTasks();
  }, []);

  const fetchDownvotedTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/tasks/votes');
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched downvoted tasks:', data);
        setDownvotedTasks(data.tasks || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch downvoted tasks:', errorData);
        setError('Failed to fetch downvoted tasks');
      }
    } catch (err) {
      console.error('Error loading downvoted tasks:', err);
      setError('Error loading downvoted tasks');
    } finally {
      setLoading(false);
    }
  };



  const getReasonLabel = (reason: string): string => {
    const reasonLabels: { [key: string]: string } = {
      'confusing': 'Tehtävä on epäselvä',
      'too_difficult': 'Liian vaikea',
      'too_easy': 'Liian helppo',
      'wrong_topic': 'Ei liity aiheeseen',
      'mathematical_error': 'Matemaattinen virhe',
      'poor_explanation': 'Huono selitys',
      'other': 'Muu syy'
    };
    return reasonLabels[reason] || reason;
  };

  const formatDate = (date: any): string => {
    if (!date) return 'Tuntematon';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('fi-FI') + ' ' + d.toLocaleTimeString('fi-FI');
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

  if (downvotedTasks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Tehtäväpalautteet</h3>
        <div className="text-gray-500 text-center py-8">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Ei palautteita vielä
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Tehtäväpalautteet ({downvotedTasks.length} tehtävää)
        </h3>
        <button
          onClick={fetchDownvotedTasks}
          disabled={loading}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Ladataan...' : 'Päivitä'}
        </button>
      </div>
      
      <div className="space-y-4">
        {downvotedTasks.map((task) => (
          <div key={task.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-1">
                  Tehtävä {task.taskId}
                </h4>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {task.question}
                </p>
              </div>
              <div className="ml-4 text-right">
                <div className="text-lg font-bold text-red-600">
                  {task.vote_count}
                </div>
                <div className="text-xs text-gray-500">alasääntä</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm mb-3">
              <div>
                <span className="text-gray-500">Luotu:</span>
                <span className="ml-2">
                  {formatDate(task.created_at)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Alasäänestetty:</span>
                <span className="ml-2">
                  {formatDate(task.downvoted_at)}
                </span>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-sm text-gray-500 mb-1">Ensimmäinen syy:</div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {getReasonLabel(task.first_reason)}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => window.open(`/admin/tasks/${task.taskId}`, '_blank')}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Muokkaa tehtävä
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 