FROM node:8.9.4

ARG _port
ARG _host

WORKDIR /app

COPY . .


RUN npm install

ENV HOST=$_host
ENV PORT=$_port

EXPOSE $_port

VOLUME [ "/app" ]

CMD ["npm" , "run" , "serve:mock"] 