FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build-env
WORKDIR /Data

# Copy everything
COPY ./Data ./
COPY ./Models  ./
# Restore as distinct layers
RUN dotnet restore ./Data.sln
# Build and publish a release
RUN dotnet publish -c Release -o out ./Data.sln

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:7.0

# Install curl
RUN apt-get update && \
    apt-get install -y curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /Data
COPY --from=build-env /Data/out .
ENTRYPOINT ["dotnet", "Data.dll"]