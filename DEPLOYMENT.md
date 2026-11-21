# Hosting & Custom Domain Guide (Talivexa AI)

1. Upload the project files to your hosting platform or cloud server.
2. Set environment variables (`PORT`, `JWT_SECRET`, and any optional `AI_PROVIDER_API_KEY`, `SEARCH_API_KEY`, `PAYMENT_SECRET_KEY`) in the host dashboard or `.env`.
3. Run `npm install` and `npm start`.
4. Point your custom domain's DNS (`A` or `CNAME` record) to your host and enable automatic HTTPS/SSL.
