# ETAPA 1: Construcción (Build)
FROM node:20-alpine AS build

WORKDIR /app

# Copiamos package.json primero para aprovechar la caché de Docker
COPY package*.json ./

# Instalamos dependencias
RUN npm install

# Copiamos todo el código fuente
COPY . .

# Construimos la app (Production mode)
RUN npm run build

# ETAPA 2: Servidor Web (Nginx)
FROM nginx:alpine

# Copiamos la configuración básica de Nginx (Opcional, pero recomendado para SPA)
# Si no tienes un nginx.conf, nginx usará el default, pero las rutas al recargar darán 404.
# Por ahora usemos el default para que te funcione el build.

# --- AQUÍ ESTÁ EL TRUCO ---
# Angular 17+ crea la carpeta 'browser'.
# Reemplaza 'parking-web' con el nombre EXACTO de tu proyecto en package.json
COPY --from=build /app/dist/parking-web/browser /usr/share/nginx/html

# Exponemos el puerto 80 (El que usa Railway internamente)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]