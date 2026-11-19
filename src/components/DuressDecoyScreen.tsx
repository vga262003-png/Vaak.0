import React, { useState } from 'react';
import { CloudSun, FileText, Lock, Plus, CheckSquare } from 'lucide-react';

interface DuressDecoyScreenProps {
  ramPacketCount: number;
  onExitDuress: () => void;
  onOpenGovVault: () => void;
}

export const DuressDecoyScreen: React.FC<DuressDecoyScreenProps> = ({
  ramPacketCount,
  onExitDuress,
  onOpenGovVault,
}) => {
  const [notes, setNotes] = useState([
    'Grocery list: milk, bread, atta, lentils, batteries',
    'Dentist appointment rescheduled to Friday 4:30 PM',
    'Electricity bill payment due next Tuesday',
  ]);
  const [newNote, setNewNote] = useState('');

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setNotes((prev) => [newNote.trim(), ...prev]);
    setNewNote('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      <div className="max-w-3xl w-full mx-auto space-y-6">
        {/* Benign Decoy Header */}
        <header className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-sky-400" />
            <h1 className="font-display text-xl font-semibold text-white">Daily Notes &amp; Weather</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CloudSun className="w-4 h-4 text-amber-300" />
            <span>24°C · Partly Cloudy</span>
          </div>
        </header>

        {/* Harmless Notes Editor */}
        <form onSubmit={handleAddNote} className="flex gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Write a quick reminder..."
            className="flex-1 min-h-[46px] px-4 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-sky-500"
          />
          <button
            type="submit"
            className="min-h-[46px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </form>

        <ul className="space-y-2.5">
          {notes.map((n, idx) => (
            <li
              key={idx}
              className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-3 text-sm text-slate-200"
            >
              <CheckSquare className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Reviewer / Testing Exit Strip */}
      <footer className="max-w-3xl w-full mx-auto pt-6 mt-8 border-t border-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <span>
          Duress Decoy Active · Zero-Trace RAM Cache purged ({ramPacketCount} local packets remaining) · Alert sealed in /gov-vault
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenGovVault}
            className="inline-flex items-center gap-1 text-slate-400 hover:text-blue-400 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Inspect /gov-vault</span>
          </button>
          <button
            type="button"
            onClick={onExitDuress}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
          >
            Lock &amp; Exit Decoy
          </button>
        </div>
      </footer>
    </div>
  );
};
