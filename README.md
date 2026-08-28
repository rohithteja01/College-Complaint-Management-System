# College Complaint Management System

A production-ready full-stack web application designed to streamline student and staff grievance reporting, tracking, department routing, communication, and resolution within college institutions with secure, role-based authentication (`student` and `admin`).

---

## Technology Stack

### Frontend
- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS + PostCSS
- **Routing:** React Router v6
- **State Management:** React Context API (`AuthContext`)
- **HTTP Client:** Axios (with Bearer token interceptors)
- **Icons:** Lucide React

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database / ODM:** MongoDB + Mongoose
- **Authentication:** JSON Web Tokens (JWT) + bcryptjs
- **File Uploads:** Multer (strict JPG, JPEG, PNG, PDF formats with 5MB cap)
- **Email Notifications:** Nodemailer (configurable SMTP)
- **Utilities:** dotenv, CORS, nodemon

---

## Environment Variables Configuration

### Backend (`server/.env`)

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/college_complaints
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=7d

# -------------------------------------------------------------
# Email Notification Configuration (SMTP)
# -------------------------------------------------------------
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your_smtp_username
EMAIL_PASSWORD=your_smtp_password
EMAIL_FROM="College Grievance Portal" <support@college.edu>
```

#### Supported SMTP Providers:
- **Mailtrap (Testing/Development):** `EMAIL_HOST=smtp.mailtrap.io`, `EMAIL_PORT=2525`
- **Gmail (App Passwords):** `EMAIL_HOST=smtp.gmail.com`, `EMAIL_PORT=465` (or `587`)
- **SendGrid:** `EMAIL_HOST=smtp.sendgrid.net`, `EMAIL_PORT=587`, `EMAIL_USER=apikey`
- **Amazon SES:** `EMAIL_HOST=email-smtp.<region>.amazonaws.com`, `EMAIL_PORT=587`

> [!NOTE]
> If SMTP credentials are not configured, the application operates in safe mock mode, logging notification dispatches to the console without interrupting any API requests.

---

## Automated Notification Lifecycle Events

The system automatically sends branded HTML notifications to students during key grievance milestones:

1. **Complaint Submitted:** Sent immediately upon grievance lodging with Complaint ID and tracking link.
2. **Status Changes:** Sent whenever grievance advances along the workflow (`Submitted` → `Under Review` → `Assigned` → `In Progress` → `Resolved` → `Closed`).
3. **Department & Staff Routing:** Sent when routed to an institutional department (e.g. *Electrical Maintenance*, *IT Support*) or assigned technician.
4. **Grievance Resolved:** Sent with official resolution summary and action taken notes.
5. **Grievance Closed:** Sent upon formal ticket closure and archival.

---

## Getting Started

### 1. Install Dependencies

```bash
# From root directory:
npm run install:all
```

### 2. Run the Development Servers

Open two terminal windows:

#### Backend Server:
```powershell
cd server
npm run dev
```
- API Base: `http://localhost:5000`
- Health Endpoint: `http://localhost:5000/api/health`

#### Frontend Web Application:
```powershell
cd client
npm run dev
```
- Web Application: `http://localhost:5173`

---

## Running Automated Test Suites

The backend includes comprehensive test suites covering 100% of core flows:

```powershell
cd server
npm test
```

Individual test suites:
- `npm run test:auth` — Authentication, registration validation, duplicate prevention, and role access guards.
- `npm run test:complaint` — Complaint model, sequential `CMP-YYYY-XXXXX` ID generator, and DB enums.
- `npm run test:submission` — Multer file uploads, size caps, and student privacy ownership guards.
- `npm run test:admin` — Admin analytics, multi-criteria filtering, status transitions, and resolution.
- `npm run test:dept` — Department and staff CRUD, active status toggles, and cascading assignment validation.
- `npm run test:timeline` — Complaint lifecycle audit trail, chronological ordering, and communication timeline.
