# Your Brand Cosmetics API

Backend REST API for a cosmetics formulation platform. Users build formulas from ingredients, phases and templates, generate Master Batch Records (MBRs) for manufacturing, and access features through subscription packages.

## Tech stack

- Node.js, Express 5, TypeScript
- MongoDB with Mongoose
- Zod for validation
- JWT auth (bcrypt, token blacklist), Google sign-in
- Nodemailer for email
- Kashier for payments

## Features

- Auth: register, login, Google sign-in, logout with token blacklist
- Subscription packages and payments (Kashier webhook)
- Ingredients and ingredient categories
- Phases, formula templates and formulas
- MBR generation
- Batch calculation, QS balancer and automatic formula validation
- Cron job for subscription expiry and renewals
- Security: Helmet, CORS, rate limiting, compression

## API routes

| Route | Purpose |
| --- | --- |
| `/auth` | Authentication |
| `/api/packages` | Subscription packages |
| `/api/templates` | Formula templates |
| `/api/categories` | Ingredient categories |
| `/api/ingredients` | Ingredients |
| `/api/phases` | Phases |
| `/api/formulas` | Formulas |
| `/api/mbrs` | Master batch records |
| `/api/payments` | Payments |
| `/api/webhooks/kashier` | Kashier payment webhook |

## Getting started

```bash
git clone https://github.com/Amrmoo2004/your_brand-cosmetics.git
cd your_brand-cosmetics
npm install
```

Create a `.env` file with your MongoDB connection string, JWT secret, email settings, Google client ID and Kashier keys (check the source for the exact variable names), then run:

```bash
npm run dev
```

## Project structure

```
src/
  app.ts        Express app and middleware
  index.ts      Server entry point
  models/       Mongoose models
  routes/       API routes
  services/     Batch calculation, QS balancer, validation, cron
```

## License

Add a license of your choice.
