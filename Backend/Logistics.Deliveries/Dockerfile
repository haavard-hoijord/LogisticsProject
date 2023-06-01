FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build-env
WORKDIR /Logistics.Deliveries

# Copy everything
COPY ./Logistics.Deliveries ./
COPY ./Logistics.Models  ./
# Restore as distinct layers
RUN dotnet restore ./Logistics.Deliveries.sln
# Build and publish a release
RUN dotnet publish -c Release -o out ./Logistics.Deliveries.sln

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:7.0

# Install curl
RUN apt-get update && \
    apt-get install -y curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /Logistics.Deliveries
COPY --from=build-env /Logistics.Deliveries/out .
ENTRYPOINT ["dotnet", "Logistics.Deliveries.dll"]