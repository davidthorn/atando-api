FROM node:8.9.4

ARG _port
ARG _host
ARG _api_key
ARG _firebase_host
ARG _debug

WORKDIR /app

COPY . .

RUN npm install

ENV HOST=$_host
ENV PORT=$_port
ENV FIREBASE_HOST=$_firebase_host
ENV FIREBASE_PORT=$_firebase_port
ENV API_KEY=$_api_key
ENV DEBUG=$_debug

EXPOSE $_port

VOLUME [ "/app" ]

CMD ["npm" , "run" , "serve:mock"] 