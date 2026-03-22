FROM alpine:latest

ARG PB_VERSION=0.22.6

RUN apk add --no-cache \
    unzip \
    ca-certificates

# Lade PocketBase herunter
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/

# Mache den Data-Ordner zum Volume für Persistenz
VOLUME /pb/pb_data

EXPOSE 8080

# Starte PocketBase
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080"]
