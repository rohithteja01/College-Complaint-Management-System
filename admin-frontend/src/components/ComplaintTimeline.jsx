import React from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  MessageSquare, 
  Building2, 
  User, 
  Tag, 
  Shield, 
  Archive, 
  CheckCheck,
  Calendar,
  Sparkles,
  ArrowRight,
  Flame,
  Star,
  Trash2,
  GitFork,
  Send,
  AlertOctagon,
  RotateCcw
} from 'lucide-react';

const EVENT_CONFIG = {
  SUBMISSION: {
    title: 'Grievance Submitted',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-700',
    icon: Send,
  },
  STATUS_CHANGE: {
    title: 'Status Transition',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    iconBg: 'bg-blue-100 text-blue-700',
    icon: Tag,
  },
  ASSIGNMENT: {
    title: 'Technician Routing',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    iconBg: 'bg-indigo-100 text-indigo-700',
    icon: Building2,
  },
  DEPARTMENT_CHANGE: {
    title: 'Department Routed',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    iconBg: 'bg-indigo-100 text-indigo-700',
    icon: Building2,
  },
  STAFF_ASSIGNED: {
    title: 'Staff Assigned',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    iconBg: 'bg-indigo-100 text-indigo-700',
    icon: User,
  },
  PRIORITY_CHANGE: {
    title: 'Priority Modified',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700',
    icon: AlertTriangle,
  },
  COMMENT: {
    title: 'Official Admin Update',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    iconBg: 'bg-purple-100 text-purple-700',
    icon: MessageSquare,
  },
  RESOLUTION: {
    title: 'Grievance Resolved',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    iconBg: 'bg-emerald-600 text-white shadow-xs',
    icon: CheckCircle2,
  },
  CLOSURE: {
    title: 'Grievance Closed & Archived',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    iconBg: 'bg-slate-200 text-slate-700',
    icon: Archive,
  },
  ESCALATION: {
    title: '⚠️ SLA Escalation',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200 font-bold',
    iconBg: 'bg-rose-600 text-white shadow-xs',
    icon: Flame,
  },
  FEEDBACK: {
    title: 'Student Resolution Feedback',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 font-bold',
    iconBg: 'bg-amber-500 text-white shadow-xs',
    icon: Star,
  },
  DELETION: {
    title: 'Complaint Deleted',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    iconBg: 'bg-rose-100 text-rose-700',
    icon: Trash2,
  },
  LINK_MASTER: {
    title: 'Master Issue Association',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    iconBg: 'bg-blue-100 text-blue-700',
    icon: GitFork,
  },
  REOPEN: {
    title: 'Complaint Re-opened',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700',
    icon: RotateCcw,
  },
};

export default function ComplaintTimeline({ updates = [], complaint = null }) {
  if (!updates || updates.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-xs">
        No lifecycle events recorded yet.
      </div>
    );
  }

  const sortedUpdates = [...updates].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  return (
    <div className="space-y-4">
      <div className="relative pl-5 sm:pl-7 ml-3 sm:ml-4 border-l-2 border-slate-200 space-y-5">
        {sortedUpdates.map((item, idx) => {
          const config = EVENT_CONFIG[item.updateType] || EVENT_CONFIG.STATUS_CHANGE;
          const IconComponent = config.icon;
          const isComment = item.updateType === 'COMMENT';
          const isResolution = item.updateType === 'RESOLUTION';
          const isStatusChange = item.updateType === 'STATUS_CHANGE';
          const isEscalation = item.updateType === 'ESCALATION';
          const isFeedback = item.updateType === 'FEEDBACK';

          const actorName = item.performedByName || item.adminName;
          const actorRole = item.performedByRole || (item.adminName ? 'admin' : null);

          return (
            <div key={item._id || item.id || idx} className="relative group">
              {/* Timeline Centered Node Icon */}
              <div
                className={`absolute -left-[23px] sm:-left-[27px] top-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border-2 border-white shadow-2xs ${config.iconBg}`}
              >
                <IconComponent className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>

              {/* Event Card Container */}
              <div
                className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                  isEscalation
                    ? 'bg-rose-50/60 border-rose-200 shadow-2xs'
                    : isFeedback
                    ? 'bg-amber-50/40 border-amber-200 shadow-2xs'
                    : isComment
                    ? 'bg-purple-50/40 border-purple-200 shadow-2xs'
                    : isResolution
                    ? 'bg-emerald-50/60 border-emerald-200 shadow-2xs'
                    : isStatusChange
                    ? 'bg-blue-50/30 border-blue-100'
                    : 'bg-white border-slate-200'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md border uppercase tracking-wider ${config.badgeClass}`}
                    >
                      {config.title}
                    </span>

                    {actorName && (
                      <span className="text-[11px] font-semibold text-slate-700 flex items-center space-x-1">
                        {actorRole === 'admin' ? (
                          <Shield className="w-3 h-3 text-purple-600 inline flex-shrink-0" />
                        ) : actorRole === 'system' ? (
                          <Flame className="w-3 h-3 text-rose-600 inline flex-shrink-0" />
                        ) : (
                          <User className="w-3 h-3 text-slate-500 inline flex-shrink-0" />
                        )}
                        <span>{actorName}</span>
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </span>
                </div>

                {/* Status Transition */}
                {isStatusChange && item.previousStatus && item.newStatus && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold border border-slate-200 line-through text-[11px]">
                      {item.previousStatus}
                    </span>
                    <ArrowRight className="w-3 h-3 text-blue-500" />
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold border border-blue-200 text-[11px]">
                      {item.newStatus}
                    </span>
                  </div>
                )}

                {/* Message text */}
                <div className="mt-2 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {isComment ? (
                    <div className="p-2.5 rounded-lg bg-white border border-purple-100 font-medium italic shadow-2xs">
                      "{item.message}"
                    </div>
                  ) : isResolution ? (
                    <div className="space-y-1">
                      <p className="font-semibold text-emerald-950">{item.message}</p>
                      {complaint?.resolutionDetails?.actionTaken && (
                        <p className="text-[11px] text-emerald-800">
                          <strong>Action:</strong> {complaint.resolutionDetails.actionTaken}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-700">{item.message}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
