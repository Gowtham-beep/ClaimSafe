FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 5173

# Serve the compiled app in Docker so Vite HMR does not trigger browser reloads behind Nginx.
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
