FROM node:8.9.4

ARG _port
ARG _host
ARG _api_key
ARG _firebase_host

WORKDIR /app

COPY . .


RUN npm install

ENV HOST=$_host
ENV PORT=$_port
ENV FIREBASE_HOST=$_firebase_host
ENV FIREBASE_PORT=$_firebase_port
ENV API_KEY=$_api_key
EXPOSE $_port

VOLUME [ "/app" ]

CMD ["npm" , "run" , "serve:mock"] 