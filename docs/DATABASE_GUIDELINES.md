# DATABASE_GUIDELINES.md

# FinStack Database Guidelines

Version: 1.0

---

# 1. Purpose

The database is a shared resource used by all modules within FinStack.

To avoid conflicts and maintain consistency, every developer must follow these guidelines when designing or modifying the database.

---

# 2. General Rules

Always:

- Create new tables when required.
- Follow naming conventions.
- Document schema changes.
- Use meaningful relationships.
- Keep tables modular.

Never:

- Modify another module's tables without discussion.
- Delete existing columns.
- Rename existing columns.
- Drop tables.
- Break foreign key relationships.

---

# 3. Table Ownership

Each module owns its own tables.

Example:

Financial Health

```
financial_profiles

financial_reports
```

SmartFeed

```
articles

saved_articles

user_preferences
```

Document Upload

```
documents

document_history
```

Authentication

```
users

sessions
```

Avoid cross-module modifications whenever possible.

---

# 4. Naming Conventions

Tables

```
snake_case
```

Examples

```
financial_reports

saved_articles

user_preferences
```

Columns

```
user_id

created_at

updated_at
```

Primary Key

```
id
```

Foreign Keys

```
user_id

article_id

document_id
```

---

# 5. Relationships

Use foreign keys whenever relationships exist.

Avoid storing duplicate information across multiple tables.

Normalize the database where appropriate, but avoid unnecessary complexity.

---

# 6. Schema Changes

Before making any schema changes:

- Discuss with the team.
- Check for dependencies.
- Update documentation.
- Test affected modules.

Large schema changes should never be made without prior approval.

---

# 7. Migrations

Treat database changes as version-controlled changes.

Every modification should be:

- Planned
- Documented
- Tested
- Reviewed

Avoid making direct production changes without recording them.

---

# 8. Data Integrity

Ensure:

- Proper constraints
- Valid foreign keys
- Required fields are non-null where appropriate
- Consistent data types

Validation should exist at both the backend and database levels.

---

# 9. Security

Never store:

- Plain text passwords
- API Keys
- Secret Tokens
- Sensitive credentials

Sensitive information should always be encrypted or stored securely through environment variables or authentication providers.

---

# 10. Final Principles

Before creating a new table, ask:

- Does this table belong to my module?
- Can an existing table be reused without breaking modularity?
- Is this relationship necessary?
- Will another developer understand this schema six months from now?

A clean database design is one of the foundations of a maintainable application. Every schema decision should prioritize clarity, consistency, and future scalability.