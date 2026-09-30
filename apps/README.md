# Introduction

This directory contains the source code for the various applications that are part of the project. Each application is organized into its own subdirectory, with its own README file and documentation.

## Getting Started

- **[Api](/apps/api/README.md)**: The backend server built with [NestJS](https://nestjs.com/). It provides the API endpoints for the Ecbot application. We handle both Admin, User and Crawler
- **[Web](/apps/web/README.md)**: The frontend application built with [Next.js](https://nextjs.org/). It provides the user interface for the Ecbot application. This web contains the following features:
  - Landing page
  - Contact page
  - FAQ page
  - Help page
  - Pricing page
- **[Docs](/apps/docs/README.md)**: User docs for shop owners at `ecbot.dev/{en,vi}/docs`, built with Next.js and Fumadocs as a static export and served by a Cloudflare Worker. Pages ship in English and Vietnamese with full SEO and AI-search output (sitemap, JSON-LD, `llms.txt`, a Markdown copy of each page).
- **[App](/apps/app/README.md)**: The main application for user user to interact with Ecbot api.
<!--- **[Admin](/apps/admin/README.md)**: The admin application for operators to manage the Ecbot application. This web contains the following features:-->
- **[A.I](/apps/ai/README.md)**: The AI internal service for handling all AI related tasks, including prompt engineering, response generation, and AI model management. This service is built with Fastify, uv and LangChain. It contains the following features:
  - Prompt engineering
  - Response generation
  - AI model management
  - AI performance monitoring
  - AI error handling
  - AI logging and analytics
  - AI configuration management
  - AI security and compliance
  - AI scalability and performance optimization
