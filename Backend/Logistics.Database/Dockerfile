FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build-env
WORKDIR /Logistics.Database

# Copy everything
COPY ./Logistics.Database ./
COPY ./Logistics.Models  ./
# Restore as distinct layers
RUN dotnet restore ./Logistics.Database.sln
# Build and publish a release
RUN dotnet publish -c Release -o out ./Logistics.Database.sln

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:7.0

# Install curl
RUN apt-get update && \
    apt-get install -y curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /Logistics.Database
COPY --from=build-env /Logistics.Database/out .
ENTRYPOINT ["dotnet", "Logistics.Database.dll"]