FROM golang:1.27.3-alpine@sha256:d200d2dd76b03a99b52651fd1325aff7dcd35422c35c01bac56571b0507f3deb AS gosu
WORKDIR /src
ADD --checksum=sha256:2b70da8a5480fafedc16bb1fc91b572f064d03df736cbd91a616af2f1b66ab51 https://codeload.github.com/tianon/gosu/tar.gz/29b939aa5bd4dc588af765b8248f6e39150d2565 /source.tar.gz
RUN tar -xzf /source.tar.gz --strip-components=1 -C /src
ENV GOTOOLCHAIN=local CGO_ENABLED=0 GOMAXPROCS=2
RUN go mod verify && go build -trimpath -ldflags="-w" -o /out/gosu .
FROM postgres@sha256:858bb5e98eed02eb8cafbcdc007f9a65d1b613972028944a8ec2133ccaf80d27
COPY --from=gosu --chmod=0755 /out/gosu /usr/local/bin/gosu
RUN apt-get update && apt-get install -y --no-install-recommends --only-upgrade libssl3 openssl && rm -rf /var/lib/apt/lists/*
