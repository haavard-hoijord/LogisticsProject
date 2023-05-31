FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build-env
WORKDIR /Simulation

# Copy everything
COPY ./Simulation ./
COPY ./Models  ./
# Restore as distinct layers
RUN dotnet restore ./Simulation.sln
# Build and publish a release
RUN dotnet publish -c Release -o out ./Simulation.sln

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:7.0

# Install curl
RUN apt-get update && \
    apt-get install -y curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /Simulation
COPY --from=build-env /Simulation/out .
ENTRYPOINT ["dotnet", "Simulation.dll"]