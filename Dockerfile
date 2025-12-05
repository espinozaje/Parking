# ETAPA 1: Construcción (Build)
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ETAPA 2: Servidor Web (Nginx)
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

# --- AQUÍ ESTÁ LA CORRECCIÓN ---
# Fíjate que hay un '*' en medio. NO dice 'parking-web'.
COPY --from=build /app/dist/*/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]