FROM daprio/daprd:edge
COPY . .

CMD ["./daprd", "-app-id", "backend", "--app-port", "80","-placement-host-address", "placement:50006","-components-path", "/components", "--config", "/config.yaml"]