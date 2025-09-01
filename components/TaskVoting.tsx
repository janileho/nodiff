"use client";

import { useState } from "react";

interface TaskVotingProps {
  taskId: string;
  onVoteSubmitted?: () => void;
}

interface VoteData {
  taskId: string;
  voteType: 'downvote';
  reason: string;
  message: string;
  timestamp: Date;
}

export default function TaskVoting({ taskId, onVoteSubmitted }: TaskVotingProps) {
  const [showVoteForm, setShowVoteForm] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  const voteReasons = [
    { value: 'confusing', label: 'Tehtävä on epäselvä' },
    { value: 'too_difficult', label: 'Liian vaikea' },
    { value: 'too_easy', label: 'Liian helppo' },
    { value: 'wrong_topic', label: 'Ei liity aiheeseen' },
    { value: 'mathematical_error', label: 'Matemaattinen virhe' },
    { value: 'poor_explanation', label: 'Huono selitys' },
    { value: 'other', label: 'Muu syy' }
  ];

  const handleDownvote = () => {
    setShowVoteForm(true);
  };

  const handleSubmitVote = async () => {
    if (!selectedReason) {
      alert('Valitse syy äänestämiselle');
      return;
    }

    setIsSubmitting(true);

    try {
      const voteData: VoteData = {
        taskId,
        voteType: 'downvote',
        reason: selectedReason,
        message: customMessage.trim(),
        timestamp: new Date()
      };

      const response = await fetch('/api/tasks/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(voteData),
      });

      if (response.ok) {
        setHasVoted(true);
        setShowVoteForm(false);
        setSelectedReason('');
        setCustomMessage('');
        onVoteSubmitted?.();
      } else {
        throw new Error('Failed to submit vote');
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      alert('Virhe äänestyksen lähettämisessä. Yritä uudelleen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowVoteForm(false);
    setSelectedReason('');
    setCustomMessage('');
  };

  if (hasVoted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-green-800 font-medium">Kiitos palautteesta!</span>
        </div>
        <p className="text-green-700 text-sm mt-1">
          Palautteesi auttaa parantamaan tehtäviä.
        </p>
      </div>
    );
  }

  if (showVoteForm) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          Miksi tämä tehtävä on ongelmallinen?
        </h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valitse syy:
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Valitse syy...</option>
              {voteReasons.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lisätietoja (valinnainen):
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Kerro tarkemmin mikä on ongelma..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSubmitVote}
              disabled={isSubmitting || !selectedReason}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Lähetetään...' : 'Lähetä palaute'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Peruuta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">
            Löysitkö ongelman tässä tehtävässä?
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Auta parantamaan tehtäviä antamalla palautetta
          </p>
        </div>
        <button
          onClick={handleDownvote}
          className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
          </svg>
          Ilmoita ongelma
        </button>
      </div>
    </div>
  );
} 