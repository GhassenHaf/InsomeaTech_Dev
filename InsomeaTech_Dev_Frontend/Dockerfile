# --- Stage 1: Build the Angular app ---
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

# --- Stage 2: Serve with Nginx ---
FROM nginx:alpine

# Copy built app static files to Nginx
COPY --from=build /app/dist/sakai-ng/browser /usr/share/nginx/html

# Copy custom Nginx config to support Angular SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
