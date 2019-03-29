FROM node:9.9.0
ARG VERSION_TAG
RUN git clone -b $VERSION_TAG https://github.com/DuoSoftware/DVP-AbandonedCallDialer.git /usr/local/src/abandonedcalldialer
WORKDIR /usr/local/src/abandonedcalldialer
RUN apt-get update && apt-get install vim
RUN npm install
COPY . .
EXPOSE 9094
CMD [ "node", "/usr/local/src/abandonedcalldialer/app.js" ]
