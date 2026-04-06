FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY dist /app/dist
EXPOSE 80
CMD ["serve", "-s", "/app/dist", "-l", "80"]
