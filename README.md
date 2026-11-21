# Talivexa AI
**Created by Mr. Irfan**

A full-stack, mobile-responsive, PWA-ready AI platform styled in **Obsidian Black & Gold** with distinct accents across AI modules and support for **10 languages** (including **RTL** for Urdu and Arabic).

## Why These Technologies Were Selected
- **Frontend (HTML5, CSS3, Vanilla JS + PWA):** Zero heavy framework overhead, fast loading on Android mobile networks, easy customization, and direct Service Worker / Web App Manifest support.
- **Backend (Node.js + Express):** Lightweight REST API architecture with `helmet`, `cors`, `express-rate-limit`, `bcryptjs`, and `jsonwebtoken` for clean secret management on the server.
- **Database Schema (`database/schema.sql`):** Relational PostgreSQL schema for users, sessions, and chat messages.

## Quick Local Run
1. Copy `.env.example` to `.env`.
2. Install dependencies: `npm install`
3. Start server: `npm start`
4. Open `http://localhost:4000`
