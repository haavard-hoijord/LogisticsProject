FROM node:14 AS build
WORKDIR /app
COPY Frontend/Map/package*.json ./
RUN npm i
COPY Frontend/Map/* .
ADD .env ./.env
RUN npm run build

FROM node:14 as serve
WORKDIR /app
COPY --from=build /app/package*.json ./
RUN npm i --only=production
COPY --from=build /app/dist ./dist
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
