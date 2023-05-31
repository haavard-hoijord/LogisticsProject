FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build-env
WORKDIR /DeliveryPlanner

# Copy everything
COPY ./DeliveryPlanner ./
COPY ./Models  ./
# Restore as distinct layers
RUN dotnet restore ./DeliveryPlanner.sln
# Build and publish a release
RUN dotnet publish -c Release -o out ./DeliveryPlanner.sln

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:7.0

# Install curl
RUN apt-get update && \
    apt-get install -y curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /DeliveryPlanner
COPY --from=build-env /DeliveryPlanner/out .
ENTRYPOINT ["dotnet", "DeliveryPlanner.dll"]