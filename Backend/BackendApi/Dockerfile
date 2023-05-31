FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build-env
WORKDIR /BackendApi

# Copy everything
COPY ./BackendApi ./
COPY ./Models  ./
# Restore as distinct layers
RUN dotnet restore ./BackendApi.sln
# Build and publish a release
RUN dotnet publish -c Release -o out ./BackendApi.sln

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:7.0

# Install curl
RUN apt-get update && \
    apt-get install -y curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /BackendApi
COPY --from=build-env /BackendApi/out .
ENTRYPOINT ["dotnet", "BackendApi.dll"]