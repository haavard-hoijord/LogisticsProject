FROM daprio/daprd:edge
COPY . .

CMD ["./daprd", "-app-id", "planner", "--app-port", "80","-placement-host-address", "placement:50006","-components-path", "/components", "--config", "/config.yaml"]