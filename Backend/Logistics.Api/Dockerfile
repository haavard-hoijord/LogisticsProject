FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build-env
WORKDIR /Logistics.Api

# Copy everything
COPY ./Logistics.Api ./
COPY ./Logistics.Models  ./
# Restore as distinct layers
RUN dotnet restore ./Logistics.Api.sln
# Build and publish a release
RUN dotnet publish -c Release -o out ./Logistics.Api.sln

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:7.0

# Install curl
RUN apt-get update && \
    apt-get install -y curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /Logistics.Api
COPY --from=build-env /Logistics.Api/out .
ENTRYPOINT ["dotnet", "Logistics.Api.dll"]