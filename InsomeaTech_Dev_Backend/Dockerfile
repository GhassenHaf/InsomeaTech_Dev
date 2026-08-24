FROM node:22-alpine
WORKDIR /app
RUN npm install -g npm@latest
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
