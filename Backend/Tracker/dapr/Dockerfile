FROM daprio/daprd:edge
COPY . .

CMD ["./daprd", "-app-id", "tracker", "--app-port", "80","-placement-host-address", "placement:50006","-components-path", "/components", "--config", "/config.yaml"]