FROM daprio/daprd:edge
COPY . .

CMD ["./daprd", "-app-id", "planner", "--app-port", "80", "--dapr-http-max-request-size", "16","-placement-host-address", "placement:50006","-components-path", "/components", "--config", "/config.yaml"]