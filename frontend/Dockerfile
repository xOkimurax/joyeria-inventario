FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY . /app
EXPOSE 80
CMD ["serve", "-s", "/app/dist", "-l", "80"]
