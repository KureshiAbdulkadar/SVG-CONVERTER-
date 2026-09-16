'use client';

import React, { useState } from 'react';
import { X, Sparkles, Send, CheckCircle2 } from 'lucide-react';
import { useWorkbenchStore } from '../../stores/workbench-store';

export function FeedbackModal() {
  const { isFeedbackModalOpen, setFeedbackModalOpen, meta, parameters } = useWorkbenchStore();
  const [rating, setRating] = useState<number | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isFeedbackModalOpen) return null;

  const emojis = [
    { value: 1, emoji: '😞', label: 'Poor' },
    { value: 2, emoji: '😐', label: 'Average' },
    { value: 3, emoji: '🙂', label: 'Good' },
    { value: 4, emoji: '😍', label: 'Flawless' },
  ];

  const issueOptions = [
    'Colors are slightly off',
    'Too many anchor points / nodes',
    'Corners got rounded instead of sharp',
    'Missing fine details',
    'Extra background artifacts',
    'Imperfect curve smoothness',
  ];

  const toggleIssue = (issue: string) => {
    if (selectedIssues.includes(issue)) {
      setSelectedIssues(selectedIssues.filter(i => i !== issue));
    } else {
      setSelectedIssues([...selectedIssues, issue]);
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFeedbackModalOpen(false);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-surface-200 border border-surface-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-white text-sm">Rate VectorForge Precision</h3>
          </div>
          <button
            onClick={() => setFeedbackModalOpen(false)}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-surface-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {submitted ? (
            <div className="py-8 text-center space-y-2 animate-in zoom-in-95 duration-200">
              <CheckCircle2 className="w-10 h-10 text-brand-400 mx-auto" />
              <h4 className="font-semibold text-white text-base">Thank you for your feedback!</h4>
              <p className="text-xs text-neutral-400">
                Your report helps train and calibrate our Bezier and segmentation engine.
              </p>
            </div>
          ) : (
            <>
              {/* Rating Emojis */}
              <div>
                <span className="text-xs font-semibold text-neutral-300 block text-center mb-3">
                  How satisfied are you with this vector output?
                </span>
                <div className="flex justify-center gap-4">
                  {emojis.map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setRating(item.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${
                        rating === item.value
                          ? 'bg-surface-50 border-brand-accent scale-110 shadow-lg'
                          : 'bg-surface-300/60 border-surface-border hover:bg-surface-100 hover:scale-105'
                      }`}
                    >
                      <span className="text-2xl">{item.emoji}</span>
                      <span className="text-[10px] text-neutral-400">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Specific Issues Checklist */}
              <div>
                <span className="text-xs font-semibold text-neutral-300 block mb-2">
                  Any specific areas for improvement? (Optional)
                </span>
                <div className="space-y-1.5">
                  {issueOptions.map((issue) => (
                    <label
                      key={issue}
                      onClick={() => toggleIssue(issue)}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                        selectedIssues.includes(issue)
                          ? 'bg-surface-50 border-brand-accent text-white'
                          : 'bg-surface-300/40 border-surface-border text-neutral-400 hover:bg-surface-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIssues.includes(issue)}
                        onChange={() => {}}
                        className="accent-brand-accent rounded pointer-events-none"
                      />
                      <span>{issue}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div>
                <textarea
                  rows={2}
                  placeholder="Additional notes or suggestions..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full bg-surface-300 border border-surface-border rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:border-brand-accent focus:outline-none resize-none"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!rating}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-brand-accent to-indigo-600 hover:from-brand-accentHover hover:to-indigo-500 text-white shadow-lg shadow-indigo-950/40 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Feedback</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
