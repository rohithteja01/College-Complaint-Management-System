const nodemailer = require('nodemailer');

/**
 * Configure Nodemailer transport using environment variables
 */
const createTransporter = () => {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT, 10) || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  // If host/credentials are not configured, use a mock logger transporter in dev/test
  if (!host || !user || !pass) {
    return {
      isMock: true,
      sendMail: async (mailOptions) => {
        console.log(`[EmailService:Mock] To: ${mailOptions.to} | Subject: "${mailOptions.subject}"`);
        return { messageId: `mock-${Date.now()}` };
      },
    };
  }

  const isSecure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: {
      user,
      pass,
    },
    // Prevent hanging requests
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
};

/**
 * Universal safe email sender
 * Catches all errors so email delivery failures NEVER crash complaint APIs
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (!to) {
      console.warn('[EmailService] Skipped sending email: recipient address is missing.');
      return { success: false, reason: 'missing_recipient' };
    }

    const from = process.env.EMAIL_FROM || '"College Grievance Portal" <support@college.edu>';
    const transporter = createTransporter();

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: text || '',
      html: html || `<p>${text || ''}</p>`,
    });

    console.log(`[EmailService] Notification successfully sent to ${to} (${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    // Log failure safely without throwing
    console.error(`[EmailService:Error] Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Common HTML Email Layout Wrapper
 */
const renderEmailTemplate = ({ studentName, complaintId, title, status, headline, updateMessage, detailUrl }) => {
  const statusColors = {
    Submitted: '#2563eb',
    'Under Review': '#d97706',
    Assigned: '#4f46e5',
    'In Progress': '#7c3aed',
    Resolved: '#059669',
    Closed: '#475569',
  };
  const badgeColor = statusColors[status] || '#059669';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Grievance Notification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #059669; padding: 24px 32px; text-align: left;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                College Grievance Redressal Portal
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #d1fae5;">
                Official Institutional Notification
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 24px; color: #334155;">
                Hello <strong>${studentName}</strong>,
              </p>

              <p style="margin: 0 0 20px 0; font-size: 16px; font-weight: 600; color: #0f172a; line-height: 24px;">
                ${headline}
              </p>

              <!-- Grievance Summary Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 10px; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700;">Complaint ID</td>
                        <td style="padding-bottom: 10px; text-align: right; font-family: monospace; font-size: 13px; font-weight: 700; color: #0f172a;">${complaintId}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700;">Title</td>
                        <td style="padding-bottom: 10px; text-align: right; font-size: 13px; font-weight: 600; color: #1e293b;">${title}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700;">Current Status</td>
                        <td style="text-align: right;">
                          <span style="display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 6px; background-color: ${badgeColor}; color: #ffffff;">
                            ${status}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Update Notice -->
              <div style="padding: 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; margin-bottom: 28px;">
                <p style="margin: 0; font-size: 14px; line-height: 22px; color: #166534;">
                  <strong>Update:</strong> ${updateMessage}
                </p>
              </div>

              <!-- Action CTA Button -->
              <div style="text-align: center; margin: 30px 0 10px 0;">
                <a href="${detailUrl}" style="display: inline-block; padding: 12px 28px; background-color: #059669; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 10px; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);">
                  View Complaint Details
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 18px;">
                This is an automated institutional message from the College Grievance Redressal System.<br>
                Please do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

/**
 * 1. Notification: Complaint Submitted
 */
const sendComplaintSubmissionEmail = async ({ student, complaint }) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const detailUrl = `${clientUrl}/student/complaints/${complaint.complaintId}`;

  const studentName = student?.fullName || 'Student';
  const studentEmail = student?.email;

  const subject = `[Grievance Lodged] ${complaint.complaintId}: ${complaint.title}`;
  const headline = 'Your grievance has been successfully submitted and registered.';
  const updateMessage = `Your complaint has been queued for evaluation under the "${complaint.category}" category at location "${complaint.location}".`;

  const html = renderEmailTemplate({
    studentName,
    complaintId: complaint.complaintId,
    title: complaint.title,
    status: complaint.status || 'Submitted',
    headline,
    updateMessage,
    detailUrl,
  });

  const text = `
Hello ${studentName},

Your grievance has been successfully lodged with ID: ${complaint.complaintId}.
Title: ${complaint.title}
Status: ${complaint.status}
Category: ${complaint.category}
Location: ${complaint.location}

Track your complaint live at: ${detailUrl}
`;

  return sendEmail({ to: studentEmail, subject, html, text });
};

/**
 * 2. Notification: Complaint Status Changed
 */
const sendComplaintStatusChangeEmail = async ({ student, complaint, previousStatus, newStatus, note }) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const detailUrl = `${clientUrl}/student/complaints/${complaint.complaintId}`;

  const studentName = student?.fullName || 'Student';
  const studentEmail = student?.email;

  const subject = `[Status Update] ${complaint.complaintId}: ${complaint.title} is now "${newStatus}"`;
  const headline = `Your grievance status has progressed to "${newStatus}".`;
  let updateMessage = `Status changed from "${previousStatus}" to "${newStatus}".`;
  if (note && note.trim()) {
    updateMessage += ` Administrative note: "${note.trim()}"`;
  }

  const html = renderEmailTemplate({
    studentName,
    complaintId: complaint.complaintId,
    title: complaint.title,
    status: newStatus,
    headline,
    updateMessage,
    detailUrl,
  });

  const text = `
Hello ${studentName},

Your grievance (${complaint.complaintId}) status has been updated.
Title: ${complaint.title}
Previous Status: ${previousStatus}
New Status: ${newStatus}
${note ? `Administrative Note: ${note}` : ''}

View full grievance details: ${detailUrl}
`;

  return sendEmail({ to: studentEmail, subject, html, text });
};

/**
 * 3. Notification: Complaint Assigned to Department / Staff
 */
const sendComplaintAssignmentEmail = async ({ student, complaint, departmentName, staffName }) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const detailUrl = `${clientUrl}/student/complaints/${complaint.complaintId}`;

  const studentName = student?.fullName || 'Student';
  const studentEmail = student?.email;

  const subject = `[Department Assigned] ${complaint.complaintId}: Assigned to ${departmentName || 'Maintenance Team'}`;
  const headline = 'Your grievance has been routed to an institutional department for resolution.';
  let updateMessage = `Your complaint has been assigned to the "${departmentName || 'Maintenance'}" department.`;
  if (staffName) {
    updateMessage += ` Assigned technician: ${staffName}.`;
  }

  const html = renderEmailTemplate({
    studentName,
    complaintId: complaint.complaintId,
    title: complaint.title,
    status: complaint.status || 'Assigned',
    headline,
    updateMessage,
    detailUrl,
  });

  const text = `
Hello ${studentName},

Your grievance (${complaint.complaintId}) has been assigned for maintenance.
Title: ${complaint.title}
Assigned Department: ${departmentName || 'General Maintenance'}
${staffName ? `Technician Assigned: ${staffName}` : ''}
Status: ${complaint.status}

View progress updates: ${detailUrl}
`;

  return sendEmail({ to: studentEmail, subject, html, text });
};

/**
 * 4. Notification: Complaint Resolved
 */
const sendComplaintResolutionEmail = async ({ student, complaint, resolutionSummary, actionTaken }) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const detailUrl = `${clientUrl}/student/complaints/${complaint.complaintId}`;

  const studentName = student?.fullName || 'Student';
  const studentEmail = student?.email;

  const subject = `[Resolved] ${complaint.complaintId}: Grievance Resolution Completed`;
  const headline = 'Great news! Your grievance has been marked as Resolved by the administration.';
  let updateMessage = `Resolution Summary: "${resolutionSummary}".`;
  if (actionTaken) {
    updateMessage += ` Action Taken: ${actionTaken}.`;
  }

  const html = renderEmailTemplate({
    studentName,
    complaintId: complaint.complaintId,
    title: complaint.title,
    status: 'Resolved',
    headline,
    updateMessage,
    detailUrl,
  });

  const text = `
Hello ${studentName},

Your grievance (${complaint.complaintId}) has been resolved!
Title: ${complaint.title}
Status: Resolved
Resolution Summary: ${resolutionSummary}
${actionTaken ? `Action Taken: ${actionTaken}` : ''}

Review official resolution details: ${detailUrl}
`;

  return sendEmail({ to: studentEmail, subject, html, text });
};

/**
 * 5. Notification: Complaint Closed
 */
const sendComplaintClosureEmail = async ({ student, complaint }) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const detailUrl = `${clientUrl}/student/complaints/${complaint.complaintId}`;

  const studentName = student?.fullName || 'Student';
  const studentEmail = student?.email;

  const subject = `[Closed] ${complaint.complaintId}: Grievance Ticket Closed`;
  const headline = 'Your grievance ticket has been formally closed and archived.';
  const updateMessage = 'This ticket is now closed. If you experience further issues, you may submit a new grievance.';

  const html = renderEmailTemplate({
    studentName,
    complaintId: complaint.complaintId,
    title: complaint.title,
    status: 'Closed',
    headline,
    updateMessage,
    detailUrl,
  });

  const text = `
Hello ${studentName},

Your grievance ticket (${complaint.complaintId}) has been formally closed.
Title: ${complaint.title}
Status: Closed

View archived complaint details: ${detailUrl}
`;

  return sendEmail({ to: studentEmail, subject, html, text });
};

module.exports = {
  sendEmail,
  sendComplaintSubmissionEmail,
  sendComplaintStatusChangeEmail,
  sendComplaintAssignmentEmail,
  sendComplaintResolutionEmail,
  sendComplaintClosureEmail,
  createTransporter,
};
