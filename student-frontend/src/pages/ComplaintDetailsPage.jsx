import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  MapPin, 
  Tag, 
  Building2, 
  User, 
  Download, 
  ExternalLink, 
  MessageSquare, 
  ShieldCheck, 
  Calendar, 
  AlertTriangle, 
  Loader2, 
  CheckCircle2, 
  Eye, 
  Info, 
  Layers, 
  Wrench, 
  Archive, 
  History, 
  Bot, 
  Sparkles, 
  ListChecks, 
  Paperclip, 
  Trash2,
  Star,
  ThumbsUp,
  Flame,
  AlertOctagon,
  Check,
  Send
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ComplaintTimeline from '../components/ComplaintTimeline';
import { DetailsSkeleton } from '../components/Skeleton';
import ConfirmModal from '../components/ConfirmModal';

const STATUS_BADGES = {
  Submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  'Under Review': 'bg-amber-50 text-amber-700 border-amber-200',
  Assigned: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'In Progress': 'bg-purple-50 text-purple-700 border-purple-200',
  Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Closed: 'bg-slate-100 text-slate-700 border-slate-200',
};

const PRIORITY_BADGES = {
  Low: 'bg-slate-100 text-slate-700 border-slate-200',
  Medium: 'bg-blue-50 text-blue-700 border-blue-200',
  High: 'bg-amber-50 text-amber-700 border-amber-200',
  Critical: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
};

const IMPACT_BADGES = {
  Low: 'bg-slate-100 text-slate-700 border-slate-200',
  Medium: 'bg-blue-50 text-blue-700 border-blue-200',
  High: 'bg-amber-50 text-amber-700 border-amber-200 font-bold',
  Critical: 'bg-rose-50 text-rose-700 border-rose-200 font-extrabold animate-pulse',
};

export default function ComplaintDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [complaint, setComplaint] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Student Feedback state
  const [selectedRating, setSelectedRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackFeedbackMsg, setFeedbackFeedbackMsg] = useState(null);
  const [isEditingFeedback, setIsEditingFeedback] = useState(false);

  // Upvote state
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [upvoting, setUpvoting] = useState(false);

  // Deletion Modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    loading: false,
  });

  const fetchComplaint = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/complaints/${id}`);
      const data = response.data.complaint;
      setComplaint(data);
      setUpdates(response.data.updates || []);

      if (data.feedback?.rating) {
        setSelectedRating(data.feedback.rating);
        setFeedbackComment(data.feedback.comment || '');
      }

      if (currentUser && data.upvotes) {
        const upvoted = data.upvotes.some(
          (u) => (u.student?._id || u.student) === currentUser.id || (u.student?._id || u.student) === currentUser._id
        );
        setHasUpvoted(upvoted);
      }
    } catch (err) {
      console.error('Error fetching complaint details:', err);
      setError(
        err.response?.data?.message || err.message || 'Failed to load complaint details.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchComplaint();
    }
  }, [id, currentUser]);

  const handleDeleteComplaint = async () => {
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      const targetId = complaint?.id || complaint?._id || complaint?.complaintId || id;
      await api.delete(`/complaints/${targetId}`);
      setDeleteModal({ isOpen: false, loading: false });
      navigate(currentUser?.role === 'admin' ? '/admin/complaints' : '/dashboard', {
        state: { notice: `Complaint ${complaint?.complaintId || id} was successfully deleted.` },
        replace: true,
      });
    } catch (err) {
      console.error('Error deleting complaint:', err);
      setError(err.response?.data?.message || 'Failed to delete complaint.');
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Submit Feedback Handler
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    setFeedbackFeedbackMsg(null);
    try {
      const targetId = complaint.id || complaint._id || complaint.complaintId || id;
      const res = await api.post(`/complaints/${targetId}/feedback`, {
        rating: selectedRating,
        comment: feedbackComment.trim(),
      });
      setComplaint((prev) => ({
        ...prev,
        feedback: res.data.feedback,
      }));
      setIsEditingFeedback(false);
      setFeedbackFeedbackMsg({
        type: 'success',
        text: 'Thank you! Your resolution rating and feedback have been submitted.',
      });

      // Refresh updates
      const updatesRes = await api.get(`/complaints/${targetId}/updates`);
      setUpdates(updatesRes.data.updates || []);
    } catch (err) {
      console.error('Submit feedback error:', err);
      setFeedbackFeedbackMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to submit resolution feedback.',
      });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Upvote / "I'm facing this issue too" Handler
  const handleToggleUpvote = async () => {
    if (upvoting) return;
    setUpvoting(true);
    try {
      const targetId = complaint.id || complaint._id || complaint.complaintId || id;
      const res = await api.post(`/complaints/${targetId}/upvote`);
      setHasUpvoted(res.data.hasUpvoted);
      setComplaint((prev) => ({
        ...prev,
        upvoteCount: res.data.upvoteCount,
        affectedStudentsCount: res.data.affectedStudentsCount,
        impactLevel: res.data.impactLevel,
      }));
    } catch (err) {
      console.error('Upvote error:', err);
    } finally {
      setUpvoting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <DetailsSkeleton />
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-12 px-4 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center shadow-2xs space-y-4 max-w-md">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Grievance Not Found</h3>
          <p className="text-xs text-slate-500">{error || 'This complaint does not exist or has been deleted.'}</p>
          <Link
            to={currentUser?.role === 'admin' ? '/admin/complaints' : '/dashboard'}
            className="inline-flex items-center space-x-1 px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = currentUser && complaint.student && (
    (typeof complaint.student === 'object' && (
      complaint.student._id === currentUser.id ||
      complaint.student.id === currentUser.id ||
      complaint.student._id === currentUser._id ||
      complaint.student.id === currentUser._id ||
      complaint.student.email === currentUser.email
    )) ||
    complaint.student === currentUser.id ||
    complaint.student === currentUser._id ||
    complaint.student === currentUser.email
  );
  const isAdmin = currentUser?.role === 'admin';
  const canDelete = isOwner || isAdmin;

  const isResolvedOrClosed = ['Resolved', 'Closed'].includes(complaint.status);
  const resolutionMessage = complaint.resolutionDetails?.summary || complaint.resolutionDetails?.message || 'Resolution documented by administrative team.';
  const resolverName = complaint.resolutionDetails?.resolvedByName || 'Campus Administration';
  const resolvedDate = complaint.resolutionDetails?.resolvedAt || complaint.resolvedAt || complaint.updatedAt;
  const hasAttachment = complaint.attachments && complaint.attachments.length > 0;

  // SLA Calculation
  const now = new Date();
  const isOverdue = complaint.dueDate && new Date(complaint.dueDate) < now && !isResolvedOrClosed;
  const isEscalated = complaint.isEscalated || isOverdue;

  const affectedCount = complaint.affectedStudentsCount || (1 + (complaint.upvoteCount || 0));
  const impactLevel = complaint.impactLevel || 'Low';

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Navigation Breadcrumbs & Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to={isAdmin ? '/admin/complaints' : '/dashboard'}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isAdmin ? 'Back to Complaints Registry' : 'Back to My Dashboard'}</span>
          </Link>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
              {complaint.complaintId}
            </span>
            <span
              className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                STATUS_BADGES[complaint.status] || 'bg-slate-100 text-slate-700'
              }`}
            >
              {complaint.status}
            </span>

            {canDelete && (
              <button
                onClick={() => setDeleteModal({ isOpen: true, loading: false })}
                className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-semibold rounded-lg text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 transition-colors shadow-2xs"
                title="Delete this complaint"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* SLA & Escalation Alert Banner */}
        {isEscalated && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 flex items-start justify-between gap-3 animate-in fade-in shadow-2xs">
            <div className="flex items-start space-x-3">
              <Flame className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-rose-900 block">
                  ⚠️ SLA Escalated Grievance
                </span>
                <p className="text-xs text-rose-800 mt-0.5 font-medium">
                  This grievance has exceeded its standard resolution deadline ({complaint.priority} priority SLA). It has been prioritized for accelerated institutional response.
                </p>
                {complaint.dueDate && (
                  <span className="text-[11px] font-mono text-rose-700 block mt-1">
                    Deadline: {new Date(complaint.dueDate).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Top Grievance Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 border border-slate-200">
              {complaint.category}
            </span>
            <span
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${
                PRIORITY_BADGES[complaint.priority] || 'bg-slate-100 text-slate-700'
              }`}
            >
              {complaint.priority} Priority
            </span>

            {/* Impact Scale Badge */}
            <span
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${
                IMPACT_BADGES[impactLevel] || 'bg-slate-100 text-slate-700'
              }`}
            >
              {affectedCount} Affected {affectedCount === 1 ? 'Student' : 'Students'} ({impactLevel} Impact)
            </span>

            <span className="text-xs text-slate-400 font-mono flex items-center space-x-1 ml-auto">
              <Clock className="w-3.5 h-3.5" />
              <span>Filed {new Date(complaint.createdAt).toLocaleDateString()}</span>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
            {complaint.title}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <p className="text-xs sm:text-sm text-slate-500 flex items-center space-x-1.5 font-medium">
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>{complaint.location}</span>
            </p>

            {/* Student "I'm facing this issue too" Upvote Button */}
            {!isOwner && (
              <button
                type="button"
                onClick={handleToggleUpvote}
                disabled={upvoting}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all shadow-2xs ${
                  hasUpvoted
                    ? 'bg-purple-700 text-white border-purple-800 hover:bg-purple-800'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <ThumbsUp className={`w-3.5 h-3.5 ${hasUpvoted ? 'fill-white' : ''}`} />
                <span>{hasUpvoted ? "You're facing this issue" : "👍 I'm facing this issue too"}</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded bg-black/10 font-mono">
                  {affectedCount}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Details Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* OFFICIAL RESOLUTION SECTION */}
            {isResolvedOrClosed && (
              <div className="bg-emerald-50 rounded-xl border border-emerald-300 p-5 sm:p-6 shadow-2xs space-y-3 animate-in fade-in">
                <div className="flex items-center space-x-2.5 text-emerald-950">
                  <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-2xs flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-emerald-950">
                      Issue Resolved
                    </h3>
                    <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                      Status: {complaint.status}
                    </span>
                  </div>
                </div>

                <div className="bg-white/80 p-4 rounded-lg border border-emerald-200 space-y-2">
                  <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">
                    Official Resolution Note
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                    {resolutionMessage}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-900 pt-1">
                  <p>
                    <strong className="text-emerald-950">Resolved by:</strong> {resolverName}
                  </p>
                  <p>
                    <strong className="text-emerald-950">Resolved on:</strong>{' '}
                    {new Date(resolvedDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* STUDENT RESOLUTION FEEDBACK SECTION */}
            {isResolvedOrClosed && isOwner && (
              <div className="bg-white rounded-xl border border-amber-300 p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2 text-amber-950">
                    <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {complaint.feedback?.rating && !isEditingFeedback ? 'Your Resolution Feedback' : 'Rate Grievance Resolution'}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Help us improve campus facility and maintenance services
                      </p>
                    </div>
                  </div>

                  {complaint.feedback?.rating && !isEditingFeedback && (
                    <button
                      type="button"
                      onClick={() => setIsEditingFeedback(true)}
                      className="text-xs font-semibold text-purple-700 hover:text-purple-900"
                    >
                      Edit Review
                    </button>
                  )}
                </div>

                {feedbackFeedbackMsg && (
                  <div
                    className={`p-3 rounded-lg text-xs font-semibold ${
                      feedbackFeedbackMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                        : 'bg-rose-50 text-rose-900 border border-rose-200'
                    }`}
                  >
                    {feedbackFeedbackMsg.text}
                  </div>
                )}

                {complaint.feedback?.rating && !isEditingFeedback ? (
                  <div className="p-4 rounded-lg bg-amber-50/50 border border-amber-200 space-y-2">
                    <div className="flex items-center space-x-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${
                            star <= complaint.feedback.rating
                              ? 'text-amber-500 fill-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                      <span className="text-xs font-bold text-amber-950 ml-2">
                        {complaint.feedback.rating} / 5 Stars
                      </span>
                    </div>

                    {complaint.feedback.comment && (
                      <p className="text-xs text-slate-700 italic pt-1">
                        "{complaint.feedback.comment}"
                      </p>
                    )}

                    <span className="text-[10px] text-slate-400 font-mono block pt-1">
                      Submitted on {new Date(complaint.feedback.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitFeedback} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Was your problem resolved to your satisfaction? *
                      </label>
                      <div className="flex items-center space-x-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setSelectedRating(star)}
                            className="p-1 text-amber-400 hover:scale-110 transition-transform focus:outline-none"
                          >
                            <Star
                              className={`w-7 h-7 ${
                                star <= (hoverRating || selectedRating)
                                  ? 'text-amber-500 fill-amber-400'
                                  : 'text-slate-300'
                              }`}
                            />
                          </button>
                        ))}
                        <span className="text-xs font-bold text-slate-700 ml-2">
                          {hoverRating || selectedRating} / 5
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Feedback / Remarks (Optional):
                      </label>
                      <textarea
                        rows={2}
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder="Tell us about the speed, technician behavior, or quality of repair..."
                        className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                      ></textarea>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="submit"
                        disabled={submittingFeedback}
                        className="inline-flex items-center space-x-1.5 py-2 px-4 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-2xs"
                      >
                        {submittingFeedback ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>Submit Feedback</span>
                      </button>
                      {isEditingFeedback && (
                        <button
                          type="button"
                          onClick={() => setIsEditingFeedback(false)}
                          className="py-2 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Description Statement */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Grievance Description</span>
              </h2>
              <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap p-4 rounded-lg bg-slate-50/70 border border-slate-100">
                {complaint.description}
              </div>
            </div>

            {/* Supporting Attachment */}
            {hasAttachment && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                  <Paperclip className="w-4 h-4 text-slate-500" />
                  <span>Supporting Evidence</span>
                </h2>
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center space-x-3 truncate">
                    <FileText className="w-6 h-6 text-slate-500 flex-shrink-0" />
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {complaint.attachments[0].fileName}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {complaint.attachments[0].fileType || 'Evidence Document'}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`http://localhost:5000${complaint.attachments[0].fileUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    <span>View Evidence</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* Lifecycle Timeline & Updates */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                  <History className="w-4 h-4 text-slate-500" />
                  <span>Chronological Lifecycle Updates</span>
                </h2>
                <span className="text-[11px] text-slate-400 font-mono">
                  {updates.length} events logged
                </span>
              </div>

              <ComplaintTimeline updates={updates} complaint={complaint} />
            </div>
          </div>

          {/* Right Sidebar (1 col) */}
          <div className="space-y-6">
            
            {/* SLA Due Date & Target Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Resolution SLA Target</span>
              </h3>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Target Deadline</span>
                  <p className="font-semibold text-slate-900">
                    {complaint.dueDate ? new Date(complaint.dueDate).toLocaleString() : 'Standard 72-hour window'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Resolution Status</span>
                  <p className="font-semibold text-slate-800">
                    {isResolvedOrClosed ? 'Completed' : isOverdue ? '⚠️ Overdue' : 'On Track'}
                  </p>
                </div>
              </div>
            </div>

            {/* Department & Technician Assignment */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span>Assigned Facility</span>
              </h3>

              {complaint.assignedDepartment ? (
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Department</span>
                    <p className="text-xs font-bold text-slate-900">
                      {complaint.assignedDepartment.name}
                    </p>
                  </div>

                  {complaint.assignedStaff && (
                    <div className="pt-2 border-t border-slate-200/60">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Staff In-Charge</span>
                      <p className="text-xs font-semibold text-slate-800">
                        {complaint.assignedStaff.name}
                      </p>
                      {complaint.assignedStaff.email && (
                        <p className="text-[11px] text-slate-500">
                          {complaint.assignedStaff.email}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  Pending departmental routing by administration.
                </div>
              )}
            </div>

            {/* Student Owner Info */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <User className="w-4 h-4 text-slate-500" />
                <span>Student Requester</span>
              </h3>
              <div className="text-xs text-slate-700 space-y-1.5">
                <p><strong>Name:</strong> {complaint.student?.fullName}</p>
                <p><strong>Email:</strong> {complaint.student?.email}</p>
                {complaint.student?.studentId && (
                  <p><strong>ID:</strong> <span className="font-mono">{complaint.student.studentId}</span></p>
                )}
                {complaint.student?.department && (
                  <p><strong>Dept:</strong> {complaint.student.department}</p>
                )}
              </div>
            </div>

            {/* Quick Actions (if admin) */}
            {isAdmin && (
              <div className="bg-slate-900 text-white rounded-xl p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Admin Control Panel
                </h3>
                <p className="text-xs text-slate-400">
                  Update status, assign technician, record updates, or document official resolution.
                </p>
                <Link
                  to={`/admin/complaints/${complaint._id || complaint.complaintId}`}
                  className="w-full inline-flex items-center justify-center space-x-1.5 py-2 px-3 text-xs font-bold rounded-lg bg-white text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <span>Open Admin Details</span>
                </Link>
              </div>
            )}

            {/* Delete Complaint Action Card */}
            {canDelete && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-2">
                <h4 className="text-xs font-bold text-slate-900">Manage Complaint</h4>
                <p className="text-[11px] text-slate-500">
                  Need to cancel or remove this ticket? Soft-deleting will remove it from active complaint views.
                </p>
                <button
                  onClick={() => setDeleteModal({ isOpen: true, loading: false })}
                  className="w-full inline-flex items-center justify-center space-x-1.5 py-2 px-3 text-xs font-semibold rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Complaint</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Modal for Soft Deletion */}
        <ConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, loading: false })}
          onConfirm={handleDeleteComplaint}
          title="Delete Complaint"
          message={`Are you sure you want to delete this complaint "${complaint.title}" (${complaint.complaintId})?`}
          confirmText="Delete Complaint"
          cancelText="Cancel"
          type="danger"
          loading={deleteModal.loading}
        />
      </div>
    </div>
  );
}
