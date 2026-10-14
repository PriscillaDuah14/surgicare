# SurgiCare 🏥
### Intelligent Eye-Care Outreach & Surgical Mission Coordination Platform

SurgiCare is a web-based healthcare platform designed to connect eye-care facilities across Ghana with mobile surgical teams. It aims to help healthcare providers coordinate patient outreach, manage surgical backlogs, organize surgical missions, monitor facility readiness, and support post-operative care and NHIS reimbursement workflows.

## 🎯 Project Objectives

- Improve access to eye-care and surgical services.
- Help facilities identify and manage patients awaiting treatment.
- Support coordinated outreach and surgical mission planning.
- Monitor facility readiness for surgical missions.
- Improve collaboration between healthcare facilities and mobile surgical teams.
- Support patient follow-up and reimbursement workflows.

## ✨ Key Features

### 🔐 Authentication & User Roles
- Email and password authentication using Supabase.
- Clinician and Coordinator workflows.
- Administrative approval workflows for Coordinator access.
- Protected application pages and account management.

### 🏥 Facility Management
- Facility registration and onboarding.
- Facility readiness assessments.
- Facility verification workflows.
- Facility details and operational information.

### 🩺 Patient Management
- Patient registration.
- Patient records and booking workflows.
- Organization of patients awaiting surgical care.

### 🚑 Outreach & Surgical Missions
- Outreach management.
- Surgical mission planning.
- Mission operations and coordination.
- Recommendations to support outreach planning.

### 📊 Dashboards & Administration
- Role-oriented dashboards.
- Coordinator management workflows.
- Administrative review and approval processes.

> **Development status:** SurgiCare is under active development. Feature availability and workflow completeness may vary as implementation and testing continue.

## 🛠️ Technology Stack

- **Frontend:** Next.js, React, TypeScript/JavaScript
- **Styling:** CSS
- **Backend services:** Supabase
- **Database:** Supabase PostgreSQL
- **Authentication:** Supabase Auth
- **Version Control:** Git and GitHub

## 🚀 Getting Started

### Prerequisites

Install the following before running the application:

- Node.js (a current LTS release is recommended)
- npm
- Git
- A Supabase project with the required database tables and configuration

### 1. Clone the repository

```bash
git clone https://github.com/PriscillaDuah14/surgicare.git
cd surgicare
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root and add your Supabase project credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Replace the placeholder values with the appropriate credentials from your Supabase project.

**Security:** Never commit `.env.local`, passwords, service-role keys, or other secrets to GitHub.

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for production

```bash
npm run build
```

Resolve any build errors before deploying the application.

## 📁 Project Structure

```text
surgicare/
├── app/
│   ├── admin/
│   ├── auth/
│   ├── book-patient/
│   ├── coordinator/
│   ├── dashboard/
│   ├── demo/
│   ├── facility/
│   ├── login/
│   ├── missions/
│   ├── my-facility/
│   ├── outreach/
│   ├── patients/
│   └── request-coordinator/
├── lib/
│   └── supabase/
├── public/
├── package.json
└── README.md
```

This is a high-level overview; the exact structure may change as development progresses.

## 🔒 Security & Privacy

SurgiCare is intended to handle sensitive healthcare information. Before production use, the application must be reviewed to ensure that:

- Database Row Level Security (RLS) policies enforce appropriate access.
- Authentication and role-based authorization are correctly implemented.
- Patient information is accessible only to authorized users.
- Secrets and private credentials are stored securely.
- Backups, data retention, and recovery procedures are established.
- Applicable Ghanaian data protection and healthcare requirements are addressed.

Use fictional patient information during demonstrations and development.

## 🗺️ Development Roadmap

- [x] Establish the Next.js application.
- [x] Set up Supabase integration.
- [x] Develop initial authentication and application workflows.
- [x] Begin facility, patient, and mission management modules.
- [ ] Complete and verify role-based access and approval workflows.
- [ ] Refine dashboard UI and responsive layouts.
- [ ] Complete end-to-end testing of core workflows.
- [ ] Validate patient follow-up and reimbursement workflows.
- [ ] Prepare production deployment and security review.

Checklist items should be updated as features are verified.

## 🤝 Contributing

Contributions, suggestions, and feedback are welcome. For significant changes, please discuss the proposed functionality before submitting changes to the project.

## 📄 License

No license has been specified yet. Usage, redistribution, and contribution terms should be established by the project owner before the repository is shared for broader collaboration.

---

**SurgiCare — Connecting eye-care facilities, patients, and surgical teams across Ghana.**