# docker build file for elasticsearch

FROM docker.elastic.co/elasticsearch/elasticsearch-oss:6.0.0

# install basic IP utilities, in particular command "ip"
RUN yum -y install iproute

# This volume contains the elasticsearch data for the indexes
VOLUME /usr/share/elasticsearch/data

# port used by clients to talk to the elasticsearch engine APIs
EXPOSE 9200
