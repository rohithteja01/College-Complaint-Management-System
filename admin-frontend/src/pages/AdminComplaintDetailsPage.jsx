import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Shield, 
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
  Calendar, 
  AlertTriangle, 
  Loader2, 
  CheckCircle2, 
  Wrench, 
  Layers, 
  Send, 
  FileText, 
  Save, 
  UserCheck, 
  CheckCheck, 
  RotateCcw, 
  Sparkles, 
  Eye, 
  Users, 
  History, 
  Bot, 
  ListChecks, 
  CheckSquare, 
  Square,
  Paperclip,
  Check,
  RefreshCw,
  Trash2,
  Lock,
  Star,
  Flame,
  GitFork,
  ThumbsUp,
  AlertOctagon
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ComplaintTimeline from '../components/ComplaintTimeline';
import { DetailsSkeleton } from '../components/Skeleton';
import ConfirmModal from '../components/ConfirmModal';

const STATUSES = [
  'Submitted',
  'Under Review',
  'Assigned',
  'In Progress',
  'Resolved',
  'Closed',
];

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

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

export default function AdminComplaintDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [complaint, setComplaint] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState({ type: null, message: null });

  // Action items checklist
  const [checkedActions, setCheckedActions] = useState({});

  // Form states for admin actions
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [forceStatus, setForceStatus] = useState(false);

  // Cascading Department -> Staff
  const [departments, setDepartments] = useState([]);
  const [departmentStaff, setDepartmentStaff] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [loadingStaff, setLoadingStaff] = useState(false);

  const [selectedPriority, setSelectedPriority] = useState('');
  const [newComment, setNewComment] = useState('');

  const [resolutionSummary, setResolutionSummary] = useState('');
  const [resolutionAction, setResolutionAction] = useState('');

  // Master Issue Association state
  const [masterInputId, setMasterInputId] = useState('');

  // Confirmation Modal state
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: null,
  });

  const fetchComplaint = async () => {
    setLoading(true);
    try {
      const [complaintRes, deptRes] = await Promise.all([
        api.get(`/admin/complaints/${id}`),
        api.get('/admin/departments?active=true'),
      ]);

      const data = complaintRes.data.complaint;
      setComplaint(data);
      setUpdates(complaintRes.data.updates || []);
      setSelectedStatus(data.status);
      setSelectedPriority(data.priority);

      const deptId = data.assignedDepartment?._id || data.assignedDepartment?.id || (typeof data.assignedDepartment === 'string' ? data.assignedDepartment : '') || '';
      setSelectedDept(deptId);

      const staffId = data.assignedStaff?._id || data.assignedStaff?.id || (typeof data.assignedStaff === 'string' ? data.assignedStaff : '') || '';
      setSelectedStaff(staffId);

      setDepartments(deptRes.data.departments || []);

      if (deptId) {
        fetchStaffForDept(deptId);
      }

      if (data.resolutionDetails?.summary || data.resolutionDetails?.message) {
        setResolutionSummary(data.resolutionDetails.summary || data.resolutionDetails.message || '');
        setResolutionAction(data.resolutionDetails.actionTaken || '');
      }

      if (data.masterComplaint) {
        setMasterInputId(data.masterComplaint?.complaintId || data.masterComplaint || '');
      }
    } catch (err) {
      console.error('Admin fetch complaint error:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to load complaint details.',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffForDept = async (deptId) => {
    if (!deptId) {
      setDepartmentStaff([]);
      setSelectedStaff('');
      return;
    }

    setLoadingStaff(true);
    try {
      const res = await api.get(`/admin/departments/${deptId}/staff`);
      setDepartmentStaff(res.data.staff || []);
    } catch (err) {
      console.error('Failed to load department staff:', err);
      setDepartmentStaff([]);
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    if (id) fetchComplaint();
  }, [id]);

  const handleDeptChange = (deptId) => {
    setSelectedDept(deptId);
    setSelectedStaff('');
    if (deptId) {
      fetchStaffForDept(deptId);
    } else {
      setDepartmentStaff([]);
    }
  };

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback({ type: null, message: null });
    }, 4000);
  };

  // Trigger AI Re-analysis
  const handleReanalyzeAi = async () => {
    setAiAnalyzing(true);
    try {
      const response = await api.post(`/admin/complaints/${id}/ai-analyze`);
      setComplaint((prev) => ({
        ...prev,
        aiAnalysis: response.data.aiAnalysis,
      }));
      showFeedback('success', 'AI Grievance Copilot analysis updated.');
    } catch (err) {
      console.error('AI Re-analyze error:', err);
      showFeedback('error', 'Failed to update AI analysis.');
    } finally {
      setAiAnalyzing(false);
    }
  };

  const toggleActionItem = (idx) => {
    setCheckedActions((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // 1. Update Status with optional confirmation
  const handleStatusUpdate = async (e) => {
    if (e) e.preventDefault();

    if (selectedStatus === complaint.status) {
      showFeedback('error', 'Please select a different status to transition.');
      return;
    }

    // Require resolution fields if marking Resolved
    if (selectedStatus === 'Resolved') {
      if (!resolutionSummary.trim()) {
        showFeedback('error', 'A resolution message is required when marking a complaint as Resolved.');
        return;
      }
    }

    setActionLoading(true);
    try {
      const payload = {
        status: selectedStatus,
        comment: statusComment.trim() || undefined,
        force: forceStatus,
      };

      if (selectedStatus === 'Resolved') {
        payload.resolutionSummary = resolutionSummary.trim();
        payload.resolutionActionTaken = resolutionAction.trim() || resolutionSummary.trim();
      }

      const response = await api.patch(`/admin/complaints/${id}/status`, payload);
      setComplaint(response.data.complaint);
      setUpdates(response.data.updates || []);
      setStatusComment('');
      setConfirmModalState({ isOpen: false });
      showFeedback('success', `Status transitioned to "${selectedStatus}".`);
    } catch (err) {
      console.error('Status update error:', err);
      showFeedback('error', err.response?.data?.message || 'Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Direct Resolution Handler ("Mark as Resolved")
  const handleDirectResolve = async (e) => {
    e.preventDefault();
    if (!resolutionSummary.trim()) {
      showFeedback('error', 'Resolution message is required before marking complaint as Resolved.');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        summary: resolutionSummary.trim(),
        actionTaken: resolutionAction.trim() || resolutionSummary.trim(),
      };

      const response = await api.post(`/admin/complaints/${id}/resolution`, payload);
      setComplaint(response.data.complaint);
      setSelectedStatus('Resolved');
      
      // Refresh updates timeline
      const detailsRes = await api.get(`/admin/complaints/${id}`);
      setUpdates(detailsRes.data.updates || []);

      showFeedback('success', 'Complaint marked as Resolved with resolution documented.');
    } catch (err) {
      console.error('Resolve error:', err);
      showFeedback('error', err.response?.data?.message || 'Failed to resolve complaint.');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Direct Close Handler ("Close Complaint")
  const confirmCloseComplaint = () => {
    setConfirmModalState({
      isOpen: true,
      title: 'Close Complaint Lifecycle',
      message: 'Are you sure you want to mark this complaint ticket as Closed? This formally completes the grievance resolution lifecycle.',
      type: 'info',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const response = await api.patch(`/admin/complaints/${id}/status`, {
            status: 'Closed',
            comment: 'Grievance ticket formally closed by administrator.',
          });
          setComplaint(response.data.complaint);
          setSelectedStatus('Closed');
          setUpdates(response.data.updates || []);
          setConfirmModalState({ isOpen: false });
          showFeedback('success', 'Complaint marked as Closed.');
        } catch (err) {
          console.error('Close error:', err);
          showFeedback('error', err.response?.data?.message || 'Failed to close complaint.');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // 4. Update Cascading Department & Staff Assignment
  const handleAssignmentUpdate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        departmentId: selectedDept || null,
        staffId: selectedStaff || null,
      };

      const response = await api.patch(`/admin/complaints/${id}/assign`, payload);
      setComplaint(response.data.complaint);
      setUpdates(response.data.updates || []);
      showFeedback('success', 'Department and technician assignment updated.');
    } catch (err) {
      console.error('Assignment error:', err);
      showFeedback('error', err.response?.data?.message || 'Failed to assign complaint.');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Update Priority
  const handlePriorityUpdate = async (e) => {
    e.preventDefault();
    if (selectedPriority === complaint.priority) return;

    setActionLoading(true);
    try {
      const response = await api.patch(`/admin/complaints/${id}/priority`, {
        priority: selectedPriority,
      });
      setComplaint(response.data.complaint);
      setUpdates(response.data.updates || []);
      showFeedback('success', `Priority changed to ${selectedPriority} (SLA target recalibrated).`);
    } catch (err) {
      console.error('Priority update error:', err);
      showFeedback('error', err.response?.data?.message || 'Failed to update priority.');
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Add Admin Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setActionLoading(true);
    try {
      const response = await api.post(`/admin/complaints/${id}/comments`, {
        comment: newComment.trim(),
      });
      setComplaint(response.data.complaint);
      const detailsRes = await api.get(`/admin/complaints/${id}`);
      setUpdates(detailsRes.data.updates || []);
      setNewComment('');
      showFeedback('success', 'Official administrative comment recorded.');
    } catch (err) {
      console.error('Comment error:', err);
      showFeedback('error', err.response?.data?.message || 'Failed to record comment.');
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Link to Master Issue
  const handleLinkMaster = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const response = await api.post(`/admin/complaints/${id}/link-master`, {
        masterComplaintId: masterInputId.trim() || null,
      });
      setComplaint(response.data.complaint);
      const detailsRes = await api.get(`/admin/complaints/${id}`);
      setUpdates(detailsRes.data.updates || []);
      showFeedback('success', response.data.message);
    } catch (err) {
      console.error('Link master error:', err);
      showFeedback('error', err.response?.data?.message || 'Failed to link master complaint.');
    } finally {
      setActionLoading(false);
    }
  };

  // 8. Delete Complaint (Admin Soft-Delete)
  const confirmDeleteComplaint = () => {
    setConfirmModalState({
      isOpen: true,
      title: 'Delete Complaint',
      message: `Are you sure you want to delete complaint "${complaint.title}" (${complaint.complaintId})? This will soft-delete the ticket and remove it from active complaint registries.`,
      type: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await api.delete(`/admin/complaints/${id}`);
          setConfirmModalState({ isOpen: false });
          navigate('/complaints', {
            state: { notice: `Complaint ${complaint.complaintId} was deleted successfully.` },
            replace: true,
          });
        } catch (err) {
          console.error('Delete complaint error:', err);
          showFeedback('error', err.response?.data?.message || 'Failed to delete complaint.');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <DetailsSkeleton />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-12 px-4 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center shadow-2xs space-y-4 max-w-md">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Grievance Not Found</h3>
          <Link
            to="/admin/complaints"
            className="inline-flex items-center space-x-1 px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Complaints Table</span>
          </Link>
        </div>
      </div>
    );
  }

  const ai = complaint.aiAnalysis;
  const hasAi = ai && ai.summary;
  const hasAttachment = complaint.attachments && complaint.attachments.length > 0;
  const isResolved = complaint.status === 'Resolved';
  const isClosed = complaint.status === 'Closed';
  const isResolvedOrClosed = isResolved || isClosed;

  // SLA Calculation
  const now = new Date();
  const isOverdue = complaint.dueDate && new Date(complaint.dueDate) < now && !isResolvedOrClosed;
  const isEscalated = complaint.isEscalated || isOverdue;
  const overdueDays = complaint.dueDate && isOverdue ? Math.ceil((now - new Date(complaint.dueDate)) / (1000 * 60 * 60 * 24)) : 0;

  const affectedCount = complaint.affectedStudentsCount || (1 + (complaint.upvoteCount || 0));
  const impactLevel = complaint.impactLevel || 'Low';

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Navigation Breadcrumb & Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/complaints"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Complaints Registry</span>
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

            {/* Admin Delete Action Button */}
            <button
              onClick={confirmDeleteComplaint}
              className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-semibold rounded-lg text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 transition-colors shadow-2xs"
              title="Delete this complaint"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Complaint</span>
            </button>
          </div>
        </div>

        {/* SLA Escalation Warning Banner */}
        {isEscalated && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 flex items-start justify-between gap-3 animate-in fade-in shadow-2xs">
            <div className="flex items-start space-x-3">
              <Flame className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-xs font-extrabold uppercase tracking-wider text-rose-900 block">
                  ⚠️ ESCALATED TICKET — RESOLUTION DEADLINE EXCEEDED
                </strong>
                <p className="text-xs text-rose-800 mt-0.5">
                  This grievance has been overdue for <strong>{overdueDays} {overdueDays === 1 ? 'day' : 'days'}</strong> ({complaint.priority} priority SLA deadline: {new Date(complaint.dueDate).toLocaleString()}).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Global Feedback Banner */}
        {feedback.message && (
          <div
            className={`p-3.5 rounded-xl border flex items-center space-x-2.5 text-xs font-semibold animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Top Grievance Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-3">
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
              {affectedCount} Affected Students ({impactLevel} Impact)
            </span>

            <span className="text-xs text-slate-400 font-mono flex items-center space-x-1 ml-auto">
              <Clock className="w-3.5 h-3.5" />
              <span>Filed {new Date(complaint.createdAt).toLocaleString()}</span>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
            {complaint.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
            <span className="flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{complaint.location}</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>{complaint.student?.fullName} ({complaint.student?.email})</span>
            </span>
          </div>
        </div>

        {/* 2-Column Administrative Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Complaint Details & Timeline (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Resolution Documentation Banner */}
            {isResolvedOrClosed && complaint.resolutionDetails && (
              <div className="bg-emerald-50 rounded-xl border border-emerald-300 p-5 sm:p-6 shadow-2xs space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-emerald-950">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <h3 className="text-sm sm:text-base font-bold">
                      Official Complaint Resolution Record
                    </h3>
                  </div>
                  {!isClosed && (
                    <button
                      onClick={confirmCloseComplaint}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Close Complaint</span>
                    </button>
                  )}
                </div>

                <div className="bg-white/80 p-4 rounded-lg border border-emerald-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">
                    Resolution Note
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                    {complaint.resolutionDetails.summary || complaint.resolutionDetails.message || complaint.resolutionDetails.actionTaken}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-900 pt-1">
                  <p>
                    <strong className="text-emerald-950">Resolved by:</strong>{' '}
                    {complaint.resolutionDetails.resolvedByName || 'Campus Administrator'}
                  </p>
                  <p>
                    <strong className="text-emerald-950">Resolved on:</strong>{' '}
                    {complaint.resolvedAt ? new Date(complaint.resolvedAt).toLocaleString() : 'Recently'}
                  </p>
                </div>
              </div>
            )}

            {/* Student Feedback Display */}
            {complaint.feedback?.rating && (
              <div className="bg-white rounded-xl border border-amber-300 p-5 sm:p-6 shadow-2xs space-y-3">
                <div className="flex items-center space-x-2 text-amber-950 border-b border-slate-100 pb-3">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Student Resolution Feedback
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Submitted by student requester
                    </p>
                  </div>
                </div>

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
                    <p className="text-xs text-slate-800 italic pt-1 font-medium">
                      "{complaint.feedback.comment}"
                    </p>
                  )}

                  <span className="text-[10px] text-slate-400 font-mono block pt-1">
                    Submitted {complaint.feedback.submittedAt ? new Date(complaint.feedback.submittedAt).toLocaleString() : ''}
                  </span>
                </div>
              </div>
            )}

            {/* AI Grievance Copilot & Checklist */}
            {hasAi && (
              <div className="bg-white rounded-xl border border-purple-200 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-purple-900">
                        AI Grievance Copilot Summary
                      </h2>
                      <span className="text-[10px] text-purple-600 font-medium">
                        Advisory assistance for campus staff
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleReanalyzeAi}
                    disabled={aiAnalyzing}
                    className="inline-flex items-center space-x-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 px-2 py-1 rounded border border-purple-200 hover:bg-purple-100"
                  >
                    <RefreshCw className={`w-3 h-3 ${aiAnalyzing ? 'animate-spin' : ''}`} />
                    <span>Re-evaluate</span>
                  </button>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed bg-purple-50/50 p-3.5 rounded-lg border border-purple-100">
                  {ai.summary}
                </p>

                {ai.priorityReason && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <strong className="text-slate-800 block text-[11px] uppercase tracking-wider">Priority Rationale:</strong>
                    <span className="text-slate-600">{ai.priorityReason}</span>
                  </div>
                )}

                {ai.actionItems && ai.actionItems.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-purple-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900 flex items-center space-x-1.5">
                      <ListChecks className="w-3.5 h-3.5 text-purple-600" />
                      <span>Suggested Administrative Action Items</span>
                    </span>
                    <div className="space-y-1.5">
                      {ai.actionItems.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleActionItem(idx)}
                          className={`w-full text-left p-2 rounded-lg border text-xs flex items-start space-x-2.5 transition-colors ${
                            checkedActions[idx]
                              ? 'bg-purple-50/80 border-purple-300 text-purple-900 line-through opacity-75'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="mt-0.5 flex-shrink-0">
                            {checkedActions[idx] ? (
                              <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </div>
                          <span>{item}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Description Statement */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Original Grievance Statement</span>
              </h2>
              <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap p-4 rounded-lg bg-slate-50/70 border border-slate-100">
                {complaint.description}
              </div>
            </div>

            {/* Supporting Evidence */}
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
                  <span>Lifecycle Timeline & History</span>
                </h2>
                <span className="text-[11px] text-slate-400 font-mono">
                  {updates.length} events
                </span>
              </div>

              <ComplaintTimeline updates={updates} complaint={complaint} />
            </div>
          </div>

          {/* Right Column: Administrative Control Center (1 col) */}
          <div className="space-y-6">
            
            {/* SLA Resolution Target Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <div className="border-b border-slate-100 pb-2.5 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  SLA Target & Deadline
                </h3>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Target Deadline</span>
                  <p className="font-semibold text-slate-900 font-mono">
                    {complaint.dueDate ? new Date(complaint.dueDate).toLocaleString() : 'Standard 72-hour window'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">SLA Status</span>
                  <p className={`font-bold ${isOverdue ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {isResolvedOrClosed ? 'Resolved on Schedule' : isOverdue ? `⚠️ Overdue by ${overdueDays}d` : '🟢 On Track'}
                  </p>
                </div>
              </div>
            </div>

            {/* Master Issue Association */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <div className="border-b border-slate-100 pb-2.5 flex items-center space-x-2">
                <GitFork className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Master Issue Cluster
                </h3>
              </div>
              <form onSubmit={handleLinkMaster} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Master Complaint ID / ID String:
                  </label>
                  <input
                    type="text"
                    value={masterInputId}
                    onChange={(e) => setMasterInputId(e.target.value)}
                    placeholder="e.g. CMP-2026-00001 (leave empty to unlink)"
                    className="block w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-1.5 px-3 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs"
                >
                  Save Master Link
                </button>
              </form>
            </div>

            {/* 1. DEDICATED RESOLUTION UPDATE SECTION */}
            <div className="bg-white rounded-xl border border-emerald-300 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Resolution Update
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Document and mark as Resolved
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleDirectResolve} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Resolution Message *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={resolutionSummary}
                    onChange={(e) => setResolutionSummary(e.target.value)}
                    placeholder="e.g., The Wi-Fi router in Block B was replaced and internet connectivity has been restored."
                    className="block w-full px-3 py-2 text-xs border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/20 text-slate-900"
                  ></textarea>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={actionLoading || !resolutionSummary.trim()}
                    className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 text-xs font-bold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors shadow-2xs"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Mark as Resolved</span>
                  </button>

                  {isResolved && !isClosed && (
                    <button
                      type="button"
                      onClick={confirmCloseComplaint}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-2xs"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Close Complaint</span>
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* 2. Status Workflow Manager */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Update Status
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Current: <strong>{complaint.status}</strong>
                  </p>
                </div>
              </div>

              <form onSubmit={handleStatusUpdate} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Transition To:
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white text-slate-900"
                  >
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Transition Note (Optional):
                  </label>
                  <textarea
                    rows={2}
                    value={statusComment}
                    onChange={(e) => setStatusComment(e.target.value)}
                    placeholder="Log context for this status change..."
                    className="block w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading || selectedStatus === complaint.status}
                  className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-2xs"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Update Status</span>
                </button>
              </form>
            </div>

            {/* 3. Cascading Department -> Staff Assignment */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Assign Department & Staff
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Facility routing to active staff
                  </p>
                </div>
              </div>

              <form onSubmit={handleAssignmentUpdate} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Department:
                  </label>
                  <select
                    value={selectedDept}
                    onChange={(e) => handleDeptChange(e.target.value)}
                    className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white text-slate-900"
                  >
                    <option value="">-- Unassigned --</option>
                    {departments.map((dept) => {
                      const dId = dept._id || dept.id;
                      return (
                        <option key={dId} value={dId}>
                          {dept.name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Staff In-Charge:</span>
                    {loadingStaff && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
                  </label>
                  <select
                    value={selectedStaff}
                    disabled={!selectedDept || departmentStaff.length === 0}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                    className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">
                      {!selectedDept
                        ? '-- Select department first --'
                        : departmentStaff.length === 0
                        ? '-- No active staff in dept --'
                        : '-- Assign specific staff (optional) --'}
                    </option>
                    {departmentStaff.map((staff) => {
                      const sId = staff._id || staff.id;
                      return (
                        <option key={sId} value={sId}>
                          {staff.name} ({staff.employeeId || staff.email})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-2xs"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                  <span>Save Assignment</span>
                </button>
              </form>
            </div>

            {/* 4. Priority Triage */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Change Priority
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Current: <strong>{complaint.priority}</strong>
                  </p>
                </div>
              </div>

              <form onSubmit={handlePriorityUpdate} className="space-y-3.5">
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white text-slate-900"
                >
                  {PRIORITIES.map((pri) => (
                    <option key={pri} value={pri}>
                      {pri} Priority
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  disabled={actionLoading || selectedPriority === complaint.priority}
                  className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-2xs"
                >
                  <span>Update Priority</span>
                </button>
              </form>
            </div>

            {/* 5. Official Administrative Note / Add Update */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Add Update / Note
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Appears in complaint timeline
                  </p>
                </div>
              </div>

              <form onSubmit={handleAddComment} className="space-y-3.5">
                <textarea
                  rows={3}
                  required
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Record an official progress update or note..."
                  className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                ></textarea>

                <button
                  type="submit"
                  disabled={actionLoading || !newComment.trim()}
                  className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 text-xs font-bold rounded-lg bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-50 transition-colors shadow-2xs"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Add Update</span>
                </button>
              </form>
            </div>

            {/* 6. Admin Delete Section */}
            <div className="bg-white rounded-xl border border-rose-200 p-5 shadow-2xs space-y-2">
              <h4 className="text-xs font-bold text-rose-950">Administrative Deletion</h4>
              <p className="text-[11px] text-slate-500">
                Soft-delete this complaint. The record is preserved for audit history but hidden from active complaint registries.
              </p>
              <button
                onClick={confirmDeleteComplaint}
                disabled={actionLoading}
                className="w-full inline-flex items-center justify-center space-x-1.5 py-2 px-3 text-xs font-semibold rounded-lg text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-300 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Complaint</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState({ isOpen: false })}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        type={confirmModalState.type}
        loading={actionLoading}
      />
    </div>
  );
}
