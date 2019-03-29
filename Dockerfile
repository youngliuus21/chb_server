FROM node:8.10.0

RUN npm config set http-proxy http://www-proxy-brmdc.us.oracle.com:80
RUN npm config set https-proxy http://www-proxy-brmdc.us.oracle.com:80
RUN npm install -g nodemon

COPY package.json /app/

WORKDIR /app

RUN npm install

COPY . /app/

EXPOSE 18888

CMD nodemon server.js

