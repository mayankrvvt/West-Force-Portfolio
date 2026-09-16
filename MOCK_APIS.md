# WestForce Demo APIs

The dashboard is split between connected production services and local demo services.

## Connected now

- Firebase Authentication
- MongoDB portfolio endpoints under `/api/portfolios`
- Cloudinary file uploads through `/api/uploads`
- Vite `/api` proxy to the Express server

## Demo/local now

`client/src/services/mockApi.js` simulates the following services with a short network delay and browser `localStorage` persistence:

- Dashboard metrics/activity
- Resume library
- AI resume enhancement
- ATS resume scoring
- Job discovery/listings
- Saved applications and application statuses
- Certificates

This makes the complete dashboard usable before the remaining backend collections and AI provider are connected.

## Production replacement points

Replace the functions in `mockApi.js` with real requests when these backend modules are ready:

- Resume model/routes
- AI resume service/provider
- ATS analysis service
- Job aggregation/search service
- Application model/routes
- Certificate model/routes

The page components already consume service functions rather than hard-coding API calls, so the UI can stay unchanged when those integrations are added.
