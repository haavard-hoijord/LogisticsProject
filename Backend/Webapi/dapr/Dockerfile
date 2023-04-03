FROM daprio/daprd:edge
COPY . .

CMD ["./daprd", "-app-id", "backend", "--app-port", "5000","-placement-host-address", "placement:50006","-components-path", "/components", "--config", "/config.yaml"]