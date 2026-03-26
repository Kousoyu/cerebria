FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV COGNI_MODE=standard
ENV COGNI_DATA_DIR=/app/data

VOLUME ["/app/data"]

EXPOSE 3000

CMD ["node", "examples/basic_usage.js"]
