# FinStack Database - Phase 1

## Technology Stack

- PostgreSQL (Supabase)
- UUID Primary Keys
- Row Level Security (RLS)
- Supabase Authentication
- Supabase Storage

---

## Folder Structure

database/
│
├── schema.sql
├── auth_trigger.sql
├── rls.sql
├── seed.sql
└── README_DB.md

---

## Tables

### user_profile
Stores personal information of authenticated users.

### financial_profile
Stores financial information required by AI modules.

### financial_health_report
Stores generated financial health scores and recommendations.

### smartfeed_preference
Stores personalized SmartFeed settings.

### uploaded_document
Stores metadata of uploaded documents.
Actual files are stored inside Supabase Storage.

---

## Relationships

auth.users (1:1)
↓

user_profile

↓

financial_profile

↓

financial_health_report

user_profile

├── uploaded_document

└── smartfeed_preference

---

## Security

- Row Level Security enabled
- UUID Primary Keys
- Foreign Key Constraints
- Private Storage Bucket
- Automatic profile creation trigger

---

## Authentication

Authentication is handled using Supabase Auth.

A PostgreSQL trigger automatically creates:

- user_profile
- financial_profile
- smartfeed_preference

after every new signup.

---

## Indexes

Indexes have been created on frequently queried columns including:

- user_id
- user_profile_id
- document_type
- generated_at
- processing_status

---

## Assumptions

- Authentication handled by Supabase
- Documents stored in Storage Bucket
- AI modules read data from financial_profile
- Uploaded documents store metadata only

---

## Future Improvements

- Audit Logs
- Archive Tables
- Versioned Reports
- Document OCR Pipeline
- AI Prediction Logs
- Database Backups