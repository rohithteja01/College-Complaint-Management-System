import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FilePlus, 
  Upload, 
  X, 
  FileText, 
  ImageIcon, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ArrowLeft, 
  MapPin, 
  Tag, 
  AlertTriangle,
  Info,
  Sparkles,
  Bot,
  Zap,
  Check,
  Layers,
  Copy,
  ExternalLink,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import api from '../services/api';

const CATEGORIES = [
  'Classroom',
  'Laboratory',
  'Hostel',
  'Wi-Fi',
  'Infrastructure',
  'Transportation',
  'Cleanliness',
  'Library',
  'Electricity',
  'Water',
  'Canteen',
  'Other',
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

export default function SubmitComplaintPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    location: '',
    priority: 'Medium',
    description: '',
  });

  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // AI Assistant states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  // Duplicate Detection Modal states
  const [potentialDuplicates, setPotentialDuplicates] = useState([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (errorMessage) setErrorMessage('');
  };

  const handleAiAutoDetect = async () => {
    if (!formData.title.trim() && !formData.description.trim()) {
      setErrorMessage('Please enter a title or description first before requesting AI suggestions.');
      return;
    }

    setAiLoading(true);
    setErrorMessage('');
    try {
      const response = await api.post('/complaints/suggest', {
        title: formData.title,
        description: formData.description,
        location: formData.location,
      });

      const suggestions = response.data.suggestions;
      if (suggestions) {
        setAiSuggestion(suggestions);
        setFormData((prev) => ({
          ...prev,
          category: suggestions.suggestedCategory || prev.category,
          priority: suggestions.suggestedPriority || prev.priority,
        }));
      }
    } catch (err) {
      console.error('AI suggest error:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.size > 5 * 1024 * 1024) {
      setErrorMessage('Selected file exceeds the 5MB size limit.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setErrorMessage('Invalid file format. Please upload JPG, PNG, or PDF.');
      return;
    }

    setErrorMessage('');
    setFile(selectedFile);

    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview(null);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFilePreview(null);
  };

  const executeSubmission = async () => {
    setSubmitting(true);
    setErrorMessage('');

    try {
      const payload = new FormData();
      payload.append('title', formData.title.trim());
      payload.append('category', formData.category);
      payload.append('location', formData.location.trim());
      payload.append('priority', formData.priority);
      payload.append('description', formData.description.trim());

      if (file) {
        payload.append('attachment', file);
      }

      const response = await api.post('/complaints', payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const createdComplaint = response.data.complaint;
      setSuccessData(createdComplaint);
      setShowDuplicateModal(false);

      setTimeout(() => {
        navigate(`/complaints/${createdComplaint.complaintId || createdComplaint._id || createdComplaint.id}`);
      }, 1500);
    } catch (err) {
      console.error('Submission error:', err);
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to submit complaint. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const { title, category, location, priority, description } = formData;

    if (!title.trim() || !category || !location.trim() || !description.trim()) {
      setErrorMessage('Please fill in all mandatory fields.');
      return;
    }

    if (title.trim().length < 3) {
      setErrorMessage('Complaint title must be at least 3 characters.');
      return;
    }

    if (description.trim().length < 10) {
      setErrorMessage('Complaint description must be at least 10 characters.');
      return;
    }

    setSubmitting(true);

    try {
      const dupCheckRes = await api.post('/complaints/check-duplicates', {
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim(),
      });

      if (dupCheckRes.data?.hasDuplicates && dupCheckRes.data?.duplicates?.length > 0) {
        setPotentialDuplicates(dupCheckRes.data.duplicates);
        setShowDuplicateModal(true);
        setSubmitting(false);
        return;
      }

      await executeSubmission();
    } catch (err) {
      console.error('Duplicate pre-check failed, continuing submission:', err);
      await executeSubmission();
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-5 sm:py-8 px-3 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/student/dashboard"
            className="inline-flex items-center space-x-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <span className="text-xs text-slate-400 font-mono">Step 1 of 1</span>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-8">
          {/* Header */}
          <div className="border-b border-slate-100 pb-4 sm:pb-6 mb-5 sm:mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-900 text-white flex-shrink-0">
                <FilePlus className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-slate-900 leading-tight">
                  Lodge a New Grievance
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Submit grievance details with smart duplicate detection and AI assistance
                </p>
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {successData && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 mb-5 text-emerald-900 animate-in fade-in">
              <div className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm">Complaint Submitted Successfully!</h3>
                  <p className="text-xs mt-1 text-emerald-800">
                    Generated Ticket ID:{' '}
                    <strong className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-900">
                      {successData.complaintId}
                    </strong>
                  </p>
                  <p className="text-xs mt-1 text-emerald-700">
                    Redirecting to details...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 mb-5 text-rose-800 flex items-start space-x-2.5 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            
            {/* Title with AI Auto-Detect */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Complaint Title *
                </label>
                <button
                  type="button"
                  onClick={handleAiAutoDetect}
                  disabled={aiLoading || (!formData.title && !formData.description)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 disabled:opacity-50 transition-colors shadow-2xs"
                  title="Auto-detect category & urgency"
                >
                  {aiLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  )}
                  <span>AI Auto-Detect</span>
                </button>
              </div>

              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Water leaking from ceiling pipe in Room 302"
                className="block w-full px-3 py-2 sm:py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Provide a brief descriptive title summarizing the problem.
              </p>
            </div>

            {/* AI Suggestion Feedback */}
            {aiSuggestion && (
              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900 space-y-1 animate-in fade-in">
                <div className="flex items-center space-x-1.5 font-bold text-purple-800">
                  <Bot className="w-3.5 h-3.5 text-purple-600" />
                  <span>AI Advisory Suggestion:</span>
                </div>
                <p className="text-[11px] text-purple-700">
                  Suggested Category: <strong>{aiSuggestion.suggestedCategory}</strong> • Priority: <strong>{aiSuggestion.suggestedPriority}</strong>. You can freely modify these below.
                </p>
              </div>
            )}

            {/* Category & Priority Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category *
                </label>
                <select
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 sm:py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white text-slate-800"
                >
                  <option value="">Select Category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Urgency / Priority *
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 sm:py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white text-slate-800"
                >
                  {PRIORITIES.map((pri) => (
                    <option key={pri} value={pri}>
                      {pri} Priority
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Exact Location *
              </label>
              <div className="relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="location"
                  required
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g., Block B, 3rd Floor, Room 302"
                  className="block w-full pl-9 pr-3 py-2 sm:py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Detailed Description *
              </label>
              <textarea
                name="description"
                required
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Explain the problem, when you noticed it, and any safety hazards..."
                className="block w-full px-3 py-2 sm:py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              ></textarea>
              <p className="text-[11px] text-slate-400 mt-1">Minimum 10 characters.</p>
            </div>

            {/* Evidence Attachment */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Attach Supporting Photo / Document (Optional)
              </label>

              {!file ? (
                <div className="border border-dashed border-slate-300 rounded-xl p-4 sm:p-6 text-center hover:border-slate-400 transition-colors bg-slate-50/50">
                  <Upload className="mx-auto w-6 h-6 sm:w-8 sm:h-8 text-slate-400 mb-1.5" />
                  <p className="text-xs text-slate-700 font-semibold">
                    Click to browse evidence file
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                    Supports JPG, PNG, PDF (Max 5MB)
                  </p>
                  <input
                    type="file"
                    id="attachment"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="attachment"
                    className="mt-2.5 inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                  >
                    Select File
                  </label>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl p-3 sm:p-4 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    {filePreview ? (
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="w-10 h-10 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    <div className="truncate">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2.5">
              <Link
                to="/student/dashboard"
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 min-h-[36px] flex items-center justify-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting || successData}
                className="inline-flex items-center space-x-1.5 px-4 sm:px-5 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-2xs min-h-[36px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <FilePlus className="w-3.5 h-3.5" />
                    <span>Submit Complaint</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Duplicate Complaint Detection Warning Modal (Responsive Clamped) */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-[94vw] sm:w-full max-w-xl max-h-[88vh] flex flex-col p-5 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="flex items-start space-x-3 border-b border-slate-100 pb-3 flex-shrink-0">
              <div className="p-2 sm:p-2.5 rounded-xl bg-amber-100 text-amber-800 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Similar complaint(s) may already exist
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 leading-relaxed">
                  We found <strong>{potentialDuplicates.length}</strong> active grievance(s) matching your location or issue description.
                </p>
              </div>
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Duplicate Candidates */}
            <div className="space-y-2.5 my-3 overflow-y-auto pr-1 flex-1">
              {potentialDuplicates.map((dup) => (
                <div
                  key={dup.complaintId || dup.id}
                  className="p-3 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {dup.complaintId}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${STATUS_BADGES[dup.status] || 'bg-slate-100'}`}>
                        {dup.status}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {dup.similarityPercent || 75}% Match
                    </span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    {dup.title}
                  </h4>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
                    <span>Category: <strong>{dup.category}</strong></span>
                    <span>•</span>
                    <span>Location: <strong>{dup.location}</strong></span>
                  </div>

                  <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Filed: {new Date(dup.createdAt).toLocaleDateString()}</span>
                    <Link
                      to={`/complaints/${dup.complaintId || dup.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1 text-emerald-700 font-bold hover:underline"
                    >
                      <span>View details</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Decision Footer */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 order-3 sm:order-1 text-center"
              >
                Edit My Complaint
              </button>

              <div className="flex items-center space-x-2 order-1 sm:order-2">
                {potentialDuplicates[0] && (
                  <Link
                    to={`/complaints/${potentialDuplicates[0].complaintId || potentialDuplicates[0].id}`}
                    className="flex-1 sm:flex-none text-center px-3.5 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                  >
                    View Existing
                  </Link>
                )}

                <button
                  type="button"
                  disabled={submitting}
                  onClick={executeSubmission}
                  className="flex-1 sm:flex-none text-center px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Continue Submitting'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
