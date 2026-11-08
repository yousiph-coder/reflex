"use client";

import { AlertTriangle, Trash2, X } from "lucide-react";
import { Repository } from "@/lib/types";

interface DeleteConfirmModalProps {
  repo: Repository | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (repoId: string) => Promise<void>;
  isDeleting: boolean;
}

export function DeleteConfirmModal({
  repo,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteConfirmModalProps) {
  if (!isOpen || !repo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-md liquid-glass-elevated border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 shadow-glow-crimson">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold font-mono text-zinc-900 dark:text-white">
              Disconnect Repository
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-white transition-colors p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-3">
          <p>
            Are you sure you want to disconnect{" "}
            <strong className="text-zinc-900 dark:text-white font-mono bg-zinc-100 dark:bg-white/10 px-1.5 py-0.5 rounded">
              {repo.full_name}
            </strong>?
          </p>
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 space-y-1.5 font-mono text-[11px]">
            <p>• Autonomous pull request creation will be stopped.</p>
            <p>• Incoming Sentry alerts for this repository will no longer be remediated.</p>
            <p>• Existing opened pull requests on GitHub will remain untouched.</p>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5 font-mono">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(repo.id)}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-glow-crimson transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleting ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      </div>
    </div>
  );
}
