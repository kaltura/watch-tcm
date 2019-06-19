FROM node

WORKDIR /opt/kaltura/watch-tcm
ADD . ./

RUN npm install

CMD npm start

ARG VERSION
LABEL version=${VERSION}