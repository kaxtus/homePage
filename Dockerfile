FROM node:8

RUN mkdir -p /usr/src/app
ADD package.json /usr/src/app/
WORKDIR /usr/src/app/
RUN ls
#RUN npm install pm2 -g
#RUN npm install babel-cli -g
RUN apt-get update && apt-get install -y
RUN ls
#ADD  /usr/src/app/
#RUN chmod +x /usr/src/app/wait-for-it.sh

#COPY package.json ./
#COPY * ./
RUN npm install .
RUN npm rebuild node-sass
COPY . .
EXPOSE 10101
CMD npm run serve
