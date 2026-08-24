#!/bin/sh

# Find all JS files in the Nginx HTML directory and replace placeholders
# We use | as a delimiter to avoid issues with / in URLs
find /usr/share/nginx/html -name "*.js" -exec sed -i "s|VITE_API_URL|${API_URL}|g" {} +
find /usr/share/nginx/html -name "*.js" -exec sed -i "s|VITE_FRONTEND_URL|${FRONTEND_URL}|g" {} +
find /usr/share/nginx/html -name "*.js" -exec sed -i "s|VITE_ZOHO_SIGN_URL|${ZOHO_SIGN_URL}|g" {} +
find /usr/share/nginx/html -name "*.js" -exec sed -i "s|VITE_ZOHO_SAVE_URL|${ZOHO_SAVE_URL}|g" {} +
find /usr/share/nginx/html -name "*.js" -exec sed -i "s|VITE_ZOHO_CONSULT_URL|${ZOHO_CONSULT_URL}|g" {} +

# Execute the default Nginx command
exec "$@"
